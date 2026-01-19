import React from 'react'
import { register } from '@antv/x6-react-shape'
import type { GraphStrategy } from './types'
import CallNode from '../../nodes/internalConstraints/CallNode'

const internalConstraintsStrategy: GraphStrategy = {
  sidebarItems: [
    { 
      type: 'call', 
      label: '计算函数', 
      shape: 'call-node', 
      color: '#e6f7ff',
      defaultAttrs: {
        width: 120,
        height: 60,
        data: {
            stroke: '#1890ff',
            fill: '#e6f7ff',
        }
      },
      render: (
        <CallNode 
          isStencil={true} 
          nodeName="计算函数" 
          fill="#e6f7ff" 
          stroke="#1890ff" 
        />
      )
    },
  ],
  registerNodes: () => {
    register({
        shape: 'call-node',
        width: 120,
        height: 60,
        component: CallNode,
    });
  }
}

export default internalConstraintsStrategy