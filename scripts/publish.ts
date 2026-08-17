// 一键发布：渲染内容 + 提交 + 推送到 GitHub Pages
// 用法：bun scripts/publish.ts "提交说明"
import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const msg = process.argv[2] || "更新站点";

function run(cmd: string, allowFail = false) {
  console.log("> " + cmd);
  try {
    execSync(cmd, { cwd: root, stdio: "inherit" });
  } catch (e) {
    if (!allowFail) throw e;
  }
}

console.log("== 1/3 渲染 Markdown 内容 ==");
run("bun scripts/build.ts");

console.log("\n== 2/3 提交改动 ==");
run("git add -A");
run(`git commit -m "${msg}"`, true); // 无改动时失败是正常的

console.log("\n== 3/3 推送到 GitHub ==");
run("git push");

console.log("\n发布完成 ✅ 站点将在一两分钟内更新上线。");
