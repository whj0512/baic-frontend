import { register } from '@antv/x6-react-shape'
import type { Edge } from '@antv/x6'
import type { FormConfig, GraphStrategy } from './types'
import Start from '../../nodes/internalConstraints/Start'
import Page from '../../nodes/dialogMap/Page'
import DialogMapEdgeTrigger from '../form-panel/controls/dialogMap/DialogMapEdgeTrigger'
import DialogMapWidgets from '../form-panel/controls/dialogMap/DialogMapWidgets'
import DialogMapDataCarried from '../form-panel/controls/dialogMap/DialogMapDataCarried'
import DialogMapTriggerType from '../form-panel/controls/dialogMap/DialogMapTriggerType'

const basePortStyle = {
  r: 4,
  magnet: true,
  stroke: '#2563eb',
  fill: '#fff',
  strokeWidth: 1,
}

const formConfig: FormConfig = {
  canvas: {
    tabs: [
      {
        name: '数据',
        groups: [
          {
            title: '基础信息',
            controls: [
              { label: 'DialogMap 名称', name: 'name', shape: 'InputText' },
              { label: '描述', name: 'desc', shape: 'InputText' },
            ],
          },
        ],
      },
    ],
  },
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
              {
                label: '触发组件',
                name: 'trigger',
                shape: 'DialogMapEdgeTrigger',
                hidden: true,
                dependencies: [{ name: 'trigger_type', condition: 'click', hidden: false }],
              },
              {
                label: '触发类型',
                name: 'trigger_type',
                shape: 'DialogMapTriggerType',
              },
              { label: '条件', name: 'condition', shape: 'InputText' },
              { label: '携带数据', name: 'data_carried', shape: 'DialogMapDataCarried' },
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
      'DialogMapTriggerType': DialogMapTriggerType,
      'DialogMapDataCarried': DialogMapDataCarried,
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
  },
}

const createUniqueName = (usedNames: Set<string>, prefix: string) => {
  let index = 1
  while (usedNames.has(`${prefix}_${index}`)) index += 1
  return `${prefix}_${index}`
}

const ensureDialogMapEntry: GraphStrategy['ensureRequiredNodes'] = graph => {
  if (graph.getNodes().some(node => node.shape === 'start-node')) return

  graph.addNode({
    shape: 'start-node',
    x: 80,
    y: 80,
    width: 30,
    height: 30,
    data: {
      nodeName: 'Start',
      stroke: '#333',
      fill: '#686666',
    },
  })
}

const dialogMapStrategy: GraphStrategy = {
  ensureRequiredNodes: ensureDialogMapEntry,
  initializeNode: (node, graph) => {
    if (node.shape !== 'page-node') return
    const data = node.getData() || {}
    if (data.nodeName && data.nodeName !== 'page') return
    const usedNames = new Set(
      graph.getNodes()
        .filter(candidate => candidate.id !== node.id)
        .map(candidate => String(candidate.getData()?.nodeName || '').trim())
        .filter(Boolean),
    )
    node.setData({ ...data, nodeName: createUniqueName(usedNames, 'Page') })
  },
  finalizeEdgeData: (edgeData, source, _target, graph) => {
    const usedNames = new Set(
      graph.getEdges()
        .map(edge => String(edge.getData()?.edgeName || '').trim())
        .filter(Boolean),
    )
    const edgeName = String(edgeData.edgeName || '').trim()
      || createUniqueName(usedNames, 'Transition')
    if (source.shape === 'start-node') {
      return { ...edgeData, edgeName, trigger: '', trigger_type: 'auto' }
    }
    return {
      ...edgeData,
      edgeName,
      trigger_type: edgeData.trigger_type === 'auto' ? 'auto' : 'click',
      ...(edgeData.trigger_type === 'auto' ? { trigger: '' } : {}),
    }
  },
  canRemoveCell: cell => cell.shape !== 'start-node',
  canCopyCell: cell => {
    if (cell.shape === 'start-node') return false
    if (!cell.isEdge()) return true
    return (cell as Edge).getSourceCell()?.shape !== 'start-node'
  },
  getDefaultEdgeData: () => ({
    trigger: '',
    trigger_type: 'click',
    condition: '',
    data_carried: [],
  }),
  preConnectionRules: {
    maxDistance: 200,
    canUseSource: () => true,
    canUseTarget: node => node.shape !== 'start-node',
  },
  sidebarItems: [
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
    getPortGroups: (nodeShape: string) => {
      const inPortGroup = {
        in: {
          position: 'top',
          attrs: { circle: { ...basePortStyle } },
        },
      }

      return {
        ...inPortGroup,
        out: {
          position: 'bottom',
          attrs: { circle: { ...basePortStyle } },
        },
      }
    },
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
  stencilGraphHeight: 120,
  stencilGraphPadding: 10,
}

export default dialogMapStrategy
