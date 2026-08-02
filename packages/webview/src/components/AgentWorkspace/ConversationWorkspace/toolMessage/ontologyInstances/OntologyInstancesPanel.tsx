import {
  ApartmentOutlined,
  ExclamationCircleOutlined,
  FullscreenExitOutlined,
  FullscreenOutlined,
  LoadingOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import {
  lazy,
  memo,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { fetchGraphDBGraph } from '../../../../../config/graphdbGraph'
import { fetchProjectRequirements } from '../../../../../config/projectRequirements'
import type { GraphDBGraphResponse } from '../../../../../models/GraphDBGraph'
import type { Requirement } from '../../../../../models/Requirement'
import type { ToolPanelProps } from '../types'
import type {
  OntologyInstancesEnvelope,
  OntologyInstancesPanelPayload,
} from './types'
import './OntologyInstancesPanel.css'

const ReqRelationShip = lazy(() => import('../../../../ReqRelationShip'))

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[href]',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

type DataState =
  | { state: 'idle' }
  | { state: 'loading' }
  | {
      state: 'ready'
      requirements: Requirement[]
      graph: GraphDBGraphResponse
    }
  | { state: 'error'; message: string }

function PanelState({
  kind,
  title,
  message,
}: {
  kind: 'loading' | 'error'
  title: string
  message: string
}) {
  return (
    <section
      className={`ontology-instances-panel ontology-instances-panel--${kind}`}
      aria-live="polite"
    >
      <div className="ontology-instances-panel__state">
        {kind === 'loading'
          ? <LoadingOutlined spin />
          : <ExclamationCircleOutlined />}
        <div>
          <strong>{title}</strong>
          <p>{message}</p>
        </div>
      </div>
    </section>
  )
}

function OntologyInstancesPanel({
  payload,
  context,
}: ToolPanelProps<OntologyInstancesPanelPayload>) {
  if (payload.state === 'loading') {
    return (
      <PanelState
        kind="loading"
        title="正在准备本体实例关系图"
        message="已识别 query-project-ontology-instances，正在等待工具结果。"
      />
    )
  }

  if (payload.state === 'parse-error') {
    return (
      <PanelState
        kind="error"
        title="本体实例卡片结果无法解析"
        message={payload.message}
      />
    )
  }

  if (!context.projectId) {
    return (
      <PanelState
        kind="error"
        title="缺少当前项目上下文"
        message="请选择项目并在该项目的 Agent 工作区中重新调用此 Skill。"
      />
    )
  }

  return (
    <OntologyInstancesBrowser
      envelope={payload.envelope}
      projectId={context.projectId}
      assistantName={context.assistantName}
    />
  )
}

function OntologyInstancesBrowser({
  envelope,
  projectId,
  assistantName,
}: {
  envelope: OntologyInstancesEnvelope
  projectId: string
  assistantName: string
}) {
  const panelRef = useRef<HTMLElement | null>(null)
  const expandButtonRef = useRef<HTMLButtonElement | null>(null)
  const [activated, setActivated] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [retryRevision, setRetryRevision] = useState(0)
  const [dataState, setDataState] = useState<DataState>({ state: 'idle' })
  const graphRequest = useMemo(() => ({
    root: envelope.query.root,
    depth: envelope.query.depth,
    origin: envelope.query.origin,
    node_limit: envelope.query.node_limit,
    edge_limit: envelope.query.edge_limit,
    include_properties: envelope.query.include_properties,
  }), [
    envelope.query.depth,
    envelope.query.edge_limit,
    envelope.query.include_properties,
    envelope.query.node_limit,
    envelope.query.origin,
    envelope.query.root,
  ])

  useEffect(() => {
    if (activated) {
      return
    }

    const panel = panelRef.current
    if (!panel || typeof IntersectionObserver === 'undefined') {
      setActivated(true)
      return
    }

    const scrollContainer = panel.closest<HTMLElement>('.conversation-canvas')
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setActivated(true)
        }
      },
      {
        root: scrollContainer,
        rootMargin: '240px 0px',
      },
    )
    observer.observe(panel)
    return () => observer.disconnect()
  }, [activated])

  useEffect(() => {
    if (!activated) {
      return
    }

    const controller = new AbortController()
    setDataState({ state: 'loading' })

    void Promise.all([
      fetchProjectRequirements(projectId, controller.signal),
      fetchGraphDBGraph(graphRequest, controller.signal),
    ]).then(([requirements, graph]) => {
      if (!controller.signal.aborted) {
        setDataState({ state: 'ready', requirements, graph })
      }
    }).catch((error: unknown) => {
      if (
        controller.signal.aborted
        || (error instanceof Error && error.name === 'AbortError')
      ) {
        return
      }

      setDataState({
        state: 'error',
        message: error instanceof Error && error.message
          ? error.message
          : '加载本体实例关系图失败',
      })
    })

    return () => controller.abort()
  }, [activated, graphRequest, projectId, retryRevision])

  useEffect(() => {
    if (!expanded) {
      return
    }

    const panel = panelRef.current
    const scrollContainer = panel?.closest<HTMLElement>('.conversation-canvas')
    const previousBodyOverflow = document.body.style.overflow
    const previousCanvasOverflow = scrollContainer?.style.overflow
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setExpanded(false)
        return
      }
      if (event.key !== 'Tab') {
        return
      }

      const focusable = panel
        ? [...panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)]
        : []
      if (focusable.length === 0) {
        event.preventDefault()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.body.style.overflow = 'hidden'
    if (scrollContainer) {
      scrollContainer.style.overflow = 'hidden'
    }
    window.addEventListener('keydown', handleKeyDown)
    const focusFrame = requestAnimationFrame(() => {
      expandButtonRef.current?.focus()
    })

    return () => {
      cancelAnimationFrame(focusFrame)
      document.body.style.overflow = previousBodyOverflow
      if (scrollContainer) {
        scrollContainer.style.overflow = previousCanvasOverflow ?? ''
      }
      window.removeEventListener('keydown', handleKeyDown)
      requestAnimationFrame(() => {
        expandButtonRef.current?.focus()
      })
    }
  }, [expanded])

  const handleExpandToggle = useCallback(() => {
    setActivated(true)
    setExpanded((current) => !current)
  }, [])

  const handleRetry = useCallback(() => {
    setActivated(true)
    setRetryRevision((current) => current + 1)
  }, [])

  return (
    <section
      ref={panelRef}
      className={`ontology-instances-panel${
        expanded ? ' ontology-instances-panel--expanded' : ''
      }`}
      role={expanded ? 'dialog' : undefined}
      aria-modal={expanded ? true : undefined}
      aria-label={expanded ? '当前项目本体实例关系图全屏视图' : undefined}
    >
      <header className="ontology-instances-panel__header">
        <span className="ontology-instances-panel__header-icon">
          <ApartmentOutlined />
        </span>
        <div>
          <small>query-project-ontology-instances · {assistantName}</small>
          <h3>当前项目本体实例关系图</h3>
        </div>
        <button
          ref={expandButtonRef}
          type="button"
          className="ontology-instances-panel__expand"
          aria-label={expanded ? '退出全屏查看' : '全屏查看'}
          aria-pressed={expanded}
          title={expanded ? '退出全屏查看（Esc）' : '全屏查看'}
          onClick={handleExpandToggle}
        >
          {expanded
            ? <FullscreenExitOutlined />
            : <FullscreenOutlined />}
        </button>
      </header>

      <div className="ontology-instances-panel__body">
        {!activated || dataState.state === 'idle' ? (
          <div className="ontology-instances-panel__state">
            <ApartmentOutlined />
            <div>
              <strong>关系图将在进入视口后加载</strong>
              <p>历史消息中的图实例会延迟初始化，以减少页面资源占用。</p>
              <button type="button" onClick={() => setActivated(true)}>
                立即加载
              </button>
            </div>
          </div>
        ) : dataState.state === 'loading' ? (
          <div className="ontology-instances-panel__state" aria-live="polite">
            <LoadingOutlined spin />
            <div>
              <strong>正在加载项目需求与本体实例</strong>
              <p>两个只读请求正在并行执行。</p>
            </div>
          </div>
        ) : dataState.state === 'error' ? (
          <div
            className="ontology-instances-panel__state ontology-instances-panel__state--error"
            role="alert"
          >
            <ExclamationCircleOutlined />
            <div>
              <strong>本体实例关系图加载失败</strong>
              <p>{dataState.message}</p>
              <button type="button" onClick={handleRetry}>
                <ReloadOutlined />
                重新加载
              </button>
            </div>
          </div>
        ) : (
          <Suspense
            fallback={(
              <div className="ontology-instances-panel__state">
                <LoadingOutlined spin />
                <div>
                  <strong>正在加载关系图组件</strong>
                  <p>正在初始化 AntV G6 渲染模块。</p>
                </div>
              </div>
            )}
          >
            <ReqRelationShip
              requirements={dataState.requirements}
              initialRequest={graphRequest}
              initialGraph={dataState.graph}
              embedded
            />
          </Suspense>
        )}
      </div>
    </section>
  )
}

export default memo(OntologyInstancesPanel)
