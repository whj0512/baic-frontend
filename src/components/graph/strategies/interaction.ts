import { register } from '@antv/x6-react-shape'
import type { GraphStrategy } from './types'
import ObjectNode from '../../nodes/interaction/BaseObject'
import ActorNode from '../../nodes/interaction/Actor'
import ActivationBoxNode from '../../nodes/interaction/ActivationBox'
import CombinedFragmentNode from '../../nodes/interaction/CombinedFragment'

const interactionStrategy: GraphStrategy = {
  stencilLayoutOptions: {
    columns: 1,
    columnWidth: 200,
    rowHeight: 300,
    center: true,
    resizeToFit: false,
    marginX: 0,
    marginY: 0,
  },
  stencilGraphWidth: 220,
  stencilGraphHeight: 1000,
  stencilGraphPadding: 5,
  sidebarItems: [
    {
      type: 'seq-object',
      label: '对象',
      shape: 'seq-object-node',
      color: '#ffffffff',
      defaultAttrs: {
        width: 120,
        height: 300,
        stroke: '#030404ff',
        fill: '#fff',
      }
    },
    {
      type: 'seq-actor',
      label: '参与者',
      shape: 'seq-actor-node',
      color: '#ffffffff',
      defaultAttrs: {
        width: 120,
        height: 300,
      }
    },
    // {
    //   type: 'seq-activation',
    //   label: '激活框',
    //   shape: 'seq-activation-node',
    //   color: '#ffffffff',
    //   defaultAttrs: {
    //     width: 16,
    //     height: 80,
    //   }
    // },
    {
      type: 'seq-fragment',
      label: '组合片段',
      shape: 'seq-fragment-node',
      color: '#ffffffff',
      defaultAttrs: {
        width: 200,
        height: 120,
      }
    },
  ],
  registerNodes: () => {
    register({
      shape: 'seq-object-node',
      component: ObjectNode,
    })
    register({
      shape: 'seq-actor-node',
      component: ActorNode,
    })
    register({
      shape: 'seq-activation-node',
      component: ActivationBoxNode,
    })
    register({
      shape: 'seq-fragment-node',
      component: CombinedFragmentNode,
    })
  },
  // 时序图不使用 port 连线，edge 直接连接节点（锚点在生命线虚线上）
}

export default interactionStrategy
