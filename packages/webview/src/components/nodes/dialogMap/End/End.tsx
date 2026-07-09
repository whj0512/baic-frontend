import { type FC, type ReactNode } from 'react'
import './End.css'

interface EndNodeProps {
  node?: any
  width?: number
  height?: number
  stroke?: string
  fill?: string
  fontColor?: string
  fontSize?: number
  nodeName?: string
  isStencil?: boolean
  children?: ReactNode
}

const End: FC<EndNodeProps> = ({
  node,
  width: propWidth,
  height: propHeight,
  stroke: propStroke,
  fill: propFill,
  fontColor: propFontColor,
  fontSize: propFontSize,
  nodeName: propNodeName,
  isStencil = false,
  children,
}) => {
  const nodeData = node?.getData?.() || {}
  const nodeSize = node?.getSize?.() || {}

  const width = isStencil ? 40 : propWidth || nodeSize.width || 30
  const height = isStencil ? 40 : propHeight || nodeSize.height || 30
  const stroke = propStroke || nodeData.stroke || '#111'
  const fill = propFill || nodeData.fill || '#000'
  const fontColor = propFontColor || nodeData.fontColor || '#333'
  const fontSize = propFontSize || nodeData.fontSize || 10
  const nodeName = propNodeName || nodeData.nodeName || 'End'

  return (
    <div
      className="dialog-end-node"
      style={{
        width,
        height,
        color: fontColor,
        fontSize,
        ['--dialog-end-stroke' as any]: stroke,
        ['--dialog-end-fill' as any]: fill,
      }}
    >
      <div className="dialog-end-node__shape">
        <div className="dialog-end-node__inner" />
      </div>
      {!isStencil && (
        <div className="dialog-end-node__content">
          {children || nodeName}
        </div>
      )}
    </div>
  )
}

export default End
