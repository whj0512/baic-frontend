import { useCallback, useMemo, useRef } from 'react'
import { InteractiveNvlWrapper } from '@neo4j-nvl/react'
import type { InteractionOptions, MouseEventCallbacks } from '@neo4j-nvl/react'
import type { NvlGraphData } from '../types'

const NVL_OPTIONS = {
  disableTelemetry: true,
  disableWebWorkers: true,
  initialZoom: 1,
}

const NVL_INTERACTION_OPTIONS: InteractionOptions = {
  drawShadowOnHover: true,
}

type NvlHoverCallback = Extract<MouseEventCallbacks['onHover'], (...args: any[]) => void>
type NvlHoverElement = Parameters<NvlHoverCallback>[0] & {
  properties?: Record<string, unknown>
}

interface NvlGraphRendererProps {
  graphData: NvlGraphData
}

function NvlGraphRenderer({ graphData }: NvlGraphRendererProps) {
  const hoveredElementKeyRef = useRef<string | null>(null)

  const handleHover = useCallback<NvlHoverCallback>((element) => {
    const hoverElement = element as NvlHoverElement | undefined
    const hoverKey = getHoverKey(hoverElement)
    if (hoveredElementKeyRef.current === hoverKey) return

    hoveredElementKeyRef.current = hoverKey
    if (!hoverElement) return

    const isRelationship = isRelationshipElement(hoverElement)
    console.debug('[ReqRelationShip][NVL hover]', {
      type: isRelationship ? 'relationship' : 'node',
      id: hoverElement.id,
      caption: hoverElement.caption,
      from: isRelationship ? hoverElement.from : undefined,
      to: isRelationship ? hoverElement.to : undefined,
      properties: hoverElement.properties,
    })
  }, [])

  const mouseEventCallbacks = useMemo<MouseEventCallbacks>(() => ({
    onHover: handleHover,
  }), [handleHover])

  return (
    <div className="nvl-graph-container">
      <InteractiveNvlWrapper
        nodes={graphData.nodes}
        rels={graphData.rels}
        layout="forceDirected"
        nvlOptions={NVL_OPTIONS}
        interactionOptions={NVL_INTERACTION_OPTIONS}
        mouseEventCallbacks={mouseEventCallbacks}
      />
    </div>
  )
}

function getHoverKey(element?: NvlHoverElement | null) {
  if (!element) return null

  return `${isRelationshipElement(element) ? 'relationship' : 'node'}:${element.id}`
}

function isRelationshipElement(element: NvlHoverElement): element is NvlHoverElement & { from: string; to: string } {
  return 'from' in element && 'to' in element
}

export default NvlGraphRenderer
