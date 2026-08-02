import { LeftOutlined, RightOutlined } from '@ant-design/icons'
import { useEffect, useState } from 'react'
import { useOntologyWorkflowInteraction } from '../context/interactionContext'
import { deriveOntologyWorkflowStages } from '../core/workflowDefinition'
import type { OntologyWorkflowStageId } from '../core/types'
import type { OntologyWorkflowEvidence } from '../state/deriveWorkflowState'
import FunctionModelingStagePanel from './stages/FunctionModelingStagePanel'
import ItemizationStagePanel from './stages/ItemizationStagePanel'
import OntologyManagementStagePanel from './stages/OntologyManagementStagePanel'
import './OntologyWorkflowPanel.css'

interface OntologyWorkflowPanelProps {
  conversationKey: string | null
  evidence: OntologyWorkflowEvidence
  restoredFromCheckpoint: boolean
  canSend: boolean
  streaming: boolean
  itemizationConfirmed: boolean
  functionModelingConfirmed: boolean
  onSendText: (text: string) => Promise<void>
  onConfirmItemization: () => void
  onConfirmFunctionModeling: () => void
}

function OntologyWorkflowPanel({
  conversationKey,
  evidence,
  restoredFromCheckpoint,
  canSend,
  streaming,
  itemizationConfirmed,
  functionModelingConfirmed,
  onSendText,
  onConfirmItemization,
  onConfirmFunctionModeling,
}: OntologyWorkflowPanelProps) {
  const [expanded, setExpanded] = useState(false)
  const [selectedStageId, setSelectedStageId] =
    useState<OntologyWorkflowStageId | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)
  const interaction = useOntologyWorkflowInteraction()
  const ontologyCompleted = evidence.ontologyPayload?.state === 'ready'
  const stages = deriveOntologyWorkflowStages(
    itemizationConfirmed,
    functionModelingConfirmed,
    ontologyCompleted,
  )
  const progressStage = stages.find((stage) => stage.status === 'active')
    ?? stages[stages.length - 1]
  const selectedStage = stages.find((stage) => (
    stage.id === selectedStageId && stage.status !== 'pending'
  )) ?? progressStage

  useEffect(() => {
    if (interaction?.selectedChunkId) {
      setSelectedStageId('function-modeling')
      setExpanded(true)
    }
  }, [interaction?.selectedChunkId])

  useEffect(() => {
    setExpanded(false)
    setSelectedStageId(null)
    setSendError(null)
  }, [conversationKey])

  const sendText = async (text: string): Promise<boolean> => {
    setSendError(null)
    try {
      await onSendText(text)
      return true
    } catch (error) {
      setSendError(error instanceof Error && error.message
        ? error.message
        : '工作流消息发送失败')
      return false
    }
  }

  const commonStageProps = {
    evidence,
    canSend,
    streaming,
    sendText,
  }

  return (
    <section
      className={`ontology-workflow ontology-workflow--${expanded ? 'expanded' : 'collapsed'}`}
      aria-labelledby="ontology-workflow-title"
    >
      <div className="ontology-workflow__summary">
        <div className="ontology-workflow__heading">
          <span>本体建模工作流</span>
          <strong id="ontology-workflow-title">{selectedStage.title}</strong>
          <small>{selectedStage.description}</small>
        </div>

        <ol className="ontology-workflow__stages" aria-label="本体建模阶段">
          {stages.map((stage, index) => (
            <li
              key={stage.id}
              className={`ontology-workflow__stage ontology-workflow__stage--${stage.status}${
                stage.id === selectedStage.id
                  ? ' ontology-workflow__stage--selected'
                  : ''
              }`}
              aria-current={stage.status === 'active' ? 'step' : undefined}
            >
              <button
                type="button"
                disabled={stage.status === 'pending'}
                aria-pressed={stage.id === selectedStage.id}
                onClick={() => {
                  setSelectedStageId(stage.id)
                  setExpanded(true)
                }}
              >
                <span>{index + 1}</span>
                <div>
                  <strong>{stage.title}</strong>
                  <small>场景 {stage.scenes.join('、')}</small>
                </div>
              </button>
            </li>
          ))}
        </ol>

        <button
          type="button"
          className="ontology-workflow__toggle"
          aria-expanded={expanded}
          aria-controls="ontology-workflow-guidance"
          aria-label={expanded ? '收起场景引导' : '展开场景引导'}
          title={expanded ? '收起工作流面板' : '展开工作流面板'}
          onClick={() => setExpanded((current) => !current)}
        >
          <span className="ontology-workflow__toggle-icon" aria-hidden="true">
            {expanded ? <RightOutlined /> : <LeftOutlined />}
          </span>
          <span className="ontology-workflow__toggle-label">
            {expanded ? '收起' : '展开'}
          </span>
        </button>
      </div>

      <div
        id="ontology-workflow-guidance"
        className="ontology-workflow__guidance"
        hidden={!expanded}
      >
        {restoredFromCheckpoint ? (
          <div className="ontology-workflow__restored" role="status">
            上下文已压缩，当前功能清单和工作流进度已从本地检查点恢复。
          </div>
        ) : null}

        {selectedStage.id === 'itemization' ? (
          <ItemizationStagePanel
            key={`${conversationKey ?? 'draft'}:itemization`}
            {...commonStageProps}
            onConfirm={() => {
              onConfirmItemization()
              setSelectedStageId('function-modeling')
            }}
          />
        ) : selectedStage.id === 'ontology-management' ? (
          <OntologyManagementStagePanel
            key={`${conversationKey ?? 'draft'}:ontology-management`}
            {...commonStageProps}
          />
        ) : (
          <FunctionModelingStagePanel
            key={`${conversationKey ?? 'draft'}:function-modeling`}
            {...commonStageProps}
            onConfirm={() => {
              onConfirmFunctionModeling()
              setSelectedStageId('ontology-management')
            }}
          />
        )}

        {sendError ? (
          <p className="ontology-workflow__error" role="alert">{sendError}</p>
        ) : null}
      </div>
    </section>
  )
}

export default OntologyWorkflowPanel
