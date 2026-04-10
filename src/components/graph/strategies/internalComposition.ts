import { register } from '@antv/x6-react-shape'
import type { GraphStrategy } from './types'
import Machine from '../../nodes/internalComposition/Machine'
import FunctionalModule from '../../nodes/internalComposition/FunctionalModule'
import Controller from '../../nodes/internalComposition/Controller'

const internalCompositionStrategy: GraphStrategy = {
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
