// 提交并推送当前工作分支：渲染 + 提交 + 推送到自己的分支
// 用法：bun scripts/publish.ts "提交说明"
// 推送后到 GitHub 创建 Pull Request 合并到 main 即完成发布
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

console.log("\n== 3/3 推送到自己的分支 ==");
run("git push");

console.log("\n已推送到当前工作分支 ✅");
console.log("下一步：在 GitHub 创建 Pull Request 合并到 main 即可发布上线。");
