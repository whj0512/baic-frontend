import { register } from '@antv/x6-react-shape'
import type { FormConfig, GraphStrategy } from './types'
import { ensureInternalConstraintsRequiredNodes } from './internalConstraintsRequiredNodes'
import Start from '../../nodes/internalConstraints/Start'
import Page from '../../nodes/dialogMap/Page'
import End from '../../nodes/dialogMap/End'
import DialogMapEdgeTrigger from '../form-panel/controls/dialogMap/DialogMapEdgeTrigger'
import DialogMapWidgets from '../form-panel/controls/dialogMap/DialogMapWidgets'

const basePortStyle = {
  r: 4,
  magnet: true,
  stroke: '#2563eb',
  fill: '#fff',
  strokeWidth: 1,
}

const formConfig: FormConfig = {
  edge: {
    tabs: [
      {
        name: '数据',
        groups: [
          {
            title: '基础信息',
            controls: [
              { label: '跳转名称', name: 'edgeName', shape: 'InputText' },
              { label: '备注', name: 'comment', shape: 'InputText' },
            ],
          },
          {
            title: '触发配置',
            controls: [
              { label: '触发组件', name: 'trigger', shape: 'DialogMapEdgeTrigger' },
              {
                label: '触发类型',
                name: 'trigger_type',
                shape: 'Select',
                options: [
                  { label: 'click', value: 'click' },
                  { label: 'auto', value: 'auto' },
                ],
              },
              { label: '条件', name: 'condition', shape: 'InputText' },
            ],
          },
        ],
      },
      {
        name: '样式',
        groups: [
          {
            controls: [
              { label: '线条颜色', name: 'stroke', shape: 'InputText' },
              { label: '线条宽度', name: 'strokeWidth', shape: 'InputNumber' },
            ],
          },
        ],
      },
    ],
    controlMap: {
      'DialogMapEdgeTrigger': DialogMapEdgeTrigger,
    },
  },
  nodes: {
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
    'page-node': {
      schema: {
        tabs: [
          {
            name: '数据',
            groups: [
              {
                controls: [
                  { label: '页面名称', name: 'nodeName', shape: 'InputText' },
                  { label: '备注', name: 'comment', shape: 'InputText' },
                ],
              },
              {
                title: '页面组件',
                controls: [
                  { label: '组件', name: 'widgets', shape: 'DialogMapWidgets' },
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
      controlMap: {
        'DialogMapWidgets': DialogMapWidgets,
      },
    },
    'end-node': {
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
  },
}

const dialogMapStrategy: GraphStrategy = {
  ensureRequiredNodes: ensureInternalConstraintsRequiredNodes,
  getDefaultEdgeData: () => ({
    trigger: '',
    trigger_type: 'click',
    condition: '',
    data_carried: [],
  }),
  preConnectionRules: {
    maxDistance: 200,
    canUseSource: node => node.shape !== 'end-node',
    canUseTarget: node => node.shape !== 'start-node',
  },
  sidebarItems: [
    {
      type: 'start',
      label: 'start',
      shape: 'start-node',
      color: '#e6f7ff',
      tooltip: '会话图起点',
      defaultAttrs: {
        data: {
          stroke: '#333',
          fill: '#686666',
        },
      },
    },
    {
      type: 'page',
      label: 'page',
      shape: 'page-node',
      color: '#f3f4f6',
      tooltip: 'UI页面',
      defaultAttrs: {
        width: 120,
        height: 80,
        data: {
          stroke: '#333',
          fill: '#f3f4f6',
          widgets: [],
        },
      },
    },
    {
      type: 'end',
      label: 'end',
      shape: 'end-node',
      color: '#f3f4f6',
      tooltip: '会话图结束节点',
      defaultAttrs: {
        width: 30,
        height: 30,
        data: {
          nodeName: 'End',
          stroke: '#111',
          fill: '#000',
        },
      },
    },
  ],
  registerNodes: () => {
    register({
      shape: 'start-node',
      width: 30,
      height: 30,
      component: Start,
    })
    register({
      shape: 'page-node',
      width: 120,
      height: 80,
      component: Page,
    })
    register({
      shape: 'end-node',
      width: 30,
      height: 30,
      component: End,
    })
  },
  formConfig,
  edgeRules: {
    getPortGroups: (nodeShape: string) => {
      const inPortGroup = {
        in: {
          position: 'top',
          attrs: { circle: { ...basePortStyle } },
        },
      }

      if (nodeShape === 'end-node') {
        return inPortGroup
      }

      return {
        ...inPortGroup,
        out: {
          position: 'bottom',
          attrs: { circle: { ...basePortStyle } },
        },
      }
    },
    getInitialPorts: (nodeShape: string) => nodeShape === 'end-node' ? [{ id: 'in-0', group: 'in' }] : [],
    supportsMultiplePorts: (nodeShape: string) => nodeShape !== 'end-node',
    hasMultipleOutputs: () => false,
    getOutputOptions: () => [],
  },
  stencilLayoutOptions: {
    columns: 1,
    columnWidth: 160,
    rowHeight: 100,
    center: true,
    resizeToFit: false,
    marginX: 0,
    marginY: 0,
  },
  stencilGraphWidth: 180,
  stencilGraphHeight: 320,
  stencilGraphPadding: 10,
}

export default dialogMapStrategy
