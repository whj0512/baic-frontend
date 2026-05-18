/**
 * 时序图（Sequence Diagram）共享配置
 *
 * 外部顺序图 (ESD / interaction) 和 内部顺序图 (ISD / moduleResponses)
 * 共用相同的节点注册、侧边栏组件、表单配置和画布布局，
 * 将这些公共部分提取到此文件以避免代码冗余。
 */
import { register } from '@antv/x6-react-shape'
import type { FormConfig, SidebarItem } from './types'
import ObjectNode from '../../nodes/interaction/BaseObject'
import CombinedFragmentNode from '../../nodes/interaction/CombinedFragment'
import Params from '../../form-panel/controls/interaction/Params'
import Conditions from '../../form-panel/controls/interaction/Conditions'

/** 注册时序图节点（多次调用安全） */
export const registerSequenceNodes = () => {
  register({
    shape: 'seq-object-node',
    component: ObjectNode,
  })
  register({
    shape: 'seq-fragment-node',
    component: CombinedFragmentNode,
  })
}

/** 时序图侧边栏组件列表 */
export const sequenceSidebarItems: SidebarItem[] = [
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
    type: 'seq-fragment',
    label: '组合片段',
    shape: 'seq-fragment-node',
    color: '#ffffffff',
    defaultAttrs: {
      width: 200,
      height: 120,
    }
  },
]

/** 时序图表单配置 */
export const sequenceFormConfig: FormConfig = {
  edge: {
    tabs: [
      {
        name: '数据',
        groups: [
          {
            title: '基础信息',
            controls: [
              { label: '交互名称', name: 'name', shape: 'InputText' },
              { label: '消息', name: 'message', shape: 'InputText' },
              { label: '参数', name: 'params', shape: 'Params' },
              {
                label: '构造型',
                name: 'stereotype',
                shape: 'Select',
                options: [
                  { value: 'base', label: 'base' },
                  { value: 'create', label: 'create' },
                  { value: 'destroy', label: 'destroy' },
                  { value: 'reply', label: 'reply' },
                  { value: 'return', label: 'return' },
                ]
              },
              { label: '返回类型', name: 'returnType', shape: 'InputText' },
              {
                label: '消息类型',
                name: 'msgType',
                shape: 'Select',
                options: [
                  { value: 'sync', label: '同步' },
                  { value: 'async', label: '异步' }
                ]
              },
              { label: '返回消息', name: 'isReturn', shape: 'Checkbox' }
            ]
          }
        ]
      }
    ],
    controlMap: {
      'Params': Params,
    }
  },
  nodes: {
    'seq-object-node': {
      schema: {
        tabs: [
          {
            name: '数据',
            groups: [
              {
                controls: [
                  { label: '对象名', name: 'objectName', shape: 'InputText' },
                  { label: '类名', name: 'className', shape: 'InputText' },
                  {
                    label: '类型',
                    name: 'type',
                    shape: 'Select',
                    options: [
                      { value: 'device', label: 'device' },
                      { value: 'control-unit', label: 'control-unit' },
                      { value: 'controller', label: 'controller' },
                      { value: 'functional-module', label: 'functional-module' },
                      { value: 'machine', label: 'machine' },
                    ]
                  }
                ]
              }
            ]
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
        ]
      }
    },
    'seq-actor-node': {
      schema: {
        tabs: [
          {
            name: '数据',
            groups: [
              {
                controls: [
                  { label: '参与者名', name: 'actorName', shape: 'InputText' },
                ]
              }
            ]
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
        ]
      }
    },
    'seq-fragment-node': {
      schema: {
        tabs: [
          {
            name: '数据',
            groups: [
              {
                controls: [
                  {
                    label: '片段类型',
                    name: 'fragmentType',
                    shape: 'Select',
                    options: [
                      { value: 'alt', label: 'alt' },
                      { value: 'opt', label: 'opt' },
                      { value: 'loop', label: 'loop' },
                      { value: 'par', label: 'par' },
                      { value: 'seq', label: 'seq' },
                    ]
                  },
                  {
                    label: '片段名称',
                    name: 'fragmentName',
                    shape: 'InputText'
                  },
                  {
                    label: '条件',
                    name: 'conditions',
                    shape: 'Conditions'
                  }
                ]
              }
            ]
          }
        ]
      },
      controlMap: {
        'Conditions': Conditions
      }
    }
  }
}

/** 时序图 Stencil 布局配置 */
export const sequenceStencilLayoutOptions = {
  columns: 1,
  columnWidth: 200,
  rowHeight: 300,
  center: true,
  resizeToFit: false,
  marginX: 0,
  marginY: 0,
}

export const sequenceStencilGraphWidth = 220
export const sequenceStencilGraphHeight = 1000
export const sequenceStencilGraphPadding = 5
