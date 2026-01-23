import React from 'react'
import { register } from '@antv/x6-react-shape'
import type { GraphStrategy, FormConfig } from './types'
import Call from '../../nodes/internalConstraints/Call';
import Comment from '../../nodes/internalConstraints/Comment';
import Condition from '../../nodes/internalConstraints/Condition';
import Goto from '../../nodes/internalConstraints/Goto';
import Graph from '../../nodes/internalConstraints/Graph';
import Start from '../../nodes/internalConstraints/Start';
import Then from '../../nodes/internalConstraints/Then';
import State from '../../nodes/internalConstraints/State';
import TruthTable from '../../nodes/internalConstraints/TruthTable';

// 导入 Call 节点的自定义控件
import Params from '../../form-panel/controls/internalConstraints/Params'
import Script from '../../form-panel/controls/internalConstraints/Script'

// 表单配置
const formConfig: FormConfig = {
  // 边表单
  edge: {
    tabs: [
      {
        name: '数据',
        groups: [
          {
            controls: [
              { label: '边名称', name: 'edgeName', shape: 'InputText' },
              { label: '条件', name: 'condition', shape: 'InputText' },
              { label: '备注', name: 'comment', shape: 'InputText' },
            ],
          },
        ],
      },
    ],
  },

  // 节点表单（按 shape 映射）
  nodes: {
    'state-node': {
      schema: {
        tabs: [
          {
            name: '数据',
            groups: [
              {
                controls: [
                  { label: '节点名称', name: 'nodeName', shape: 'InputText' },
                  { label: '备注', name: 'comment', shape: 'InputText' },
                  { label: '后置思考时间', name: 'post_think_time', shape: 'InputNumber', extra: '秒' },
                  { label: '正向传播', name: 'forward_propagation', shape: 'Checkbox' },
                ],
              },
            ],
          },
          {
            name: '样式',
            groups: [
              {
                controls: [
                  { label: '边框颜色', name: 'stroke', shape: 'InputText' },
                  { label: '填充颜色', name: 'fill', shape: 'InputText' },
                ],
              },
            ],
          },
        ],
      },
    },

    'start-node': {
      schema: {
        tabs: [
          {
            name: '数据',
            groups: [
              {
                controls: [
                  { label: '节点名称', name: 'nodeName', shape: 'InputText' },
                ],
              },
            ],
          },
          {
            name: '样式',
            groups: [
              {
                controls: [
                  { label: '填充颜色', name: 'fill', shape: 'InputText' },
                ],
              },
            ],
          },
        ],
      },
    },

    'goto-node': {
      schema: {
        tabs: [
          {
            name: '数据',
            groups: [
              {
                controls: [
                  { label: '节点名称', name: 'nodeName', shape: 'InputText' },
                  { label: '备注', name: 'comment', shape: 'InputText' },
                  { label: '目标节点', name: 'targetNode', shape: 'InputText' },
                ],
              },
            ],
          },
          {
            name: '样式',
            groups: [
              {
                controls: [
                  { label: '边框颜色', name: 'stroke', shape: 'InputText' },
                  { label: '填充颜色', name: 'fill', shape: 'InputText' },
                ],
              },
            ],
          },
        ],
      },
    },

    'condition-node': {
      schema: {
        tabs: [
          {
            name: '数据',
            groups: [
              {
                controls: [
                  { label: '节点名称', name: 'nodeName', shape: 'InputText' },
                  { label: '条件表达式', name: 'expression', shape: 'InputText' },
                  { label: '备注', name: 'comment', shape: 'InputText' },
                ],
              },
            ],
          },
          {
            name: '样式',
            groups: [
              {
                controls: [
                  { label: '边框颜色', name: 'stroke', shape: 'InputText' },
                  { label: '填充颜色', name: 'fill', shape: 'InputText' },
                ],
              },
            ],
          },
        ],
      },
    },

    'call-node': {
      schema: {
        tabs: [
          {
            name: '数据',
            groups: [
              {
                controls: [
                  { label: '节点名称', name: 'nodeName', shape: 'InputText' },
                  { label: '备注', name: 'comment', shape: 'InputText' },
                  { label: '参数', name: 'params_list', shape: 'Params' },
                  { label: '脚本', name: 'script', shape: 'Script' },
                  { label: '启用逆向函数', name: 'enable_inverse', shape: 'Checkbox' },
                ],
              },
            ],
          },
          {
            name: '样式',
            groups: [
              {
                controls: [
                  { label: '边框颜色', name: 'stroke', shape: 'InputText' },
                  { label: '填充颜色', name: 'fill', shape: 'InputText' },
                ],
              },
            ],
          },
        ],
      },
      // 注册自定义控件
      controlMap: {
        'Params': Params,
        'Script': Script,
      },
    },

    'comment-node': {
      schema: {
        tabs: [
          {
            name: '数据',
            groups: [
              {
                controls: [
                  { label: '注释内容', name: 'comment', shape: 'InputText' },
                ],
              },
            ],
          },
          {
            name: '样式',
            groups: [
              {
                controls: [
                  { label: '边框颜色', name: 'stroke', shape: 'InputText' },
                  { label: '填充颜色', name: 'fill', shape: 'InputText' },
                ],
              },
            ],
          },
        ],
      },
    },

    'graph-node': {
      schema: {
        tabs: [
          {
            name: '数据',
            groups: [
              {
                controls: [
                  { label: '节点名称', name: 'nodeName', shape: 'InputText' },
                  { label: '引用图', name: 'refGraph', shape: 'InputText' },
                  { label: '备注', name: 'comment', shape: 'InputText' },
                ],
              },
            ],
          },
          {
            name: '样式',
            groups: [
              {
                controls: [
                  { label: '边框颜色', name: 'stroke', shape: 'InputText' },
                  { label: '填充颜色', name: 'fill', shape: 'InputText' },
                ],
              },
            ],
          },
        ],
      },
    },

    'then-node': {
      schema: {
        tabs: [
          {
            name: '数据',
            groups: [
              {
                controls: [
                  { label: '节点名称', name: 'nodeName', shape: 'InputText' },
                ],
              },
            ],
          },
          {
            name: '样式',
            groups: [
              {
                controls: [
                  { label: '边框颜色', name: 'stroke', shape: 'InputText' },
                  { label: '填充颜色', name: 'fill', shape: 'InputText' },
                ],
              },
            ],
          },
        ],
      },
    },

    'truth-node': {
      schema: {
        tabs: [
          {
            name: '数据',
            groups: [
              {
                controls: [
                  { label: '节点名称', name: 'nodeName', shape: 'InputText' },
                  { label: '真值表', name: 'truthTable', shape: 'InputText' },
                  { label: '备注', name: 'comment', shape: 'InputText' },
                ],
              },
            ],
          },
          {
            name: '样式',
            groups: [
              {
                controls: [
                  { label: '边框颜色', name: 'stroke', shape: 'InputText' },
                  { label: '填充颜色', name: 'fill', shape: 'InputText' },
                ],
              },
            ],
          },
        ],
      },
    },
  },
}

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
          fill: '#686666',
        }
      },
    },
    {
      type: 'state',
      label: 'state',
      shape: 'state-node',
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
      type: 'then',
      label: 'then',
      shape: 'then-node',
      color: '#e6f7ff',
      defaultAttrs: {
        data: {
          stroke: '#333',
          fill: '#fff',
        }
      },
    },
    {
      type: 'truth-table',
      label: 'truth table',
      shape: 'truth-node',
      color: '#e6f7ff',
      defaultAttrs: {
        width: 120,
        height: 60,
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
    register({
      shape: 'start-node',
      width: 30,
      height: 30,
      component: Start,
    });
    register({
      shape: 'state-node',
      width: 120,
      height: 80,
      component: State,
    });
    register({
      shape: 'then-node',
      width: 30,
      height: 30,
      component: Then,
    });
    register({
      shape: 'truth-node',
      width: 120,
      height: 60,
      component: TruthTable,
    });
  },
  // 表单配置
  formConfig,
}

export default internalConstraintsStrategy
