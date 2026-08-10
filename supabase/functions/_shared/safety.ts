/**
 * Safety Agent 共享模块
 * 双层审查：规则引擎（毫秒级）+ LLM 审查（可选）
 */

import { callSiliconFlowLLMWithFallback } from "./llm.ts";

export type SafetyAction = "BLOCK" | "REFER" | "ALLOW";

export interface SafetyCheckResult {
  safe: boolean;
  action: SafetyAction;
  response: string;
  layer: "rule_engine" | "llm";
  riskLevel?: "none" | "low" | "medium" | "high";
  matchedPattern?: string | null;
}

/** 用户输入 / AI 输出：阻断类（必须拦截） */
const MEDICAL_BLOCKED_PATTERNS = [
  /诊断|确诊|患有|得了|xx病|xx症/i,
  /阿司匹林|布洛芬|降压药|胰岛素|抗生素|处方药|药品|服药|吃什么药/i,
  /胸痛|胸疼|胸口|心口|胸闷|呼吸困难|咳血|昏迷|半身不遂|剧烈头痛|突然晕倒/i,
  /自杀|自残|想死|抑郁症|焦虑症|精神分裂/i,
  /高血压|糖尿病|心脏病|癌症|肿瘤|艾滋病/i,
];

/** 建议转诊类 */
const MEDICAL_REFERRED_PATTERNS = [
  /一直疼|持续疼|越来越严重|流血|伤口|骨折|肿了|发高烧/i,
  /怀孕|备孕|月经不调|妇科问题/i,
  /儿童|老人|患者.*身体/i,
];

const BLOCK_RESPONSE =
  "我不是医生，您描述的情况涉及专业医疗判断，建议尽快就医或咨询专业医疗人员。";

const REFER_RESPONSE =
  "我不是医生，关于这个问题，建议您咨询专业医生获得准确建议。";

/** 剥离模型可能仍附带的固定免责声明句 */
export function stripMedicalDisclaimer(text: string): string {
  return text
    .replace(
      /\n*\s*(⚠️\s*)?以上为非医疗建议[，,]?如有不适请咨询(医生|专业医生|医生或专业教练)。?\s*$/u,
      ""
    )
    .trimEnd();
}

/** 第一层：规则引擎 */
export function runSafetyRuleEngine(text: string): SafetyCheckResult {
  for (const pattern of MEDICAL_BLOCKED_PATTERNS) {
    if (pattern.test(text)) {
      return {
        safe: false,
        action: "BLOCK",
        response: BLOCK_RESPONSE,
        layer: "rule_engine",
        matchedPattern: pattern.source,
      };
    }
  }

  for (const pattern of MEDICAL_REFERRED_PATTERNS) {
    if (pattern.test(text)) {
      return {
        safe: true,
        action: "REFER",
        response: REFER_RESPONSE,
        layer: "rule_engine",
        matchedPattern: pattern.source,
      };
    }
  }

  return {
    safe: true,
    action: "ALLOW",
    response: stripMedicalDisclaimer(text),
    layer: "rule_engine",
    matchedPattern: null,
  };
}

/** 第二层：LLM 审查 */
async function runSafetyLLMCheck(
  apiKey: string,
  text: string,
  userContext?: string
): Promise<{
  safe: boolean;
  riskLevel: "none" | "low" | "medium" | "high";
  safeAlternative?: string;
}> {
  if (!apiKey) {
    return { safe: true, riskLevel: "none" };
  }

  const prompt = `请检查以下健康建议是否存在医疗风险：

建议内容：
${text}

${userContext ? `用户背景：${userContext}` : ""}

检查维度（逐一判断）：
1. 是否包含诊断/治疗/处方内容？
2. 是否建议了具体的医疗行为？
3. 是否有任何可能造成用户焦虑的内容？
4. 是否有任何可能引发饮食障碍的饮食建议？

输出 JSON（不要有其他内容）：
{
  "safe": true或false,
  "riskLevel": "none"或"low"或"medium"或"high",
  "riskReason": "如果有风险，说明原因",
  "safeAlternative": "如果需要，给出安全替代话术"
}`;

  try {
    const result = await callSiliconFlowLLMWithFallback(
      apiKey,
      [{ role: "user", content: prompt }],
      { maxTokens: 300, temperature: 0, models: ["Qwen/Qwen2.5-7B-Instruct", "deepseek-ai/DeepSeek-V3.2"] }
    );

    const parsed = JSON.parse(
      result.content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
    ) as {
      safe?: boolean;
      riskLevel?: "none" | "low" | "medium" | "high";
      safeAlternative?: string;
    };

    return {
      safe: parsed.safe ?? true,
      riskLevel: parsed.riskLevel ?? "none",
      safeAlternative: parsed.safeAlternative,
    };
  } catch (error) {
    console.warn("[safety] LLM 审查失败，规则引擎结果为准:", error);
    return { safe: true, riskLevel: "none" };
  }
}

/** 完整 Safety Check：规则引擎 + 可选 LLM */
export async function runSafetyCheck(
  text: string,
  options: {
    userContext?: string;
    skipLlmCheck?: boolean;
    apiKey?: string;
  } = {}
): Promise<SafetyCheckResult> {
  const firstPass = runSafetyRuleEngine(text);

  if (firstPass.action === "BLOCK" || firstPass.action === "REFER") {
    return firstPass;
  }

  if (options.skipLlmCheck) {
    return firstPass;
  }

  const llmResult = await runSafetyLLMCheck(
    options.apiKey ?? "",
    text,
    options.userContext
  );

  if (!llmResult.safe || llmResult.riskLevel === "high") {
    return {
      safe: false,
      action: "REFER",
      response:
        stripMedicalDisclaimer(
          llmResult.safeAlternative || "这个问题建议咨询专业医生。"
        ),
      layer: "llm",
      riskLevel: llmResult.riskLevel,
    };
  }

  return {
    ...firstPass,
    layer: "llm",
    riskLevel: llmResult.riskLevel,
  };
}

/** 调用远程 safety-check Edge Function（服务间调用） */
export async function invokeSafetyCheckFunction(
  supabaseUrl: string,
  serviceKey: string,
  text: string,
  options: { userContext?: string; skipLlmCheck?: boolean } = {}
): Promise<SafetyCheckResult> {
  const response = await fetch(`${supabaseUrl}/functions/v1/safety-check`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
    },
    body: JSON.stringify({
      text,
      user_context: options.userContext,
      skip_llm_check: options.skipLlmCheck ?? true,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    console.warn("[safety] 远程 safety-check 失败，回退本地规则引擎:", result.error);
    return runSafetyRuleEngine(text);
  }

  return {
    safe: result.safe ?? true,
    action: result.action ?? "ALLOW",
    response: result.response ?? text,
    layer: result.layer ?? "rule_engine",
    riskLevel: result.riskLevel,
  };
}
