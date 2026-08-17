// 极简静态站点生成器：读取 content/ 下的 Markdown，套用模板，输出 HTML
// 用法：bun scripts/build.ts
//
// 说明：
// - content/posts/*.md  →  posts/*.html   （使用 templates/post.html）
// - content/pages/*.md  →  pages/*.html   （使用 templates/page.html）
// - Markdown 头部支持 front-matter：title / date / description

import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// ---- front-matter 解析：分离头部 meta 与正文 ----
interface Meta {
  title: string;
  date: string;
  description: string;
}

function parseFrontMatter(src: string): { meta: Meta; body: string } {
  const meta: Meta = { title: "", date: "", description: "" };
  let body = src;
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (m) {
    for (const line of m[1].split(/\r?\n/)) {
      const kv = line.match(/^([a-zA-Z]+):\s*(.*)$/);
      if (kv) {
        const key = kv[1].toLowerCase();
        const val = kv[2].trim();
        if (key === "title") meta.title = val;
        else if (key === "date") meta.date = val;
        else if (key === "description") meta.description = val;
      }
    }
    body = src.slice(m[0].length);
  }
  return { meta, body };
}

// ---- 转义 HTML 特殊字符 ----
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ---- 行内元素：**粗体** *斜体* `代码` [链接](url) ----
function inline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

// ---- 极简 Markdown → HTML（逐行渲染）----
function renderMarkdown(md: string): string {
  const lines = md.split(/\r?\n/);
  let html = "";
  let inList: "ul" | "ol" | null = null;
  let inCode = false;
  let para: string[] = [];

  const flushPara = () => {
    if (para.length) {
      html += `<p>${inline(para.join(" "))}</p>\n`;
      para = [];
    }
  };
  const closeList = () => {
    if (inList) {
      html += `</${inList}>\n`;
      inList = null;
    }
  };

  for (const line of lines) {
    // 代码块
    if (line.trimStart().startsWith("```")) {
      if (inCode) {
        html += "</code></pre>\n";
        inCode = false;
      } else {
        flushPara();
        closeList();
        html += "<pre><code>";
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      html += escapeHtml(line) + "\n";
      continue;
    }

    // 标题
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      flushPara();
      closeList();
      const level = h[1].length;
      html += `<h${level}>${inline(h[2])}</h${level}>\n`;
      continue;
    }

    // 无序列表
    const ul = line.match(/^\s*[-*+]\s+(.*)$/);
    if (ul) {
      flushPara();
      if (inList !== "ul") {
        closeList();
        html += "<ul>\n";
        inList = "ul";
      }
      html += `<li>${inline(ul[1])}</li>\n`;
      continue;
    }

    // 有序列表
    const ol = line.match(/^\s*\d+\.\s+(.*)$/);
    if (ol) {
      flushPara();
      if (inList !== "ol") {
        closeList();
        html += "<ol>\n";
        inList = "ol";
      }
      html += `<li>${inline(ol[1])}</li>\n`;
      continue;
    }

    // 空行 → 段落结束
    if (line.trim() === "") {
      flushPara();
      closeList();
      continue;
    }

    // 普通文本，累积为段落
    para.push(line.trim());
  }

  flushPara();
  closeList();
  return html;
}

// ---- 渲染一类内容 ----
function buildKind(kind: "posts" | "pages", templatePath: string) {
  const srcDir = join(ROOT, "content", kind);
  const outDir = join(ROOT, kind);
  if (!existsSync(srcDir)) return;

  const template = readFileSync(templatePath, "utf-8");
  mkdirSync(outDir, { recursive: true });

  const files = readdirSync(srcDir).filter((f) => f.endsWith(".md"));
  for (const file of files) {
    const src = readFileSync(join(srcDir, file), "utf-8");
    const { meta, body } = parseFrontMatter(src);
    const content = renderMarkdown(body.trim());

    let out = template;
    out = out.replace(/\{\{title\}\}/g, meta.title || file.replace(/\.md$/, ""));
    out = out.replace(/\{\{date\}\}/g, meta.date || "");
    out = out.replace(/\{\{description\}\}/g, meta.description || meta.title || "");
    out = out.replace(/\{\{content\}\}/g, content);

    const outFile = join(outDir, file.replace(/\.md$/, ".html"));
    writeFileSync(outFile, out, "utf-8");
    console.log(`  ✓ ${kind}/${file} → ${kind}/${file.replace(/\.md$/, ".html")}`);
  }
}

// ---- 主流程 ----
console.log("构建静态站点...\n");
buildKind("posts", join(ROOT, "templates", "post.html"));
buildKind("pages", join(ROOT, "templates", "page.html"));
console.log("\n构建完成 ✔");
