import { register } from '@antv/x6-react-shape'
import type { FormConfig, GraphStrategy } from './types'
import { ensureInternalConstraintsRequiredNodes } from './internalConstraintsRequiredNodes'
import Start from '../../nodes/internalConstraints/Start'
import Page from '../../nodes/dialogMap/Page'

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
  preConnectionRules: {
    maxDistance: 200,
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
      color: '#eff6ff',
      tooltip: 'UI页面',
      defaultAttrs: {
        width: 120,
        height: 80,
        data: {
          stroke: '#333',
          fill: '#eff6ff',
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
  },
  formConfig,
  edgeRules: {
    getPortGroups: () => ({
      in: {
        position: 'top',
        attrs: { circle: { ...basePortStyle } },
      },
      out: {
        position: 'bottom',
        attrs: { circle: { ...basePortStyle } },
      },
    }),
    getInitialPorts: () => [],
    supportsMultiplePorts: () => true,
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
  stencilGraphHeight: 220,
  stencilGraphPadding: 10,
}

export default dialogMapStrategy
