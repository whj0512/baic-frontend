import {
    CheckCircleFilled,
    CloseCircleFilled,
    SyncOutlined,
} from '@ant-design/icons'
import { type FC, type ReactNode } from 'react'
import './NodeWrapper.css'

export interface TestcaseNodeData {
    stroke?: string
    fill?: string
    fontFill?: string
    fontColor?: string
    fontSize?: number
    nodeName?: string
    status?: 'running' | 'failed' | 'success' | string
    over?: boolean
    errorMsg?: string
    [key: string]: unknown
}

export interface NodeWrapperProps {
    node?: any
    data?: TestcaseNodeData
    width?: number
    height?: number
    stroke?: string
    fill?: string
    fontFill?: string
    fontColor?: string
    fontSize?: number
    nodeName?: string
    defaultContent?: ReactNode
    children?: ReactNode
}

const normalizeValue = (value: unknown) => {
    if (value === null || value === undefined) return ''
    if (typeof value === 'string' || typeof value === 'number') return value
    return String(value)
}

const NodeWrapper: FC<NodeWrapperProps> = (props) => {
    const {
        node,
        width: propWidth,
        height: propHeight,
        stroke: propStroke,
        fill: propFill,
        fontFill: propFontFill,
        fontColor: propFontColor,
        fontSize: propFontSize,
        nodeName: propNodeName,
        defaultContent,
        children,
    } = props

    const nodeData = node?.getData?.() || {}
    const nodeSize = node?.getSize?.() || {}
    const badgeContent = defaultContent ?? 'Default'

    let width = propWidth ?? nodeSize.width ?? 80
    let height = propHeight ?? nodeSize.height ?? 40

    const stroke = propStroke ?? nodeData.stroke ?? '#333'
    const fill = propFill ?? nodeData.fill ?? '#fff'
    const fontFill = propFontFill ?? propFontColor ?? nodeData.fontFill ?? nodeData.fontColor ?? '#333'
    const fontSize = propFontSize ?? nodeData.fontSize ?? 12
    const nodeName = normalizeValue(propNodeName ?? nodeData.nodeName)
    const status = nodeData.status
    const over = Boolean(nodeData.over)

    return (
        <div
            className={`testcase-node-wrapper${over ? ' testcase-node-wrapper--over' : ''}`}
            style={{
                width,
                height,
                borderColor: stroke as string,
                background: fill as string,
                color: fontFill as string,
                fontSize: Number(fontSize),
            }}
        >
            {status === 'running' && (
                <div className="testcase-node-wrapper__status-wrap">
                    <SyncOutlined spin className="testcase-node-wrapper__status-icon testcase-node-wrapper__status-icon--running" />
                </div>
            )}
            {status === 'failed' && (
                <div className="testcase-node-wrapper__status-wrap">
                    <CloseCircleFilled className="testcase-node-wrapper__status-icon testcase-node-wrapper__status-icon--failed" />
                    <span className="testcase-node-wrapper__error-msg">{normalizeValue(nodeData.errorMsg)}</span>
                </div>
            )}
            {status === 'success' && (
                <div className="testcase-node-wrapper__status-wrap">
                    <CheckCircleFilled className="testcase-node-wrapper__status-icon testcase-node-wrapper__status-icon--success" />
                </div>
            )}

            <div className="testcase-node-wrapper__rect">
                <div className="testcase-node-wrapper__badge">
                    <div className="testcase-node-wrapper__badge-text">{badgeContent}</div>
                </div>
            </div>
            <div className="testcase-node-wrapper__content">
                {children ? children : nodeName}
            </div>
        </div>
    )
}

export default NodeWrapper
