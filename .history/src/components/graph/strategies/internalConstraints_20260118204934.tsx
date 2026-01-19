import React from 'react'
import { register } from '@antv/x6-react-shape'
import type { GraphStrategy } from './types'
import Call from '../../nodes/internalConstraints/Call';
import Comment from '../../nodes/internalConstraints/Comment';
import Condition from '../../nodes/internalConstraints/Condition';
import Goto from '../../nodes/internalConstraints/Goto';
import Graph from '../../nodes/internalConstraints/Graph';

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
          stroke: '#333',
          fill: '#fff',
        }
      },
    },
    {
      type: 'goto',
      label: 'goto',
      shape: 'goto-node',
      color: '#e6f7ff',
      defaultAttrs: {
        width: 120,
        height: 60,
        data: {
          stroke: '#333',
          fill: '#fff',
        }
      },
    },
    {
      type: 'graph',
      label: 'graph',
      shape: 'graph-node',
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
      type: 'start',
      label: 'start',
      shape: 'start-node',
      color: '#e6f7ff',
      defaultAttrs: {
        data: {
          stroke: '#333',
          fill: '#fff',
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
          bottom: {
            position: { name: 'bottom' },
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
        },
        items: [
          { id: 'port-top', group: 'top' },
          { id: 'port-yes', group: 'yes' },
          { id: 'port-no', group: 'no' },
          { id: 'port-bottom', group: 'bottom' },
        ],
      },
    });
    register({
        shape: 'goto-node',
        width: 120,
        height: 60,
        component: Goto
    });
    register({
      shape: 'graph-node',
      width: 120,
      height: 60,
      component: Graph,
    });
  }
}

export default internalConstraintsStrategy