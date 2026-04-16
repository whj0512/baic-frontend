import { register } from '@antv/x6-react-shape'
import type { FormConfig, GraphStrategy } from './types'
import Machine from '../../nodes/internalComposition/Machine'
import FunctionalModule from '../../nodes/internalComposition/FunctionalModule'
import Controller from '../../nodes/internalComposition/Controller'

const formConfig: FormConfig = {
  nodes: {
    'machine-node': {
      schema: {
        tabs: [
          {
            name: '数据',
            groups: [
              {
                controls: [
                  { label: '机器名', name: 'nodeName', shape: 'InputText' },
                  { label: '需求ID', name: 'requirementID', shape: 'InputText' }
                ]
              },
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
      },
    },
    'controller-node': {
      schema: {
        tabs: [
          {
            name: '数据',
            groups: [
              {
                controls: [
                  { label: '控制器名', name: 'nodeName', shape: 'InputText' },
                  { label: '需求ID', name: 'requirementID', shape: 'InputText' }
                ]
              },
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
      },
    },
    'functional-module-node': {
      schema: {
        tabs: [
          {
            name: '数据',
            groups: [
              {
                controls: [
                  { label: '功能模块名', name: 'nodeName', shape: 'InputText' },
                  { label: '需求ID', name: 'requirementID', shape: 'InputText' }
                ]
              },
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
      },
    },
  }
}

const internalCompositionStrategy: GraphStrategy = {
  formConfig: formConfig,
  defaultSourceMarker: {
    name: 'circlePlus',
    r: 4,
    fill: '#fff'
  },
  defaultEdgeMarker: null,
  sidebarItems: [
    {
      type: 'controller',
      label: 'Controller',
      shape: 'controller-node',
      color: '#ffffffff',
      defaultAttrs: {
        width: 120,
        height: 60,
        stroke: '#333',
        fill: '#fff'
      }
    },
    {
      type: 'functional-module',
      label: 'Functional Module',
      shape: 'functional-module-node',
      color: '#ffffffff',
      defaultAttrs: {
        width: 120,
        height: 60,
        stroke: '#333',
        fill: '#fff'
      }
    },
    {
      type: 'machine',
      label: 'Machine',
      shape: 'machine-node',
      color: '#ffffffff',
      defaultAttrs: {
        width: 120,
        height: 60,
        stroke: '#333',
        fill: '#fff'
      }
    },
  ],
  registerNodes: () => {
    register({
      shape: 'machine-node',
      component: Machine
    })
    register({
      shape: 'functional-module-node',
      component: FunctionalModule
    })
    register({
      shape: 'controller-node',
      component: Controller
    })
  }
}

export default internalCompositionStrategy
