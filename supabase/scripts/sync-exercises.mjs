/**
 * 从 wger 全量同步已审核英文动作 → 本地 seed + 可选 upsert。
 * 同时按配额打上 is_featured，供 Agent / 今日计划使用精选子集。
 *
 * 用法：
 *   node supabase/scripts/sync-exercises.mjs --all
 *   node supabase/scripts/sync-exercises.mjs --all --featured=160 --upload
 *
 * 环境变量（--upload 时需要）：
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   或写在 supabase/.env
 *
 * 许可：wger 动作数据多为 CC BY-SA，入库保留 license / attribution / source_url。
 */

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import {
  CATEGORY_ZH,
  EQUIPMENT_ZH,
  EXERCISE_NAME_ZH,
  MUSCLE_ZH,
} from "./exercise-i18n.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const SEED_PATH = resolve(ROOT, "supabase/data/exercises.seed.json");
const WGER_BASE = "https://wger.de/api/v2";

const DEFAULT_QUOTA = {
  Chest: 22,
  Back: 22,
  Legs: 28,
  Shoulders: 18,
  Arms: 18,
  Abs: 22,
  Cardio: 16,
  Calves: 10,
};

function loadEnvFile(path) {
  try {
    const text = readFileSync(path, "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx <= 0) continue;
      const key = trimmed.slice(0, idx).trim();
      const value = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // ignore
  }
}

function parseArgs(argv) {
  const args = {
    all: true,
    featured: 160,
    limit: 0,
    upload: false,
    sleepMs: 120,
  };
  for (const raw of argv) {
    if (raw === "--upload") args.upload = true;
    else if (raw === "--all") args.all = true;
    else if (raw === "--curated-only") args.all = false;
    else if (raw.startsWith("--featured=")) args.featured = Number(raw.slice(11)) || 160;
    else if (raw.startsWith("--limit=")) args.limit = Number(raw.slice(8)) || 0;
    else if (raw.startsWith("--sleep=")) args.sleepMs = Number(raw.slice(8)) || 120;
  }
  // 兼容旧用法：仅 --limit=160 且未强调 all 时，等同 curated-only
  if (args.limit > 0 && !argv.includes("--all") && argv.some((a) => a.startsWith("--limit="))) {
    args.all = false;
    args.featured = args.limit;
  }
  return args;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "HealthOnPalm-ExerciseSync/1.0" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.json();
}

function stripHtml(html) {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|ol|ul|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\u200b/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeName(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[_/]+/g, " ")
    .replace(/[^\w\s+\-()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function translateName(nameEn) {
  const n = normalizeName(nameEn);
  if (EXERCISE_NAME_ZH[n]) return EXERCISE_NAME_ZH[n];
  // 部分匹配：字典 key 是 name 的子串或反之
  for (const [key, zh] of Object.entries(EXERCISE_NAME_ZH)) {
    if (n === key || n.includes(key) || key.includes(n)) return zh;
  }
  return nameEn;
}

function mapList(items, dict, nameKey = "name") {
  const out = [];
  for (const item of items || []) {
    const en = item.name_en || item[nameKey] || "";
    if (!en) continue;
    out.push(dict[en] || dict[item[nameKey]] || en);
  }
  return out;
}

function mapEnList(items, nameKey = "name") {
  return (items || [])
    .map((item) => item.name_en || item[nameKey] || "")
    .filter(Boolean);
}

function slugify(name, wgerId) {
  const base = normalizeName(name)
    .replace(/\+/g, "plus")
    .replace(/[()]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return `${base || "exercise"}-${wgerId}`;
}

function pickEnglishTranslation(translations) {
  const list = translations || [];
  return list.find((t) => t.language === 2) || list[0] || null;
}

function inferPhase(category, nameEn, equipment) {
  const n = normalizeName(nameEn);
  const stretchHints = ["stretch", "foam", "mobility", "cat cow", "child", "cobra", "yoga"];
  const warmHints = ["arm circle", "hip circle", "jumping jack", "step jack", "high knee", "march"];
  if (stretchHints.some((h) => n.includes(h))) return "cooldown";
  if (warmHints.some((h) => n.includes(h))) return "warmup";
  if (category === "Cardio" && /walk|jog|march|step jack/.test(n)) return "warmup";
  if (category === "Abs" && /plank|dead bug|bird dog/.test(n)) return "flexible";
  const eq = (equipment || []).join(" ").toLowerCase();
  if (eq.includes("bodyweight") || eq.includes("none")) {
    if (category === "Cardio") return "flexible";
  }
  return "main";
}

function inferIntensity(category, nameEn, phase) {
  const n = normalizeName(nameEn);
  if (phase === "warmup" || phase === "cooldown") return "light";
  if (category === "Cardio") {
    if (/burpee|battle|sprint|box jump/.test(n)) return "high";
    if (/walk|step jack|jog|elliptical/.test(n)) return "light";
    return "moderate";
  }
  if (/plank|dead bug|bird dog|wall sit|stretch/.test(n)) return "light";
  if (/deadlift|squat|bench|clean|snatch|pull-up|pull up/.test(n)) return "high";
  return "moderate";
}

function scoreExercise(item, translation) {
  let score = 0;
  const name = translation?.name || "";
  const n = normalizeName(name);
  if (EXERCISE_NAME_ZH[n]) score += 40;
  else {
    for (const key of Object.keys(EXERCISE_NAME_ZH)) {
      if (n.includes(key) || key.includes(n)) {
        score += 20;
        break;
      }
    }
  }
  if ((item.images || []).length > 0) score += 25;
  if (stripHtml(translation?.description || "").length > 80) score += 15;
  if ((item.muscles || []).length > 0) score += 10;
  if ((item.equipment || []).length > 0) score += 5;
  // 略微偏好经典器械名
  const eq = mapEnList(item.equipment).join(" ").toLowerCase();
  if (/barbell|dumbbell|bodyweight|none/.test(eq)) score += 5;
  return score;
}

function toRow(item, { isFeatured = false } = {}) {
  const tr = pickEnglishTranslation(item.translations);
  if (!tr?.name) return null;

  const nameEn = tr.name.trim();
  const nameZh = translateName(nameEn);
  const category = item.category?.name || "Other";
  const categoryZh = CATEGORY_ZH[category] || category;
  const equipmentEn = mapEnList(item.equipment);
  const isBodyweight =
    equipmentEn.length === 0 ||
    equipmentEn.some((e) => /none|bodyweight/i.test(e));
  const phase = inferPhase(category, nameEn, equipmentEn);
  const intensity = inferIntensity(category, nameEn, phase);
  const mainImage = (item.images || []).find((i) => i.is_main) || (item.images || [])[0];
  const license = item.license || {};
  const licenseShort = license.short_name || "CC-BY-SA-4.0";
  const licenseUrl =
    license.url || "https://creativecommons.org/licenses/by-sa/4.0/deed.en";
  const author =
    item.license_author ||
    tr.license_author ||
    (item.author_history || [])[0] ||
    "wger.de";
  const descriptionEn = stripHtml(tr.description || tr.description_source || "");
  const sourceUrl = `https://wger.de/en/exercise/${item.id}/view`;

  const row = {
    slug: slugify(nameEn, item.id),
    wger_id: item.id,
    name_en: nameEn,
    name_zh: nameZh,
    category,
    category_zh: categoryZh,
    movement_phase: phase,
    intensity,
    muscles_primary: mapEnList(item.muscles),
    muscles_primary_zh: mapList(item.muscles, MUSCLE_ZH),
    muscles_secondary: mapEnList(item.muscles_secondary),
    muscles_secondary_zh: mapList(item.muscles_secondary, MUSCLE_ZH),
    equipment: equipmentEn.length ? equipmentEn : ["none (bodyweight exercise)"],
    equipment_zh: equipmentEn.length
      ? equipmentEn.map((e) => EQUIPMENT_ZH[e] || e)
      : ["徒手"],
    is_bodyweight: isBodyweight,
    description_en: descriptionEn || null,
    description_zh: null,
    image_url: mainImage?.image || null,
    image_thumbnail_url: mainImage?.thumbnails?.medium || mainImage?.thumbnails?.small || null,
    source: "wger",
    license: licenseShort.replace(/\s+/g, "-"),
    license_url: licenseUrl,
    license_author: author,
    attribution: `「${nameZh}」动作数据改编自 wger.de（作者：${author}），遵循 ${licenseShort}。`,
    source_url: sourceUrl,
    is_active: true,
    is_featured: Boolean(isFeatured),
    sort_order: 0,
  };

  row.sync_hash = createHash("sha1")
    .update(JSON.stringify({
      wger_id: row.wger_id,
      name_en: row.name_en,
      description_en: row.description_en,
      image_url: row.image_url,
      is_featured: row.is_featured,
    }))
    .digest("hex")
    .slice(0, 16);

  return row;
}

async function fetchAllExerciseInfo(sleepMs) {
  const results = [];
  let url = `${WGER_BASE}/exerciseinfo/?language=2&status=2&limit=50&format=json`;
  while (url) {
    const page = await fetchJson(url);
    results.push(...(page.results || []));
    url = page.next;
    process.stdout.write(`\r已拉取 ${results.length} / ${page.count ?? "?"} …`);
    if (url) await sleep(sleepMs);
  }
  process.stdout.write("\n");
  return results;
}

function selectCurated(all, limit) {
  const byCategory = new Map();
  for (const item of all) {
    const tr = pickEnglishTranslation(item.translations);
    if (!tr?.name) continue;
    const cat = item.category?.name || "Other";
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat).push({ item, score: scoreExercise(item, tr) });
  }

  const picked = [];
  const quotas = { ...DEFAULT_QUOTA };
  // 按配额挑选
  for (const [cat, quota] of Object.entries(quotas)) {
    const list = (byCategory.get(cat) || []).sort((a, b) => b.score - a.score);
    const take = list.slice(0, quota);
    picked.push(...take.map((x) => x.item));
  }

  // 若不足 limit，用剩余高分补齐
  if (picked.length < limit) {
    const pickedIds = new Set(picked.map((p) => p.id));
    const rest = [];
    for (const list of byCategory.values()) {
      for (const entry of list) {
        if (!pickedIds.has(entry.item.id)) rest.push(entry);
      }
    }
    rest.sort((a, b) => b.score - a.score);
    for (const entry of rest) {
      if (picked.length >= limit) break;
      picked.push(entry.item);
    }
  }

  // 若超过 limit，按分数裁剪
  if (picked.length > limit) {
    const scored = picked
      .map((item) => ({
        item,
        score: scoreExercise(item, pickEnglishTranslation(item.translations)),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((x) => x.item);
    return scored;
  }

  return picked;
}

function selectFeaturedIds(all, featuredLimit) {
  const picked = selectCurated(all, featuredLimit);
  return new Set(picked.map((item) => item.id));
}

async function uploadRows(rows) {
  const url = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("缺少 SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY，无法 --upload");
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const chunkSize = 50;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from("exercises").upsert(chunk, {
      onConflict: "wger_id",
      ignoreDuplicates: false,
    });
    if (error) throw error;
    console.log(`已上传 ${Math.min(i + chunkSize, rows.length)} / ${rows.length}`);
  }
}

async function main() {
  loadEnvFile(resolve(ROOT, "supabase/.env"));
  loadEnvFile(resolve(ROOT, "uni-app/.env"));
  loadEnvFile(resolve(ROOT, ".env"));

  const args = parseArgs(process.argv.slice(2));
  const modeLabel = args.all
    ? `全量入库 + 精选 ${args.featured} 条`
    : `仅精选 ${args.featured} 条`;
  console.log(`开始同步 wger 动作库（${modeLabel}）…`);

  const all = await fetchAllExerciseInfo(args.sleepMs);
  const usable = all.filter((item) => pickEnglishTranslation(item.translations)?.name);
  console.log(`上游已审核英文动作共 ${all.length} 条（可用 ${usable.length}）…`);

  const featuredIds = selectFeaturedIds(usable, args.featured);
  const sourceItems = args.all ? usable : usable.filter((item) => featuredIds.has(item.id));

  const rows = sourceItems
    .map((item) => toRow(item, { isFeatured: featuredIds.has(item.id) }))
    .filter(Boolean);

  // 保证 slug 唯一
  const seen = new Set();
  for (const row of rows) {
    let slug = row.slug;
    let n = 2;
    while (seen.has(slug)) {
      slug = `${row.slug}-${n++}`;
    }
    row.slug = slug;
    seen.add(slug);
  }

  // 精选靠前，其余按分类+中文名
  rows.sort((a, b) => {
    if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1;
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.name_zh.localeCompare(b.name_zh, "zh");
  });
  rows.forEach((row, idx) => {
    row.sort_order = idx + 1;
  });

  const featuredCount = rows.filter((r) => r.is_featured).length;
  const zhCovered = rows.filter((r) => r.name_zh !== r.name_en).length;
  const payload = {
    generated_at: new Date().toISOString(),
    source: "wger.de",
    mode: args.all ? "all+featured" : "featured-only",
    license_note:
      "Exercise data adapted from wger.de. Individual exercises are typically CC BY-SA; retain attribution fields when displaying.",
    count: rows.length,
    featured_count: featuredCount,
    zh_name_coverage: zhCovered,
    exercises: rows,
  };

  mkdirSync(dirname(SEED_PATH), { recursive: true });
  writeFileSync(SEED_PATH, JSON.stringify(payload, null, 2), "utf8");
  console.log(`已写入 seed：${SEED_PATH}`);
  console.log(
    `共 ${rows.length} 条（精选 is_featured=${featuredCount}）；中文名覆盖 ${zhCovered}/${rows.length}`,
  );

  const byCat = {};
  for (const r of rows) byCat[r.category_zh] = (byCat[r.category_zh] || 0) + 1;
  console.log("分类分布：", byCat);

  if (args.upload) {
    console.log("开始 upsert 到 Supabase…");
    await uploadRows(rows);
    console.log("上传完成。");
  } else {
    console.log("未指定 --upload；仅生成本地 seed。上传请加：--upload");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
