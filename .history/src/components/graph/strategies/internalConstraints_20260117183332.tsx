import React from 'react'
import { register } from '@antv/x6-react-shape'
import type { GraphStrategy } from './types'
import Call from '../../nodes/internalConstraints/Call';

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
    },
    { 
      type: 'comment', 
      label: '注释', 
      shape: 'comment-node', 
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
        <Comment
          isStencil={true} 
          nodeName="注释" 
          fill="#e6f7ff" 
          stroke="#1890ff" 
        />
      )
    },
  ],
  registerNodes: () => {
    register({
        shape: 'comment-node',
        width: 120,
        height: 60,
        component: Call,
    });
  }
}

export default internalConstraintsStrategy