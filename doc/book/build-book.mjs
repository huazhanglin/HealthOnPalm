/**
 * 将 doc/book 长篇定稿拼成一书 Markdown，并导出 PDF。
 * 不含公众号 / 掘金改编稿。
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));

const CHAPTERS = [
  "第一章_你不需要成为程序员也能做出一个能用的App_v7.md",
  "第二章_准备工作_搭好工位配好团队_v5.md",
  "第三章_第一周数据库与用户登录_v2.md",
  "第四章_第二周Mock数据与AI晨报_v2.md",
  "第五章_第三周真数据与自研插件_v2.md",
  "第六章_第四周训练闭环与恢复分重写_v2.md",
  "第七章_第五周文档周与全书小结_v2.md",
];

function read(name) {
  return fs.readFileSync(path.join(dir, name), "utf8").replace(/^\uFEFF/, "");
}

function extractSection(src, startHeading, endHeading) {
  const start = src.indexOf(startHeading);
  if (start < 0) throw new Error(`找不到 ${startHeading}`);
  const from = start + startHeading.length;
  const end = endHeading ? src.indexOf(endHeading, from) : src.length;
  if (endHeading && end < 0) throw new Error(`找不到结束标记 ${endHeading}`);
  return src.slice(from, end).trim();
}

const front = read("全书目录_序言_后记_v3.md");
const tocBody = extractSection(front, "## 目录", "## 序言");
const preface = extractSection(front, "## 序言", "## 后记");
const afterword = extractSection(front, "## 后记", null);

const titlePage = `<!-- 封面 -->
<div class="title-page">
  <h1 class="book-title no-break">我用 AI 造 App</h1>
  <p class="book-subtitle">一个不会写代码的人和他的数字团队</p>
  <div class="book-meta">
    <p>OPC 实践记录 · Health On Palm</p>
    <p>2026 年 7 月 — 8 月</p>
  </div>
</div>
`;

const toc = `# 目录

${tocBody}
`;

const prefaceMd = `# 序言

${preface}
`;

const chapters = CHAPTERS.map((file) => {
  const raw = read(file).trim();
  if (!raw.startsWith("# ")) {
    throw new Error(`${file} 应以一级标题开篇`);
  }
  return raw;
}).join("\n\n<div class=\"page-break\"></div>\n\n");

const afterwordMd = `# 后记

${afterword}
`;

const breakPage = '<div class="page-break"></div>';

const book = [
  titlePage,
  toc,
  breakPage,
  prefaceMd,
  breakPage,
  chapters,
  breakPage,
  afterwordMd,
].join("\n\n");

const outMd = path.join(dir, "hop-book.md");
const outPdfAscii = path.join(dir, "hop-book.pdf");
const outPdfNamed = path.join(dir, "我用AI造App.pdf");

fs.writeFileSync(outMd, book, "utf8");
console.log("Wrote", outMd, `(${book.length} chars)`);

const pdf = spawnSync(
  "npx",
  ["--yes", "md-to-pdf", "hop-book.md", "--config-file", "book-pdf-config.json"],
  { cwd: dir, stdio: "inherit", shell: true },
);

if (pdf.status !== 0) {
  process.exit(pdf.status ?? 1);
}

if (fs.existsSync(outPdfAscii)) {
  fs.copyFileSync(outPdfAscii, outPdfNamed);
  console.log("Wrote", outPdfNamed);
}
