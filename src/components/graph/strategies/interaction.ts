import type { GraphStrategy } from './types'

const interactionStrategy: GraphStrategy = {
  sidebarItems: [
    { 
      type: 'user', 
      label: '用户/角色', 
      shape: 'ellipse', 
      color: '#fff0f6',
      defaultAttrs: {
        attrs: {
          body: { fill: '#fff0f6', stroke: '#5c5c5c', strokeWidth: 1, rx: 0, ry: 0 },
          label: { fill: '#333' }
        },
        width: 100,
        height: 40
      }
    },
    { 
      type: 'system', 
      label: '外部系统', 
      shape: 'rect', 
      color: '#e6f7ff',
      defaultAttrs: {
        attrs: {
          body: { fill: '#e6f7ff', stroke: '#5c5c5c', strokeWidth: 1, rx: 4, ry: 4 },
          label: { fill: '#333' }
        },
        width: 100,
        height: 40
      }
    },
    { 
      type: 'process', 
      label: '交互过程', 
      shape: 'rect', 
      color: '#fffbe6',
      defaultAttrs: {
        attrs: {
          body: { fill: '#fffbe6', stroke: '#5c5c5c', strokeWidth: 1, rx: 4, ry: 4 },
          label: { fill: '#333' }
        },
        width: 100,
        height: 40
      }
    },
  ]
}

export default interactionStrategy
