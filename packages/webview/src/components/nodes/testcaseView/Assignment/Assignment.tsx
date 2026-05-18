import { type FC, type ReactNode } from 'react'
import NodeWrapper from '../NodeWrapper'
import './Assignment.css'
import * as utils from './utils'

interface AssignmentProps {
    node?: any
    data?: Record<string, unknown>
    width?: number
    height?: number
    stroke?: string
    fill?: string
    fontFill?: string
    fontColor?: string
    fontSize?: number
    nodeName?: string
    children?: ReactNode
}

const Assignment: FC<AssignmentProps> = (props) => {
    const { node, data: propData, nodeName: propNodeName, children } = props
    const nodeData = node?.getData?.() || {}
    const data = { ...nodeData, ...propData }
    const name = utils.normalizeValue(propNodeName ?? data.nodeName ?? data.name ?? 'assignment')

    const assignment = utils.toActionList(data.assignment)
    const expect = utils.toActionList(data.expect)
    const send = utils.toActionList(data.send)
    const primaryRows = assignment.length ? assignment : expect

    return (
        <NodeWrapper {...props} nodeName={name} defaultContent="as">
            <div className="assignment-node">
                <div className="assignment-node__header">{name}</div>
                {!!primaryRows.length && (
                    <div className="assignment-node__detail">
                        {primaryRows.map((item, index) => (
                            <div key={`assignment-primary-${index}`} className="assignment-node__row assignment-node__row--highlight">
                                {utils.joinObject(item)}
                            </div>
                        ))}
                    </div>
                )}
                {!!send.length && (
                    <div className="assignment-node__detail">
                        {send.map((item, index) => (
                            <div key={`assignment-send-${index}`} className="assignment-node__row">
                                {utils.joinObject(item)}
                            </div>
                        ))}
                    </div>
                )}
                {children}
            </div>
        </NodeWrapper>
    )
}

export default Assignment
