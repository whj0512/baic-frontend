import React from 'react'
import NodeWrapper from '../../common/NodeWrapper'

const Graph = (props: any) => (
  <NodeWrapper {...props} defaultContent="G" nodeType="graph" />
);

export default Graph
