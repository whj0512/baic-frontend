import React from 'react'
import NodeWrapper from '../../common/NodeWrapper'

const Truth = (props: any) => (
  <NodeWrapper {...props} defaultContent="tf" nodeType="call" />
);

export default Truth