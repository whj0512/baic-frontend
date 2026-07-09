import { type FC, type ReactNode } from 'react'
import './Page.css'

interface PageNodeProps {
  node?: any
  width?: number
  height?: number
  stroke?: string
  fill?: string
  fontColor?: string
  fontSize?: number
  nodeName?: string
  comment?: string
  isStencil?: boolean
  children?: ReactNode
}

interface PageWidget {
  name?: string
}

const Page: FC<PageNodeProps> = ({
  node,
  width: propWidth,
  height: propHeight,
  stroke: propStroke,
  fill: propFill,
  fontColor: propFontColor,
  fontSize: propFontSize,
  nodeName: propNodeName,
  comment: propComment,
  isStencil = false,
  children,
}) => {
  const nodeData = node?.getData?.() || {}
  const nodeSize = node?.getSize?.() || {}

  const width = isStencil ? 100 : propWidth || nodeSize.width || 120
  const height = isStencil ? 60 : propHeight || nodeSize.height || 80
  const stroke = propStroke || nodeData.stroke || '#2563eb'
  const fill = propFill || nodeData.fill || '#f3f4f6'
  const fontColor = propFontColor || nodeData.fontColor || '#1f2937'
  const fontSize = propFontSize || nodeData.fontSize || 12
  const nodeName = propNodeName || nodeData.nodeName || 'Page'
  const comment = propComment || nodeData.comment || ''
  const widgets = Array.isArray(nodeData.widgets) ? nodeData.widgets as PageWidget[] : []
  const widgetNames = widgets
    .map(widget => typeof widget.name === 'string' ? widget.name.trim() : '')
    .filter(Boolean)

  return (
    <div
      className="dialog-page-node"
      style={{
        width,
        height,
        color: fontColor,
        fontSize,
        ['--dialog-page-stroke' as any]: stroke,
        ['--dialog-page-fill' as any]: fill,
      }}
    >
      {isStencil ? (
        <div className="dialog-page-node__stencil">
          <div className="dialog-page-node__stencil-text">{nodeName}</div>
          <div className="dialog-page-node__stencil-badge">P</div>
        </div>
      ) : (
        <>
          <div className="dialog-page-node__header">{nodeName}</div>
          <div className="dialog-page-node__content">
            {comment && <div className="dialog-page-node__comment">{comment}</div>}
            {widgetNames.length > 0 && (
              <div className="dialog-page-node__detail">
                {widgetNames.map((widgetName, index) => (
                  <div key={`widget-${index}`} className="dialog-page-node__row">
                    {widgetName}
                  </div>
                ))}
              </div>
            )}
            {children}
          </div>
          <div className="dialog-page-node__badge">
            <span className="dialog-page-node__badge-text">P</span>
          </div>
        </>
      )}
    </div>
  )
}

export default Page
