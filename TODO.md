# Tic‑Tomoto 优化路线图（可执行 TODO）

面向 Electron + React + Vite + Tailwind + Zustand 架构的系统化优化清单。按优先级与领域拆分，每条包含明确的交付与验收标准，便于持续推进与追踪。

## P0｜立即项（稳定性/安全/类型冲突）

- [x] 统一类型定义，移除重复与冲突的声明
  - 位置：`src/renderer/src/types/index.ts`
  - 问题：同文件里存在重复与相互冲突的类型与枚举（如 `TimerMode` 同时存在 `enum` 与 `union type`，`ThemeMode`、`Task`、`StorageAdapter` 等也重复）。
  - 方案：
    - 拆分为领域化文件：`types/task.ts`、`types/timer.ts`、`types/settings.ts`；
    - `types/index.ts` 仅做聚合导出，删除重复定义，保留单一权威。
  - 验收：`npm run typecheck` 通过；无重复导出；`stores`、`services` 与页面编译通过。

- [x] 提取主/渲染共用 Schema 与 DEFAULT_DATA
  - 位置：主进程 `src/main/index.ts` 与渲染层 `src/renderer/src/services/storage.ts`、`AppInitializer.tsx` 各自维护了 `Schema/DEFAULT_DATA` 与迁移逻辑。
  - 方案：新增 `src/shared/schema.ts`（或 `src/shared/model` 目录），集中定义 `Schema`、`DEFAULT_DATA`、迁移方法；
    - 主进程与渲染进程均从该模块导入；
    - `tsconfig.node.json` 与 `tsconfig.web.json` 增加 `paths` 指向 `src/shared/*`。
  - 验收：单一来源；两端无需再定义本地副本；`db:write/read` 与 `LocalStorageAdapter` 使用相同迁移策略。

- [x] 收敛 IPC 通道并增加参数校验
  - 位置：`src/main/index.ts`（`ipcMain.handle/on`）、`src/preload/index.ts`。
  - 问题：`system:registerGlobalShortcut` 允许传入任意 `channelId`；`fs:*` 接口未验证 `filename`；潜在通道滥用与路径遍历风险。
  - 方案：
    - 通道白名单：固定仅允许预定义事件，如注册全局快捷键只派发固定通道 `app:globalShortcut:toggleTimer`；
    - 入参校验：引入 `zod` 对 `filename/soundPath/accelerator` 等做校验与规范化（限制为文件名，不允许相对路径跳转）；
    - 对 `db:write`、`fs:saveData` 做深度校验（Schema 版本、字段范围）。
  - 验收：恶意 `channelId` 不会被转发；非法路径被拒绝并记录；单元测试覆盖。

- [x] 合并重复的 `web-contents-created` 监听并强化导航策略
  - 位置：`src/main/index.ts`（重复注册了 2 次）。
  - 方案：合并为一次注册，集中处理 `setWindowOpenHandler` 与 `will-navigate`；仅允许受信任源；开发期与生产期行为可通过环境区分。
  - 验收：仅有一次监听；外链一律 `deny` 并通过 `shell.openExternal` 显式打开。

- [x] 平台化窗口配置与特效兼容
  - 位置：`src/main/index.ts`（`vibrancy/visualEffectState` 在 Windows/Linux 不生效）。
  - 方案：对 macOS 专用配置做平台判断；Windows/Linux 使用安全等效项或跳过。
  - 验收：三平台启动无警告；标题栏样式与行为一致预期。

## P1｜数据与状态（一致性/可恢复）

- [x] 计时器状态持久化与漂移修正
  - 方案：
    - 在 `useTimerStore` 中将 `mode/timeLeft/totalTime/isRunning/isPaused` 持久化到存储；
    - 引入基于“目标结束时间”的漂移修正（每 tick 以 `endAt - now` 计算，纠正 setInterval 漂移）。
  - 验收：应用重启后可恢复计时；长时间运行无明显累计误差；测试覆盖。

- [x] 会话完成统计与任务联动
  - 方案：在 `completeSession` 时：
    - 更新 `stats`（`totalPomodoros/totalWorkTime/daily/weekly/monthly`）；
    - 关联 `currentTaskId` 自动累加任务番茄数并可选自动切换到休息；
    - 统一通过存储写入。
  - 验收：计时器结束后统计与任务同步更新，刷新后数据一致。

- [x] 备份/恢复与导入/导出
  - 方案：提供“导出 JSON/导入 JSON/自动备份 N 份”能力（主进程文件系统 API）。
  - 验收：在设置页可一键创建备份/恢复，失败有提示；最近备份列表可见；可打开备份目录。

## P1｜安全与 CSP

- [x] 按环境差异化 CSP
  - 位置：`src/renderer/index.html`。
  - 方案：
    - 生产：`default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; media-src 'self'; frame-src 'none'`；
    - 开发：允许 Vite HMR 所需源（`ws://localhost:*`）。
  - 验收：开发热更新正常；生产打包后无 CSP 报错。

- [x] 仅白名单外链打开
  - 方案：统一在主进程拦截外链，通过 `shell.openExternal`，白名单域放行，其他一律拒绝。
  - 验收：点击外链无页面内跳转，均在系统浏览器打开。

## P1｜UI/UX 与可用性

- [ ] 任务页拖拽排序稳定性与大数据量体验
  - 方案：为 `Reorder.Group` 增加节流/去抖；必要时引入虚拟化（如 `react-virtual`）。
  - 验收：1000+ 条任务依然流畅；排序写入稳定无丢失。

- [x] 统计页最小可用图表
  - 方案：使用 `recharts` 实现任务状态分布（饼图）与番茄趋势（折线图）。
  - 验收：空数据时展示占位；数据变化实时更新。

- [x] 托盘与“最小化到托盘”设置落地
  - 方案：主进程实现 Tray，支持单击显示/隐藏、右键菜单；遵循 `settings.minimizeToTray`。
  - 验收：Windows/macOS/Linux 均可用，关闭按钮行为可配置为“隐藏到托盘”。

## P1｜测试与质量

- [x] 修正 `useStorage` 测试中的计时器用法
  - 位置：`src/renderer/src/hooks/__tests__/useStorage.test.ts`。
  - 方案：移除 `vi.runAllTimersAsync()`（未启用 fake timers）或改为 `await waitFor(...)`/`await flushPromises()`；完善错误分支断言。
  - 验收：`npm test` 通过；无定时器相关警告。

- [x] 新增 stores 的单元测试
  - 覆盖：`timerStore`（start/pause/stop/reset/tick/completeSession）、`taskStore`（CRUD/排序/统计选择器）。
  - 验收：核心分支覆盖率 > 80%；PR Gate 接入。

## P2｜构建与发布

- [ ] 配置自动更新与发布源
  - 位置：`electron-builder.yml` `publish`/`dev-app-update.yml`。
  - 方案：接入实际的更新服务器（如 GitHub Releases/S3/自建）；当前已注释示例配置并去除占位 URL，后续接入时只需填充参数。
  - 验收：生产构建能正常检查/下载/应用更新或明确禁用。

- [x] CI/CD
  - 方案：GitHub Actions（或其他 CI）流水线：lint + typecheck + test + 三平台构建与签名（可按平台拆分）。
  - 验收：主干保护开启；PR 必须通过流水线。

## P2｜开发体验与工程规范

- [x] Husky + lint-staged
  - 方案：增加 `.husky/pre-commit`（`lint-staged` 执行 `eslint --fix`、`prettier --write`）、`commit-msg`（`commitlint`）。
  - 验收：本地提交自动格式化并校验提交信息。

- [ ] 调试与日志
  - 方案：主/渲染接入 `electron-log` 或同类库；按环境分级（debug/info/warn/error），关键路径（IPC/DB/计时器/快捷键）打点。
  - 验收：问题可复现可溯源；日志写入用户数据目录。

## P2｜可观测性与崩溃上报（可选）

- [ ] 接入 Sentry/Electron CrashReporter
  - 方案：捕获主/渲染异常与未处理 Promise；上报最小必要上下文（版本、平台、路由、最近事件）。
  - 验收：故障可见；不泄露隐私数据。

## P3｜功能增强（按需）

- [ ] 自定义快捷键设置 UI（含启用/禁用）
- [ ] 多语言（i18n）与文案抽离（默认中文，支持英文）
- [ ] 数据同步（本地文件/云端，占位接口与策略）

---

## 任务分解与建议执行顺序

1. P0 立即项（类型/IPC/窗口/监听器合并）
2. P1 数据一致性与计时器可靠性（持久化 + 漂移修正 + 统计联动）
3. P1 安全/CSP 与 UI 基础能力（托盘、图表）
4. P1 测试补齐（stores 覆盖）
5. P2 发布流水线与日志
6. P3 增强项

---

## 里程碑与验收（简表）

- 里程碑 M1：P0 全部完成（Typecheck 0 错误，IPC 白名单与校验生效）
- 里程碑 M2：P1 数据与计时器可靠（重启恢复、长跑无漂移）
- 里程碑 M3：测试覆盖核心路径 > 80%，统计与托盘可用
- 里程碑 M4：CI/CD 上线，自动更新策略明确

备注：执行过程中如需新增条目，请在以上分组下追加并标注优先级与验收标准。
