import type { GraphStrategy } from './types'

const moduleResponsesStrategy: GraphStrategy = {
  sidebarItems: [
    { 
      type: 'state', 
      label: '状态', 
      shape: 'ellipse', 
      color: '#fcffe6',
      defaultAttrs: {
        attrs: {
          body: { fill: '#fcffe6', stroke: '#5c5c5c', strokeWidth: 1, rx: 0, ry: 0 },
          label: { fill: '#333' }
        },
        width: 100,
        height: 40
      }
    },
    { 
      type: 'action', 
      label: '动作响应', 
      shape: 'rect', 
      color: '#fff1b8',
      defaultAttrs: {
        attrs: {
          body: { fill: '#fff1b8', stroke: '#5c5c5c', strokeWidth: 1, rx: 4, ry: 4 },
          label: { fill: '#333' }
        },
        width: 100,
        height: 40
      }
    },
    { 
      type: 'event', 
      label: '触发事件', 
      shape: 'polygon', 
      color: '#ffccc7',
      defaultAttrs: {
        points: '0,30 50,0 100,30 50,60', // Rhombus points
        attrs: {
          body: { fill: '#ffccc7', stroke: '#5c5c5c', strokeWidth: 1 },
          label: { fill: '#333' }
        },
        width: 100,
        height: 60
      }
    },
  ]
}

export default moduleResponsesStrategy
