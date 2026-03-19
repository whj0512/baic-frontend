import { register } from '@antv/x6-react-shape'
import type { GraphStrategy } from './types'
import Device from '../../nodes/environment/Device'
import Controller from '../../nodes/environment/Controller'
import Human from '../../nodes/environment/Human'
import FunctionalModule from '../../nodes/environment/FunctionalModule'
import ControllerUnit from '../../nodes/environment/ControllerUnit'
import Machine from '../../nodes/environment/Machine'

const environmentStrategy: GraphStrategy = {
  sidebarItems: [
    {
      type: 'device',
      label: 'Device',
      shape: 'device-node',
      color: '#ffffffff',
      defaultAttrs: {
        data: {
          width: 80,
          height: 120,
          stroke: '#333',
          fill: '#fff'
        }
      }
    },
    {
      type: 'controller',
      label: 'Controller',
      shape: 'controller-node',
      color: '#ffffffff',
      defaultAttrs: {
        data: {
          width: 80,
          height: 120,
          stroke: '#333',
          fill: '#fff'
        }
      }
    },
    {
      type: 'human',
      label: 'Human',
      shape: 'human-node',
      color: '#ffffffff',
      defaultAttrs: {
        data: {
          width: 80,
          height: 120,
          stroke: '#333',
          fill: '#fff'
        }
      }
    },
    {
      type: 'functional-module',
      label: 'Functional Module',
      shape: 'functional-module-node',
      color: '#ffffffff',
      defaultAttrs: {
        data: {
          width: 80,
          height: 120,
          stroke: '#333',
          fill: '#fff'
        }
      }
    },
    {
      type: 'controller-unit',
      label: 'Controller Unit',
      shape: 'controller-unit-node',
      color: '#ffffffff',
      defaultAttrs: {
        data: {
          width: 80,
          height: 120,
          stroke: '#333',
          fill: '#fff'
        }
      }
    },
    {
      type: 'machine',
      label: 'Machine',
      shape: 'machine-node',
      color: '#ffffffff',
      defaultAttrs: {
        data: {
          width: 80,
          height: 120,
          stroke: '#333',
          fill: '#fff'
        }
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
  }
}

export default environmentStrategy
