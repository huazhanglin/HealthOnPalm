/**
 * 本地测试 Safety Agent 规则引擎
 * 用法：node supabase/scripts/test-safety.mjs
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// 内联规则（与 _shared/safety.ts 保持一致，供本地快速验证）
const BLOCKED = [
  /诊断|确诊|患有|得了|xx病|xx症/i,
  /阿司匹林|布洛芬|降压药|胰岛素|抗生素|处方药|药品|服药|吃什么药/i,
  /胸痛|胸疼|胸口|心口|胸闷|呼吸困难|咳血|昏迷|半身不遂|剧烈头痛|突然晕倒/i,
  /自杀|自残|想死|抑郁症|焦虑症|精神分裂/i,
  /高血压|糖尿病|心脏病|癌症|肿瘤|艾滋病/i,
];

const REFER = [
  /一直疼|持续疼|越来越严重|流血|伤口|骨折|肿了|发高烧/i,
  /怀孕|备孕|月经不调|妇科问题/i,
  /儿童|老人|患者.*身体/i,
];

function check(text) {
  for (const p of BLOCKED) {
    if (p.test(text)) return { action: "BLOCK", pattern: p.source };
  }
  for (const p of REFER) {
    if (p.test(text)) return { action: "REFER", pattern: p.source };
  }
  return { action: "ALLOW", pattern: null };
}

const cases = [
  { text: "今天适合跑步吗？", expect: "ALLOW" },
  { text: "我胸口很痛，怎么办？", expect: "BLOCK" },
  { text: "布洛芬可以吃吗？", expect: "BLOCK" },
  { text: "伤口一直流血怎么办？", expect: "REFER" },
  { text: "昨晚睡了7小时，今天有点累", expect: "ALLOW" },
];

console.log("Safety Agent 规则引擎本地测试\n");

let passed = 0;
for (const item of cases) {
  const result = check(item.text);
  const ok = result.action === item.expect;
  console.log(`${ok ? "✅" : "❌"} [${result.action}] ${item.text}`);
  if (!ok) console.log(`   期望 ${item.expect}，实际 ${result.action}`);
  if (ok) passed += 1;
}

console.log(`\n${passed}/${cases.length} 通过`);

if (passed !== cases.length) process.exit(1);
