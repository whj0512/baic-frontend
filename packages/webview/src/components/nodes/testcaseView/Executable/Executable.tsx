import { type FC, type ReactNode } from 'react'
import NodeWrapper from '../NodeWrapper'
import './Executable.css'
import * as utils from '../Assignment/utils'

interface ExecutableProps {
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

const Executable: FC<ExecutableProps> = (props) => {
    const { node, data: propData, nodeName: propNodeName, children } = props
    const nodeData = node?.getData?.() || {}
    const data = { ...nodeData, ...propData }
    const name = utils.normalizeValue(propNodeName ?? data.nodeName ?? data.name ?? 'execute')

    const expect = utils.toActionList(data.expect)
    const send = utils.toActionList(data.send)

    return (
        <NodeWrapper {...props} nodeName={name} defaultContent="►">
            <div className="executable-node">
                <div className="executable-node__header">{name}</div>
                {!!expect.length && (
                    <div className="executable-node__detail">
                        {expect.map((item, index) => (
                            <div key={`executable-expect-${index}`} className="executable-node__row executable-node__row--highlight">
                                {utils.joinObject(item)}
                            </div>
                        ))}
                    </div>
                )}
                {!!send.length && (
                    <div className="executable-node__detail">
                        {send.map((item, index) => (
                            <div key={`executable-send-${index}`} className="executable-node__row">
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

export default Executable
