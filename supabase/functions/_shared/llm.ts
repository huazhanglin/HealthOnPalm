/** SiliconFlow LLM 调用封装：重试 + 多模型降级 */

const SILICONFLOW_API_URL = "https://api.siliconflow.cn/v1/chat/completions";

/** 按优先级尝试的模型列表 */
export const LLM_MODEL_FALLBACKS = [
  "deepseek-ai/DeepSeek-V3.2",
  "deepseek-ai/DeepSeek-V3",
  "Qwen/Qwen2.5-7B-Instruct",
] as const;

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** 解析 SiliconFlow 错误响应 */
function parseSiliconFlowError(status: number, errorText: string): string {
  try {
    const parsed = JSON.parse(errorText) as {
      message?: string;
      error?: string | { message?: string };
    };
    const nested =
      typeof parsed.error === "object" ? parsed.error?.message : parsed.error;
    return parsed.message || nested || errorText;
  } catch {
    return errorText || `HTTP ${status}`;
  }
}

/** 是否值得重试的错误（繁忙 / 限流 / 5xx） */
function isRetryableError(message: string, status: number): boolean {
  if (status === 429 || status === 502 || status === 503 || status === 504) {
    return true;
  }
  return /忙碌|busy|rate limit|too many|overload|timeout|temporarily/i.test(message);
}

/** 单次 LLM 调用 */
export async function callSiliconFlowLLM(
  apiKey: string,
  messages: LLMMessage[],
  options: {
    model: string;
    maxTokens?: number;
    temperature?: number;
  }
): Promise<string> {
  const response = await fetch(SILICONFLOW_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: options.model,
      messages,
      max_tokens: options.maxTokens ?? 800,
      temperature: options.temperature ?? 0.7,
    }),
  });

  const rawText = await response.text();

  if (!response.ok) {
    const message = parseSiliconFlowError(response.status, rawText);
    throw new Error(message);
  }

  let data: { choices?: Array<{ message?: { content?: string } }> };
  try {
    data = JSON.parse(rawText);
  } catch {
    throw new Error("LLM 返回格式异常");
  }

  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("LLM 返回内容为空");
  }

  return content;
}

/** 带重试与模型降级的 LLM 调用 */
export async function callSiliconFlowLLMWithFallback(
  apiKey: string,
  messages: LLMMessage[],
  options: {
    maxTokens?: number;
    temperature?: number;
    models?: readonly string[];
  } = {}
): Promise<{ content: string; model: string }> {
  if (!apiKey) {
    throw new Error("SILICONFLOW_API_KEY 未配置");
  }

  const models = options.models ?? LLM_MODEL_FALLBACKS;
  let lastError: Error | null = null;

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const content = await callSiliconFlowLLM(apiKey, messages, {
          model,
          maxTokens: options.maxTokens,
          temperature: options.temperature,
        });
        return { content, model };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const statusMatch = lastError.message.match(/HTTP (\d{3})/);
        const status = statusMatch ? Number(statusMatch[1]) : 0;

        if (isRetryableError(lastError.message, status) && attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, 1200));
          continue;
        }
        break;
      }
    }
  }

  throw lastError ?? new Error("LLM 调用失败");
}
