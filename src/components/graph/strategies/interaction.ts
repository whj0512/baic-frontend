import { register } from '@antv/x6-react-shape'
import type { GraphStrategy } from './types'
import LifelineNode from '../../nodes/interaction/NodeWrapper'

const interactionStrategy: GraphStrategy = {
  stencilLayoutOptions: {
    columns: 1,
    columnWidth: 'auto',
    rowHeight: 'auto',
    center: true,
    resizeToFit: true,
    marginX: 5,
    marginY: 5,
  },
  stencilGraphWidth: 160,
  stencilGraphHeight: 1000,
  stencilGraphPadding: 5,
  sidebarItems: [
    {
      type: 'seq-lifeline',
      label: '生命线',
      shape: 'seq-lifeline-node',
      color: '#ffffffff',
      defaultAttrs: {
        width: 120,
        height: 300,
        stroke: '#030404ff',
        fill: '#fff',
      }
    },
  ],
  registerNodes: () => {
    register({
      shape: 'seq-lifeline-node',
      component: LifelineNode,
    })
  },
}

export default interactionStrategy
