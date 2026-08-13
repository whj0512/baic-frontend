import { register as registerReactShape } from '@antv/x6-react-shape'

const DEFAULT_REACT_NODE_EFFECTS = ['data', 'size']

export const register = (
  config: Parameters<typeof registerReactShape>[0],
) => {
  registerReactShape({
    effect: DEFAULT_REACT_NODE_EFFECTS,
    ...config,
  })
}
