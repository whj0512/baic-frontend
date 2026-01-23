import React from 'react'
import NodeWrapper from '../../common/NodeWrapper'

const TruthTable = (props: any) => (
  <NodeWrapper {...props} defaultContent="tf" nodeType="truthTable" />
);

export default TruthTable