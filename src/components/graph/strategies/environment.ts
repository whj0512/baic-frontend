import { register } from '@antv/x6-react-shape'
import type { FormConfig, GraphStrategy } from './types'
import Device from '../../nodes/environment/Device'
import Controller from '../../nodes/environment/Controller'
import Human from '../../nodes/environment/Human'
import FunctionalModule from '../../nodes/environment/FunctionalModule'
import ControllerUnit from '../../nodes/environment/ControllerUnit'
import Machine from '../../nodes/environment/Machine'
import ControllerTimer from '../../form-panel/controls/environment/ControllerTimer'
import NodePorts from '../../form-panel/controls/environment/NodePorts'
import EdgeConnect from '../../form-panel/controls/environment/EdgeConnect'

const formConfig: FormConfig = {
  edge: {
    tabs: [
      {
        name: '数据',
        groups: [
          {
            controls: [
              { label: '连接', name: 'connect', shape: 'EdgeConnect' },
            ]
          }
        ]
      }
    ],
    controlMap: {
      'EdgeConnect': EdgeConnect
    }
  },
  nodes: {
    'device-node': {
      schema: {
        tabs: [
          {
            name: '数据',
            groups: [
              {
                controls: [
                  { label: '设备名', name: 'deviceName', shape: 'InputText' },
                  { label: '端口信息', name: 'ports', shape: 'NodePorts' },
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
      controlMap: {
        'NodePorts': NodePorts
      }
    },
    'controller-unit-node': {
      schema: {
        tabs: [
          {
            name: '数据',
            groups: [
              {
                controls: [
                  { label: '控制单元名', name: 'ctrlUnitName', shape: 'InputText' },
                  { label: '控制单元计时器', name: 'ctrlUnitTimer', shape: 'ControllerTimer' },
                  { label: '控制单元控制周期', name: 'ctrlUnitPeriod', shape: 'InputNumber' },
                  { label: '端口信息', name: 'ports', shape: 'NodePorts' },
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
      controlMap: {
        'ControllerTimer': ControllerTimer,
        'NodePorts': NodePorts
      }
    },
    'machine-node': {
      schema: {
        tabs: [
          {
            name: '数据',
            groups: [
              {
                controls: [
                  { label: '机器名', name: 'machineName', shape: 'InputText' },
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
                  { label: '控制器名', name: 'ctrlName', shape: 'InputText' },
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
                  { label: '功能模块名', name: 'fmName', shape: 'InputText' },
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

const environmentStrategy: GraphStrategy = {
  stencilLayoutOptions: {
    columns: 1,
    columnWidth: 120,
    rowHeight: 160,
    center: true,
    resizeToFit: false,
    marginX: 5,
    marginY: 5,
  },
  stencilGraphWidth: 120,
  stencilGraphHeight: 1000,
  stencilGraphPadding: 5,
  sidebarItems: [
    {
      type: 'device',
      label: 'Device',
      shape: 'device-node',
      color: '#ffffffff',
      defaultAttrs: {
        width: 80,
        height: 120,
        stroke: '#333',
        fill: '#fff'
      }
    },
    {
      type: 'controller',
      label: 'Controller',
      shape: 'controller-node',
      color: '#ffffffff',
      defaultAttrs: {
        width: 80,
        height: 120,
        stroke: '#333',
        fill: '#fff'
      }
    },
    {
      type: 'human',
      label: 'Human',
      shape: 'human-node',
      color: '#ffffffff',
      defaultAttrs: {
        width: 80,
        height: 120,
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
        width: 80,
        height: 120,
        stroke: '#333',
        fill: '#fff'
      }
    },
    {
      type: 'controller-unit',
      label: 'Controller Unit',
      shape: 'controller-unit-node',
      color: '#ffffffff',
      defaultAttrs: {
        width: 80,
        height: 120,
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
        width: 80,
        height: 120,
        stroke: '#333',
        fill: '#fff'
      }
    }
  ],
  registerNodes: () => {
    register({
      shape: 'device-node',
      component: Device
    })
    register({
      shape: 'controller-node',
      component: Controller
    })
    register({
      shape: 'human-node',
      component: Human
    })
    register({
      shape: 'functional-module-node',
      component: FunctionalModule
    })
    register({
      shape: 'controller-unit-node',
      component: ControllerUnit
    })
    register({
      shape: 'machine-node',
      component: Machine
    })
  },
  edgeRules: {
    // 获取节点的 port group 配置
    getPortGroups: (nodeShape: string) => {
      const basePortStyle = {
        width: 10,
        height: 10,
        x: -5,
        y: -5,
        magnet: true,
        stroke: '#333',
        fill: '#fff',
        strokeWidth: 1,
        rx: 0,
        ry: 0,
      }
      return {
        in: {
          position: 'left',
          markup: [
            {
              tagName: 'rect',
              selector: 'rect',
            },
          ],
          attrs: {
            rect: { ...basePortStyle },
          },
        },
        out: {
          position: 'right',
          markup: [
            {
              tagName: 'rect',
              selector: 'rect',
            },
          ],
          attrs: {
            rect: { ...basePortStyle },
          },
        },
      }
    },

    // 如果 environment 节点不预先带 port，需支持动态添加：
    supportsMultiplePorts: (nodeShape: string) => {
      // 允许动态为 environment 节点添加出/入端口，均匀分布在两侧
      return true
    },

    // 如果需要在节点生成时默认加端口，启用这个函数；我们这里返回空走动态逻辑即可
    getInitialPorts: (nodeShape: string) => {
      return []
    }
  },
  formConfig: formConfig,
  defaultEdgeMarker: null,
}

export default environmentStrategy
