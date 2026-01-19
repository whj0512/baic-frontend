import type { GraphStrategy } from './types'

const internalCompositionStrategy: GraphStrategy = {
  sidebarItems: [
    { 
      type: 'module', 
      label: '子模块', 
      shape: 'rect', 
      color: '#f9f0ff',
      defaultAttrs: {
        attrs: {
          body: { fill: '#f9f0ff', stroke: '#5c5c5c', strokeWidth: 1, rx: 4, ry: 4 },
          label: { fill: '#333' }
        },
        width: 100,
        height: 40
      }
    },
    { 
      type: 'component', 
      label: '组件', 
      shape: 'rect', 
      color: '#e6fffb',
      defaultAttrs: {
        attrs: {
          body: { fill: '#e6fffb', stroke: '#5c5c5c', strokeWidth: 1, rx: 4, ry: 4 },
          label: { fill: '#333' }
        },
        width: 100,
        height: 40
      }
    },
    { 
      type: 'interface', 
      label: '接口', 
      shape: 'ellipse', 
      color: '#fff2e8',
      defaultAttrs: {
        attrs: {
          body: { fill: '#fff2e8', stroke: '#5c5c5c', strokeWidth: 1, rx: 0, ry: 0 },
          label: { fill: '#333' }
        },
        width: 100,
        height: 40
      }
    },
  ]
}

export default internalCompositionStrategy
