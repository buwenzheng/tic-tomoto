# 项目结构规范

## 目录结构

```
src/
├── main/           # Electron 主进程
│   ├── core/       # 核心功能模块
│   │   ├── app/    # 应用生命周期管理
│   │   ├── window/ # 窗口管理
│   │   └── ipc/    # IPC通信管理
│   ├── features/   # 主进程功能模块
│   │   ├── storage/    # 数据存储
│   │   ├── updates/    # 自动更新
│   │   └── security/   # 安全相关
│   ├── services/   # 后台服务
│   └── utils/      # 工具函数
│
├── preload/        # 预加载脚本
│   ├── api/        # 暴露给渲染进程的API
│   │   ├── app.ts      # 应用相关API
│   │   ├── window.ts   # 窗口相关API
│   │   └── system.ts   # 系统相关API
│   └── utils/      # 预加载脚本工具函数
│
└── renderer/       # 渲染进程（前端）
    ├── src/
    │   ├── assets/          # 静态资源
    │   │   ├── images/      # 图片资源
    │   │   ├── styles/      # 样式文件
    │   │   └── fonts/       # 字体文件
    │   │
    │   ├── components/      # 通用组件
    │   │   ├── common/      # 基础通用组件
    │   │   │   ├── Button/
    │   │   │   ├── Input/
    │   │   │   └── Icon/
    │   │   ├── feedback/    # 反馈类组件
    │   │   │   ├── Modal/
    │   │   │   └── Toast/
    │   │   └── layout/      # 布局相关组件
    │   │
    │   ├── features/        # 功能模块
    │   │   ├── timer/       # 计时器功能
    │   │   │   ├── components/  # 模块专用组件
    │   │   │   ├── hooks/       # 模块专用钩子
    │   │   │   ├── stores/      # 模块状态管理
    │   │   │   └── utils/       # 模块工具函数
    │   │   ├── tasks/       # 任务管理功能
    │   │   ├── stats/       # 统计功能
    │   │   └── settings/    # 设置功能
    │   │
    │   ├── hooks/           # 全局通用钩子
    │   ├── layouts/         # 布局组件
    │   ├── pages/           # 页面组件
    │   ├── stores/          # 全局状态管理
    │   ├── styles/          # 全局样式
    │   ├── types/           # 类型定义
    │   └── utils/           # 全局工具函数
```

## 命名规范

### 文件命名
- 组件文件：PascalCase（如 `Button.tsx`）
- 工具/钩子文件：camelCase（如 `useTheme.ts`）
- 类型定义文件：camelCase（如 `types.ts`）
- 样式文件：camelCase（如 `button.css`）

### 目录命名
- 组件目录：PascalCase（如 `Button/`）
- 功能模块目录：camelCase（如 `timer/`）
- 工具/配置目录：camelCase（如 `utils/`）

## 组件规范

### 组件结构
```typescript
// 1. 导入
import React from 'react'
import type { ComponentProps } from './types'

// 2. 类型定义
interface Props extends ComponentProps {
  // ...
}

// 3. 常量/工具函数
const CONSTANTS = {
  // ...
}

// 4. 组件定义
export const Component: React.FC<Props> = () => {
  // 4.1 Hooks
  const [state, setState] = useState()
  
  // 4.2 副作用
  useEffect(() => {
    // ...
  }, [])
  
  // 4.3 事件处理
  const handleEvent = () => {
    // ...
  }
  
  // 4.4 渲染
  return (
    // ...
  )
}

// 5. 默认导出
export default Component
```

### 目录结构
```
ComponentName/
├── index.tsx      # 主组件文件
├── types.ts       # 类型定义
├── constants.ts   # 常量定义
├── utils.ts       # 工具函数
├── hooks.ts       # 自定义钩子
└── styles.css     # 样式文件
```

## 状态管理规范

### Store结构
```typescript
interface Store {
  // 1. 状态定义
  state: State
  
  // 2. 计算属性
  computed: Computed
  
  // 3. 操作方法
  actions: Actions
}
```

### 状态分层
- 全局状态：主题、用户设置等
- 功能状态：特定功能模块的状态
- 组件状态：组件内部状态

## 主进程规范

### 模块结构
```typescript
// 1. 类型定义
interface ModuleTypes {
  // ...
}

// 2. 常量定义
const CONSTANTS = {
  // ...
}

// 3. 工具函数
const utils = {
  // ...
}

// 4. 主要功能
class Module {
  // ...
}

// 5. 导出
export default new Module()
```

## IPC通信规范

### 通道命名
- 格式：`module:action`
- 示例：`window:minimize`、`app:quit`

### 处理器结构
```typescript
// 主进程
ipcMain.handle('channel', async (event, ...args) => {
  try {
    // 参数验证
    // 业务处理
    // 返回结果
  } catch (error) {
    // 错误处理
  }
})

// 渲染进程
const result = await window.tomatoAPI.module.action(...args)
```

## 错误处理规范

### 错误类型
```typescript
interface AppError extends Error {
  code: string
  module: string
  details?: unknown
}
```

### 错误处理流程
1. 捕获错误
2. 记录日志
3. 用户反馈
4. 错误恢复

## 测试规范

### 测试目录结构
```
__tests__/
├── unit/           # 单元测试
├── integration/    # 集成测试
└── e2e/            # 端到端测试
```

### 测试文件命名
- 单元测试：`*.test.ts`
- 集成测试：`*.spec.ts`
- E2E测试：`*.e2e.ts` 