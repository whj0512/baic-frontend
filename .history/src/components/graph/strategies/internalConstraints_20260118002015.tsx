import React from 'react'
import { register } from '@antv/x6-react-shape'
import type { GraphStrategy } from './types'
import Call from '../../nodes/internalConstraints/Call';
import Comment from '../../nodes/internalConstraints/Comment';
import Condition from '../../nodes/internalConstraints/Condition';

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
    {
      type: 'condition',
      label: 'condition',
      shape: 'condition-node',
      color: '#e6f7ff',
      defaultAttrs: {
        width: 120,
        height: 80,
        data: {
          stroke: '#1890ff',
          fill: '#e6f7ff',
        }
      },
    }
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
    });
    register({
      shape: 'condition-node',
      width: 120,
      height: 80,
      component: Condition,
      // 定义端口
      ports: {
        groups: {
          top: {
            position: { name: 'top' },
            attrs: {
              circle: {
                r: 4,
                magnet: true,
                stroke: '#333',
                strokeWidth: 1,
                fill: '#fff',
              },
            },
          },
          yes: {
            position: { name: 'right' },
            attrs: {
              circle: {
                r: 4,
                magnet: true,
                stroke: '#52c41a',
                strokeWidth: 2,
                fill: '#fff',
              },
            },
            label: {
              position: { name: 'right', args: { offset: 8 } },
            },
          },
          no: {
            position: { name: 'left' },
            attrs: {
              circle: {
                r: 4,
                magnet: true,
                stroke: '#ff4d4f',
                strokeWidth: 2,
                fill: '#fff',
              },
            },
            label: {
              position: { name: 'left', args: { offset: 8 } },
            },
          },
        },
        items: [
          { id: 'port-top', group: 'top' },
          { id: 'port-yes', group: 'yes' },
          { id: 'port-no', group: 'no' },
        ],
      },
    });
  }
}

export default internalConstraintsStrategy