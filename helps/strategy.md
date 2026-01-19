**推荐做法：** 编写**1 个**通用的“引擎”组件，通过**配置策略**来注入不同的业务逻辑。

以下是具体的架构设计和代码实现方案：

### 1. 核心思路：分离“机制”与“策略”

- **机制 (通用部分)**：Graph 的 new 实例、缩放/平移配置、Dnd 拖拽逻辑、销毁逻辑。这些代码在 5 种场景下是一模一样的。
- **策略 (差异部分)**：
  1. **侧边栏数据**：有哪些组件可以拖。
  2. **节点注册逻辑**：不同场景可能需要注册不同的 React 自定义节点。
  3. **节点样式/属性**：初始拖进去的节点长什么样。

### 2. 目录结构建议

采用我们之前讨论的“文件夹 + 命名文件”结构，并增加一个 `strategies` 目录：

Plaintext

```
src/
  components/
    FlowGraph/
      index.tsx           <-- 入口，转发
      FlowGraph.tsx       <-- 通用画布组件（引擎）
      FlowGraph.css
      strategies/         <-- 存放差异化配置
        index.ts          <-- 策略映射表
        types.ts          <-- 类型定义
        environment.ts    <-- 场景1配置
        interaction.ts    <-- 场景2配置
        ...
```

### 3. 代码实现步骤

#### 第一步：定义配置的类型 (strategies/types.ts)

我们需要定义每个场景必须提供哪些数据。

TypeScript

```typescript
// strategies/types.ts
import { Graph } from '@antv/x6'

// 侧边栏的每一项
export interface SidebarItem {
  type: string      // 唯一标识
  label: string     // 显示文字
  shape: string     // 对应的 X6 shape 名称
  color?: string    // 侧边栏展示颜色
  defaultAttrs?: any // 拖入画布时的默认属性
}

// 策略接口
export interface GraphStrategy {
  // 该场景下的侧边栏列表
  sidebarItems: SidebarItem[]
  
  // (可选) 注册该场景特有的自定义节点
  // 传入 graph 实例或者静态注册
  registerNodes?: () => void 
}
```

#### 第二步：编写具体策略配置 (strategies/environment.ts)

比如“环境”这个场景：

TypeScript

```typescript
// strategies/environment.ts
import { Graph } from '@antv/x6'
import { register } from '@antv/x6-react-shape'
import { GraphStrategy } from './types'
import EnvCustomNode from './components/EnvCustomNode' // 假设你有个自定义React节点组件

const environmentStrategy: GraphStrategy = {
  sidebarItems: [
    { 
      type: 'physical', 
      label: '物理实体', 
      shape: 'env-rect-node', // 使用下方注册的自定义 shape
      color: '#eff4ff' 
    },
    { 
      type: 'factor', 
      label: '环境因素', 
      shape: 'circle', // 使用内置 shape
      color: '#f6ffed' 
    }
  ],

  registerNodes: () => {
    // 只有在这个策略下，才需要注册这个特殊的 React 节点
    // 建议加上 namespace 防止冲突，比如 'env-rect-node'
    if (!Graph.registry.exist('node', 'env-rect-node')) {
       register({
        shape: 'env-rect-node',
        width: 100,
        height: 40,
        component: EnvCustomNode,
      })
    }
  }
}

export default environmentStrategy
```

#### 第三步：创建策略映射表 (strategies/index.ts)

TypeScript

```typescript
// strategies/index.ts
import environmentStrategy from './environment'
import interactionStrategy from './interaction'
import { GraphStrategy } from './types'

const strategies: Record<string, GraphStrategy> = {
  environment: environmentStrategy,
  interaction: interactionStrategy,
  // ... 其他3个
}

// 默认兜底策略
const defaultStrategy = environmentStrategy

export const getStrategy = (key: string): GraphStrategy => {
  return strategies[key] || defaultStrategy
}
```

#### 第四步：编写通用的 FlowGraph 组件

现在你的主组件变得非常干净，它只负责“执行”策略。

TypeScript

```react
// FlowGraph.tsx
import React, { useEffect, useRef, useMemo } from 'react'
import { Graph, Dnd } from '@antv/x6'
import { getStrategy } from './strategies'
import './FlowGraph.css'

interface FlowGraphProps {
  sectionKey: string // 父组件传进来的 key
}

const FlowGraph = ({ sectionKey }: FlowGraphProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const graphRef = useRef<Graph>()
  const dndRef = useRef<Dnd>()

  // 1. 获取当前策略
  // 使用 useMemo 确保只在 key 变化时重新获取
  const strategy = useMemo(() => getStrategy(sectionKey), [sectionKey])

  useEffect(() => {
    // 2. 执行节点注册逻辑
    // 在初始化 Graph 之前注册好自定义节点
    if (strategy.registerNodes) {
      strategy.registerNodes()
    }

    if (!containerRef.current) return

    // 3. 通用的 Graph 初始化 (复用逻辑)
    const graph = new Graph({
      container: containerRef.current,
      grid: true,
      background: { color: '#f8f9fa' },
      // ... 其他通用配置
    })
    
    graphRef.current = graph

    // 通用的 Dnd 初始化
    const dnd = new Dnd({
      target: graph,
      scaled: false,
      // 注意：这里不要设置 dndContainer，除非你知道你在做什么
    })
    dndRef.current = dnd

    return () => {
      graph.dispose()
    }
  }, [strategy]) // 当策略改变时（即 sectionKey 改变），重新初始化画布

  // 4. 通用的开始拖拽逻辑
  const startDrag = (e: React.MouseEvent, item: any) => {
    if (!graphRef.current || !dndRef.current) return

    const node = graphRef.current.createNode({
      shape: item.shape,
      label: item.label,
      ...item.defaultAttrs // 注入配置中的默认属性
    })

    dndRef.current.start(node, e.nativeEvent as any)
  }

  return (
    <div className="flow-graph-wrapper">
      {/* 5. 动态渲染侧边栏 */}
      <div className="sidebar">
        {strategy.sidebarItems.map((item) => (
          <div
            key={item.type}
            className="sidebar-item"
            style={{ backgroundColor: item.color }}
            onMouseDown={(e) => startDrag(e, item)}
          >
            {item.label}
          </div>
        ))}
      </div>

      <div className="canvas-container" ref={containerRef} />
    </div>
  )
}

export default FlowGraph
```

### 为什么这样做更好？

1. **关注点分离 (Separation of Concerns)**：
   - `FlowGraph.tsx` 只关心如何让画布跑起来（渲染、拖拽、缩放）。
   - `strategies/*.ts` 只关心业务数据（这是什么节点？列表有什么？）。
2. **可扩展性 (Scalability)**：
   - 如果明天来了第 6 个 section，你只需要在 `strategies` 文件夹下加一个 `section6.ts` 并在 index 里注册一下。你**完全不需要**修改 `FlowGraph.tsx` 的任何一行代码（开闭原则）。
3. **内存与性能**：
   - React 的 Key 机制：如果你在父组件切换 `sectionKey` 时，给 `<FlowGraph key={sectionKey} />` 加了 key，React 会销毁旧实例并创建新实例，这保证了状态彻底重置。
   - 如果不想销毁重建，利用 `useEffect` 监听 `strategy` 的变化，只更新侧边栏和清空画布数据 (`graph.clearCells()`) 也是可以的，体验会更丝滑。

### 进阶提示：处理自定义 React 节点

如果这 5 个 section 的节点长得完全不一样（比如一个是流程图样式，一个是电路图样式）：

1. **Shape 命名空间**：在注册节点时，确保 shape 名字互不冲突，例如 `logic-rect` vs `physical-rect`。
2. **动态注册**：X6 的注册表是全局的。如果不同 section 有同名但逻辑不同的节点，你可能需要在切换时重新注册覆盖，或者一开始就用不同的名字注册所有可能的节点（推荐后者，一次性注册所有用到的自定义节点，反正不渲染就没有开销）。