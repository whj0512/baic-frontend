import React from 'react'
import NodeWrapper from '../../common/NodeWrapper'

const Graph = (props: any) => (
  <NodeWrapper {...props} defaultContent="fx" nodeType="call" />
);

export default Call
