import React from 'react'
import { register } from '@antv/x6-react-shape'
import type { GraphStrategy } from './types'
import Call from '../../nodes/internalConstraints/Call';
import Comment from '../../nodes/internalConstraints/Comment';

const internalConstraintsStrategy: GraphStrategy = {
  sidebarItems: [
    {
      type: 'call',
      label: 'call',
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
      label: 'comment',
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
    },
  ],
  registerNodes: () => {
    register({
      shape: 'call-node',
      width: 120,
      height: 60,
      component: Call,
    });
    register({
      shape: 'comment-node',
      width: 120,
      height: 60,
      component: Comment
    })
  }
}

export default internalConstraintsStrategy