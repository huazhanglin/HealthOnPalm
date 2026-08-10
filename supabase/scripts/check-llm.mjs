/**
 * 本地检测 SiliconFlow API Key 是否可用
 * 用法：在 supabase/.env 中设置 SILICONFLOW_API_KEY 后运行 npm run supabase:check:llm
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(path) {
  try {
    const text = readFileSync(path, "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx <= 0) continue;
      const key = trimmed.slice(0, idx).trim();
      const value = trimmed.slice(idx + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // ignore missing file
  }
}

loadEnvFile(resolve("supabase/.env"));

const apiKey = process.env.SILICONFLOW_API_KEY;

if (!apiKey) {
  console.error("❌ 未找到 SILICONFLOW_API_KEY");
  console.error("请在 supabase/.env 中添加：SILICONFLOW_API_KEY=sk-你的密钥");
  console.error("并在 Supabase 云端设置同名 Secret：");
  console.error("  npx supabase secrets set SILICONFLOW_API_KEY=sk-xxx --project-ref zewznptbyhurxaqirzmb");
  process.exit(1);
}

const models = [
  "deepseek-ai/DeepSeek-V3.2",
  "deepseek-ai/DeepSeek-V3",
  "Qwen/Qwen2.5-7B-Instruct",
];

async function testModel(model) {
  const response = await fetch("https://api.siliconflow.cn/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: "回复 OK 两个字母" }],
      max_tokens: 10,
      temperature: 0,
    }),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${model} -> HTTP ${response.status}: ${text.slice(0, 200)}`);
  }

  const data = JSON.parse(text);
  const content = data.choices?.[0]?.message?.content ?? "(empty)";
  console.log(`✅ ${model}: ${content.trim()}`);
}

console.log("正在检测 SiliconFlow LLM 连接...\n");

let ok = 0;
for (const model of models) {
  try {
    await testModel(model);
    ok += 1;
  } catch (error) {
    console.error(`❌ ${error.message}`);
  }
}

if (ok === 0) {
  console.error("\n所有模型均不可用，请检查 API Key、余额和网络。");
  process.exit(1);
}

console.log(`\n检测完成：${ok}/${models.length} 个模型可用。`);
