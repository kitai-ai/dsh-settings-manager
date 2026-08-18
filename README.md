# dsh-settings-manager

DeepSeek Harness 社区插件：给 Web 设置页加 **MCP 服务器** 和 **技能** 两个可视化管理分区。不需要改 YAML、不需要手动放文件——全部在设置页里点按完成，保存立即生效。

仓库：<https://github.com/kitai-ai/dsh-settings-manager>

## 安装

```sh
dsh plugin --profile web add github:kitai-ai/dsh-settings-manager
```

重启 `dsh web` 后，设置页会出现 **MCP 服务器** 和 **技能** 两个分区。构建产物（`lib/` 与 `client/client.js`）已提交，安装无需编译。

## 功能

**MCP 服务器（设置 → MCP 服务器）**

- 添加 / 编辑 / 删除 MCP 服务器（`stdio` 本地命令、`streamable-http` HTTP 端点两种传输）
- 支持环境变量、请求头、超时、启动失败策略等字段
- 保存立即生效：宿主端在运行时动态挂载/卸载 `@deepseek-ai/dsh-mcp-client` 实例，工具以 `mcp__<服务器名>__<工具名>` 出现在对话中，无需重启、无需改 `cordis.patch.yml`
- 实时连接状态（连接中 / 已连接 / 未连接 / 错误）与工具数量，错误时展示根因（cause 链）
- 查看每台服务器当前暴露的工具列表（工具名 / 描述 / 参数，`*` 标记必填参数）

**技能（设置 → 技能）**

- 按根目录浏览技能（项目 `.dsh/skills` / `.agents/skills`、用户 `~/.dsh/skills`、共享 `~/.agents/skills`）
- 新建 / 编辑 / 删除 `SKILL.md`（目录包或单文件），frontmatter 自动生成
- 保存后技能目录 watcher 自动刷新，模型目录即时可见

## 架构

| 半边 | 内容 | 位置 |
|---|---|---|
| 宿主插件 | MCP 管理器（动态挂载 mcp-client）+ 技能文件管理 + HTTP JSON API | `src/index.ts` / `src/mcp.ts` / `src/skills.ts` |
| 浏览器端 | 两个 `settings.section` 注册 + React 组件 | `src/client/` |

- 配置持久化：`<profileDir>/mcp.servers.yml`（服务器列表）、技能根目录（SKILL.md 文件）
- HTTP 路由：`/dsh-settings-manager/*`，变更类路由仅接受 loopback 同源请求
- 客户端打包：`tsdown` 输出 `window.__ModuleLoader__.load` 闭包工厂产物（`client/client.js`），由 `dsh.client` 元数据自动注入页面

## 开发

```sh
pnpm install            # 安装构建依赖（独立 workspace，见 pnpm-workspace.yaml）
pnpm run typecheck
pnpm run build          # tsc 宿主端 lib/ + tsdown 浏览器端 client/client.js
```

安装进 profile（`link:` 开发模式，源码改动重建后重启 dsh 即生效）：

```sh
dsh plugin --profile web add link:<本目录绝对路径>
```

## 已知限制

- MCP 只桥接 tools（与 `dsh-mcp-client` 一致）；resources / prompts 不接入
- 由管理器动态挂载的 mcp-client 实例与组合配置里的 mcp-client 行是不同模块实例，跨两者的 `serverName` 重复检测不互通（工具名冲突仍会在注册时报错）
- 技能正文编辑是整文件覆盖，不保留 frontmatter 中管理器未识别的自定义字段
