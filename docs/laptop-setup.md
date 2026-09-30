# person_station 笔记本接入任务书

> 本文件交给**笔记本侧的 AI 模型**。请按顺序自动完成下列步骤，把笔记本接入 person_station 项目的协作工作流，成为 `a_laptop` 工作分支的维护者。

## 一、背景信息（先了解）

- **项目**：person_station —— 个人内容站（纯静态 HTML/CSS/JS + GitHub Pages）
- **远程仓库**：`git@github.com:ZhouM-dev/person_station.git`
- **线上地址**：https://ZhouM-dev.github.io/person_station/
- **GitHub 账号**：`ZhouM-dev`

### 分支模型（务必遵守）

| 分支 | 职责 |
|---|---|
| `main` | 最终发布分支，GitHub Pages 从这里上线（只合并、不直接改） |
| `baoan_station` | 台式机工作站的分支（另一台电脑，勿动） |
| `a_laptop` | 笔记本（你）的分支，**由你创建** |

### 技术栈与脚本

- 内容源：Markdown，放在 `content/posts/` 和 `content/pages/`
- 渲染：`bun scripts/build.ts`（Markdown → HTML）
- 提交推送：`bun scripts/publish.ts "说明"`（渲染 + 提交 + 推送到当前分支）
- 发布：在 GitHub 创建 Pull Request（工作分支 → main）并合并，合并后自动上线

## 二、你要完成的接入步骤（按顺序自动执行）

### 第 1 步：确认 Git 已安装
- 执行 `git --version` 检查。
- 未安装则安装：Windows 到 https://git-scm.com/downloads ；macOS `brew install git`；Linux `sudo apt install git`。

### 第 2 步：配置 Git 身份（与台式机保持一致）
```bash
git config --global user.name "ZhouM-dev"
git config --global user.email "ZhouM-dev@users.noreply.github.com"
```

### 第 3 步：配置 SSH 免密推送
1. 检查是否已有密钥：`ls ~/.ssh/id_ed25519.pub`
2. 若不存在，先建目录再生成（无密码）：
```bash
mkdir -p ~/.ssh
ssh-keygen -t ed25519 -C "ZhouM-dev@users.noreply.github.com" -f ~/.ssh/id_ed25519 -N ""
```
3. 读取公钥：`cat ~/.ssh/id_ed25519.pub`
4. **把公钥内容展示给用户**，请用户到 https://github.com/settings/ssh/new 添加（Title 填「笔记本」，Key type 选 Authentication Key，Key 粘贴公钥）。
5. 用户添加后验证：`ssh -T git@github.com`（成功输出 `Hi ZhouM-dev! ...`）。

### 第 4 步：克隆仓库
```bash
git clone git@github.com:ZhouM-dev/person_station.git
cd person_station
```

### 第 5 步：创建自己的工作分支
```bash
git checkout -b a_laptop
git push -u origin a_laptop
```

### 第 6 步：安装 bun（如需跑渲染/发布脚本）
- 执行 `bun --version` 检查。
- 未安装则装：https://bun.sh/docs/installation （Windows：`powershell -c "irm bun.sh/install.ps1 | iex"`）。
- 若不想装，可改用纯 git 命令提交（见下方「方式 B」）。

## 三、日常操作流程（接入完成后）

### 每次开工前：同步 main 最新
```bash
git checkout a_laptop
git pull origin main
```

### 干活后：提交并推送到自己的分支
方式 A（有 bun，推荐）：
```bash
bun scripts/publish.ts "本次改动说明"
```

方式 B（纯 git）：
```bash
git add -A
git commit -m "本次改动说明"
git push
```

### 发布上线：创建 Pull Request
1. 推送后访问：https://github.com/ZhouM-dev/person_station/pull/new/a_laptop
2. 创建 Pull Request（`a_laptop` → `main`）
3. 合并 PR
4. 合并后 1–2 分钟，站点自动上线。

## 四、注意事项

- **永远不要在 `main` 分支上直接改动**，一切改动经自己的分支 + PR 合并。
- 提交信息用中文，简述本次改动。
- 不要手改生成产物（`posts/*.html` 等），它们由 `build.ts` 从 `content/` 生成。
- 两台电脑若改到同一文件，合并时可能冲突：先 `git pull origin main` 再处理冲突。
- 台式机（`baoan_station`）与笔记本（`a_laptop`）并行工作，互不干扰。

## 五、接入完成确认清单

完成后逐项自检，全部通过即接入成功：

- [ ] `git config user.name` / `user.email` 已配置
- [ ] `ssh -T git@github.com` 成功（免密可用）
- [ ] 仓库已克隆到本地
- [ ] `a_laptop` 分支已创建并 `push` 到远程
- [ ] 能正常 `git pull origin main` 和 `git push`
