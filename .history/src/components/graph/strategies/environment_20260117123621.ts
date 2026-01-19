import { GraphStrategy } from './types'

const environmentStrategy: GraphStrategy = {
  sidebarItems: [
    { 
      type: 'physical', 
      label: '物理实体', 
      shape: 'rect', 
      color: '#eff4ff',
      defaultAttrs: {
        attrs: {
          body: { fill: '#eff4ff', stroke: '#5c5c5c', strokeWidth: 1, rx: 4, ry: 4 },
          label: { fill: '#333' }
        },
        width: 100,
        height: 40
      }
    },
    { 
      type: 'logical', 
      label: '逻辑实体', 
      shape: 'rect', 
      color: '#fff7e6',
      defaultAttrs: {
        attrs: {
          body: { fill: '#fff7e6', stroke: '#5c5c5c', strokeWidth: 1, rx: 4, ry: 4 },
          label: { fill: '#333' }
        },
        width: 100,
        height: 40
      }
    },
    { 
      type: 'env-factor', 
      label: '环境因素', 
      shape: 'ellipse', 
      color: '#f6ffed',
      defaultAttrs: {
        attrs: {
          body: { fill: '#f6ffed', stroke: '#5c5c5c', strokeWidth: 1, rx: 0, ry: 0 },
          label: { fill: '#333' }
        },
        width: 100,
        height: 40
      }
    },
  ]
}

export default environmentStrategy
