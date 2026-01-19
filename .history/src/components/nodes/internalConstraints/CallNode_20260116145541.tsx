import React from 'react'
import NodeWrapper from '../common/NodeWrapper'

const CallNode = (props: any) => (
  <NodeWrapper {...props} defaultContent="fx" nodeType="call" />
);

export default CallNode
