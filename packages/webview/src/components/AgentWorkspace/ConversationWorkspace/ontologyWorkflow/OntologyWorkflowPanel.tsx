import { LeftOutlined, RightOutlined } from '@ant-design/icons'
import { useEffect, useState } from 'react'
import {
  buildChunksQueryPrompt,
  buildDslQueryPrompt,
  buildSceneOnePrompt,
  buildSceneThreePrompt,
  deriveOntologyWorkflowStages,
} from './deriveWorkflowState'
import type { OntologyWorkflowEvidence } from './deriveWorkflowState'
import { useOntologyWorkflowInteraction } from './interactionContext'
import type { SceneOneFormValues, SceneThreeFormValues } from './types'
import WorkflowPathPicker from './WorkflowPathPicker'
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

const EMPTY_SCENE_ONE_FORM: SceneOneFormValues = {
  sourceDocument: '',
  mineruMarkdown: '',
  projectRoot: '',
  additionalConstraints: '',
}

const EMPTY_SCENE_THREE_FORM: SceneThreeFormValues = {
  functionMarkdown: '',
  projectRoot: '',
  additionalRequirements: '',
}

const SOURCE_DOCUMENT_SELECTION = {
  kind: 'file' as const,
  title: '选择原始需求文档',
  filters: {
    '需求文档': ['docx', 'pdf'],
  },
}

const MARKDOWN_SELECTION = {
  kind: 'file' as const,
  title: '选择 MinerU Markdown',
  filters: {
    Markdown: ['md', 'markdown'],
  },
}

const PROJECT_ROOT_SELECTION = {
  kind: 'folder' as const,
  title: '选择项目根目录',
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
  const [sceneOneForm, setSceneOneForm] = useState(EMPTY_SCENE_ONE_FORM)
  const [sceneThreeForm, setSceneThreeForm] = useState(EMPTY_SCENE_THREE_FORM)
  const [sendError, setSendError] = useState<string | null>(null)
  const interaction = useOntologyWorkflowInteraction()
  const chunksSucceeded = evidence.chunksEnvelope?.status === 'success'
  const stages = deriveOntologyWorkflowStages(
    itemizationConfirmed,
    functionModelingConfirmed,
  )
  const activeStage = stages.find((stage) => stage.status === 'active') ?? stages[0]
  const missingFields = [
    !sceneOneForm.sourceDocument.trim() ? '原始文档' : null,
    !sceneOneForm.mineruMarkdown.trim() ? 'MinerU Markdown' : null,
    !sceneOneForm.projectRoot.trim() ? '项目根目录' : null,
  ].filter((value): value is string => Boolean(value))
  const sceneOneReady = missingFields.length === 0
  const selectedFunction = evidence.functions.find(
    (item) => item.chunkId === interaction?.selectedChunkId,
  ) ?? null
  const selectedProgress = selectedFunction
    ? evidence.functionProgress.get(selectedFunction.chunkId) ?? null
    : null
  const unsafePathCount = evidence.functions.filter(
    (item) => !item.resolvedMarkdownPath,
  ).length
  const allFunctionsModeled =
    evidence.functions.length > 0
    && evidence.modeledFunctionCount === evidence.functions.length
  const dslPayload = evidence.dslPayload
  const dslSucceeded = dslPayload?.state === 'success'
  const dslFeatureCount = dslSucceeded
    ? dslPayload.envelope.summary.feature_count
    : null
  const dslCoverageMatches =
    dslFeatureCount !== null
    && dslFeatureCount === evidence.functions.length
  const sceneThreeReady = Boolean(
    selectedFunction
    && sceneThreeForm.functionMarkdown.trim()
    && sceneThreeForm.projectRoot.trim(),
  )
  const pendingFunctions = evidence.functions.filter(
    (item) => !evidence.functionProgress.has(item.chunkId),
  )
  const inconsistentFunctions = evidence.functions.filter(
    (item) => evidence.inconsistentProjectRootChunkIds.includes(item.chunkId),
  )

  useEffect(() => {
    setExpanded(false)
    setSceneOneForm(EMPTY_SCENE_ONE_FORM)
    setSceneThreeForm(EMPTY_SCENE_THREE_FORM)
    setSendError(null)
  }, [conversationKey])

  useEffect(() => {
    if (!selectedFunction) {
      setSceneThreeForm(EMPTY_SCENE_THREE_FORM)
      return
    }

    setSceneThreeForm({
      functionMarkdown:
        selectedProgress?.functionMarkdown
        || selectedFunction.resolvedMarkdownPath
        || '',
      projectRoot: selectedProgress?.projectRoot || selectedFunction.projectRoot,
      additionalRequirements: '',
    })

    setExpanded(true)
    const frame = requestAnimationFrame(() => {
      const selection = document.getElementById('ontology-workflow-selection')
      selection?.focus({ preventScroll: true })
      selection?.scrollIntoView({ block: 'nearest' })
    })
    return () => cancelAnimationFrame(frame)
  }, [selectedFunction?.chunkId, selectedProgress?.latestMessageIndex])

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

  const sendSceneThree = async () => {
    if (!selectedFunction || !sceneThreeReady) {
      return
    }
    const sent = await sendText(buildSceneThreePrompt(
      selectedFunction,
      sceneThreeForm,
    ))
    if (sent) {
      setSceneThreeForm((current) => ({
        ...current,
        additionalRequirements: '',
      }))
    }
  }

  return (
    <section
      className={`ontology-workflow ontology-workflow--${expanded ? 'expanded' : 'collapsed'}`}
      aria-labelledby="ontology-workflow-title"
    >
      <div className="ontology-workflow__summary">
        <div className="ontology-workflow__heading">
          <span>本体建模工作流</span>
          <strong id="ontology-workflow-title">{activeStage.title}</strong>
          <small>{activeStage.description}</small>
        </div>

        <ol className="ontology-workflow__stages" aria-label="本体建模阶段">
          {stages.map((stage, index) => (
            <li
              key={stage.id}
              className={`ontology-workflow__stage ontology-workflow__stage--${stage.status}`}
              aria-current={stage.status === 'active' ? 'step' : undefined}
            >
              <span>{index + 1}</span>
              <div>
                <strong>{stage.title}</strong>
                <small>场景 {stage.scenes.join('、')}</small>
              </div>
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

      {expanded ? (
        <div id="ontology-workflow-guidance" className="ontology-workflow__guidance">
          {restoredFromCheckpoint ? (
            <div className="ontology-workflow__restored" role="status">
              上下文已压缩，当前功能清单和建模进度已从本地检查点恢复。
            </div>
          ) : null}
          {!itemizationConfirmed ? (
            <>
              <div className="ontology-workflow__guidance-heading">
                <div>
                  <strong>流水线一 · 场景 1</strong>
                  <span>填写本地绝对路径，发送条目化提示词。</span>
                </div>
                {evidence.sceneOne ? <em>场景 1 已发起</em> : null}
              </div>

              <div className="ontology-workflow__form-grid">
                <label>
                  <span>原始文档 *</span>
                  <WorkflowPathPicker
                    value={sceneOneForm.sourceDocument}
                    placeholder="DOCX/PDF 绝对路径"
                    selection={SOURCE_DOCUMENT_SELECTION}
                    onChange={(value) => setSceneOneForm((current) => ({
                      ...current,
                      sourceDocument: value,
                    }))}
                  />
                </label>
                <label>
                  <span>MinerU Markdown *</span>
                  <WorkflowPathPicker
                    value={sceneOneForm.mineruMarkdown}
                    placeholder="Markdown 绝对路径"
                    selection={MARKDOWN_SELECTION}
                    onChange={(value) => setSceneOneForm((current) => ({
                      ...current,
                      mineruMarkdown: value,
                    }))}
                  />
                </label>
                <label>
                  <span>项目根目录 *</span>
                  <WorkflowPathPicker
                    value={sceneOneForm.projectRoot}
                    placeholder="输出目录绝对路径"
                    selection={PROJECT_ROOT_SELECTION}
                    onChange={(value) => setSceneOneForm((current) => ({
                      ...current,
                      projectRoot: value,
                    }))}
                  />
                </label>
                <label className="ontology-workflow__form-field--wide">
                  <span>补充限制</span>
                  <textarea
                    value={sceneOneForm.additionalConstraints}
                    placeholder="选填；不会覆盖固定的关系证据与目录推断限制"
                    rows={2}
                    onChange={(event) => setSceneOneForm((current) => ({
                      ...current,
                      additionalConstraints: event.target.value,
                    }))}
                  />
                </label>
              </div>

              <div className="ontology-workflow__actions">
                <button
                  type="button"
                  disabled={!sceneOneReady || !canSend || streaming}
                  onClick={() => void sendText(buildSceneOnePrompt(sceneOneForm))}
                >
                  发送场景 1
                </button>
                {!sceneOneReady ? (
                  <small>请填写：{missingFields.join('、')}</small>
                ) : null}
              </div>

              {evidence.sceneOne && !chunksSucceeded ? (
                <div className="ontology-workflow__checkpoint">
                  <div>
                    <strong>场景 1 结果需要人工结束</strong>
                    <span>
                      {evidence.chunksEnvelope?.status === 'error'
                        ? '最近一次功能清单查询失败，可以重新查询。'
                        : 'Assistant 停止生成后，由你明确查询功能清单。'}
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={!canSend || streaming}
                    onClick={() => void sendText(
                      buildChunksQueryPrompt(evidence.sceneOne!.projectRoot),
                    )}
                  >
                    完成场景 1 并查询功能清单
                  </button>
                </div>
              ) : null}

              {chunksSucceeded ? (
                <div className="ontology-workflow__checkpoint">
                  <div>
                    <strong>审核最新功能清单</strong>
                    <span>
                      功能 {evidence.functions.length} 项；
                      {unsafePathCount} 项需要手工填写 Markdown 路径。
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={evidence.functions.length === 0 || !canSend || streaming}
                    onClick={onConfirmItemization}
                  >
                    确定条目化结果，进入功能建模
                  </button>
                </div>
              ) : null}
            </>
          ) : functionModelingConfirmed ? (
            <div className="ontology-workflow__placeholder">
              <strong>流水线三 · 本体关系管理</strong>
              <span>全部功能 DSL 已人工确认。场景 7 将在阶段四接入。</span>
            </div>
          ) : (
            <>
              <div className="ontology-workflow__guidance-heading">
                <div>
                  <strong>流水线二 · 场景 3 单功能建模</strong>
                  <span>逐个发起功能建模，全部覆盖后再查询项目 DSL。</span>
                </div>
                <em>
                  已覆盖 {evidence.modeledFunctionCount}/{evidence.functions.length}
                </em>
              </div>
              <div className="ontology-workflow__function-list">
                {evidence.functions.map((item) => {
                  const progress = evidence.functionProgress.get(item.chunkId)
                  return (
                    <button
                      key={item.chunkId}
                      type="button"
                      className={item.chunkId === interaction?.selectedChunkId
                        ? 'ontology-workflow__function--selected'
                        : undefined}
                      onClick={() => interaction?.onSelectFunction(item)}
                    >
                      <strong>{item.name}</strong>
                      <span>{item.chunkId}</span>
                      <em className={`ontology-workflow__function-status ontology-workflow__function-status--${progress?.status ?? 'pending'}`}>
                        {progress?.status === 'restarted'
                          ? '已重新建模'
                          : progress?.status === 'started'
                            ? '已发起'
                            : '待建模'}
                      </em>
                    </button>
                  )
                })}
              </div>
              <div
                id="ontology-workflow-selection"
                className="ontology-workflow__selection"
                tabIndex={-1}
              >
                {selectedFunction ? (
                  <>
                    <div className="ontology-workflow__guidance-heading">
                      <div>
                        <strong>场景 3 · {selectedFunction.name}</strong>
                        <span>一次只发送一个功能；发送后可继续选择其他功能。</span>
                      </div>
                      {selectedProgress ? (
                        <em>{selectedProgress.messageCount > 1 ? '重新建模' : '已发起'}</em>
                      ) : null}
                    </div>
                    <div className="ontology-workflow__form-grid">
                      <label>
                        <span>功能分块 ID</span>
                        <input value={selectedFunction.chunkId} readOnly />
                      </label>
                      <label>
                        <span>功能名称</span>
                        <input value={selectedFunction.name} readOnly />
                      </label>
                      <label>
                        <span>功能 Markdown *</span>
                        <WorkflowPathPicker
                          value={sceneThreeForm.functionMarkdown}
                          placeholder="请填写或选择 Markdown 绝对路径"
                          selection={MARKDOWN_SELECTION}
                          onChange={(value) => setSceneThreeForm((current) => ({
                            ...current,
                            functionMarkdown: value,
                          }))}
                        />
                      </label>
                      <label>
                        <span>项目根目录 *</span>
                        <WorkflowPathPicker
                          value={sceneThreeForm.projectRoot}
                          placeholder="DSL 项目根目录"
                          selection={PROJECT_ROOT_SELECTION}
                          onChange={(value) => setSceneThreeForm((current) => ({
                            ...current,
                            projectRoot: value,
                          }))}
                        />
                        <small>修改后会影响项目级 DSL 查询范围。</small>
                      </label>
                      <label>
                        <span>补充要求</span>
                        <textarea
                          rows={2}
                          value={sceneThreeForm.additionalRequirements}
                          placeholder="选填；不会覆盖原文、DSL 对齐和失败停止约束"
                          onChange={(event) => setSceneThreeForm((current) => ({
                            ...current,
                            additionalRequirements: event.target.value,
                          }))}
                        />
                      </label>
                    </div>
                    <div className="ontology-workflow__actions">
                      <button
                        type="button"
                        disabled={!sceneThreeReady || !canSend || streaming}
                        onClick={() => void sendSceneThree()}
                      >
                        {selectedProgress ? '重新发送场景 3' : '发送场景 3'}
                      </button>
                      {!sceneThreeReady ? <small>请填写功能 Markdown 和项目根目录。</small> : null}
                    </div>
                  </>
                ) : (
                  <span>请从功能清单或 chunks 卡片选择“建模此功能”。</span>
                )}
              </div>

              <div className="ontology-workflow__checkpoint ontology-workflow__checkpoint--stacked">
                <div>
                  <strong>项目级 DSL 查询门禁</strong>
                  <span>
                    当前覆盖 {evidence.modeledFunctionCount}/{evidence.functions.length}；
                    {pendingFunctions.length > 0
                      ? `待处理：${pendingFunctions.map((item) => item.name).join('、')}`
                      : evidence.commonProjectRoot
                        ? `统一根目录：${evidence.commonProjectRoot}`
                        : '项目根目录不一致，不能自动选择查询范围。'}
                  </span>
                  {allFunctionsModeled && inconsistentFunctions.length > 0 ? (
                    <small role="alert">
                      涉及功能：{inconsistentFunctions.map((item) => item.name).join('、')}
                    </small>
                  ) : null}
                  {evidence.unknownSceneThreeChunkIds.length > 0 ? (
                    <small>
                      历史或未知功能：{evidence.unknownSceneThreeChunkIds.join('、')}（不计入覆盖率）
                    </small>
                  ) : null}
                </div>
                <button
                  type="button"
                  disabled={
                    !allFunctionsModeled
                    || !evidence.commonProjectRoot
                    || !canSend
                    || streaming
                  }
                  onClick={() => void sendText(
                    buildDslQueryPrompt(evidence.commonProjectRoot ?? ''),
                  )}
                >
                  查询项目 DSL 产物
                </button>
              </div>

              {evidence.dslQueryIndex !== null ? (
                <div className="ontology-workflow__dsl-review">
                  <div className="ontology-workflow__guidance-heading">
                    <div>
                      <strong>审核最新项目 DSL</strong>
                      <span>
                        {dslPayload?.state === 'success'
                          ? '结构化结果已成功解析，请结合时间线中的 DSL 卡片人工审核。'
                          : dslPayload?.state === 'loading'
                            ? '已识别工具调用，正在等待结构化结果。'
                            : dslPayload?.state === 'remote-error'
                              ? 'Skill 返回错误，请修正输入后重新查询。'
                              : dslPayload?.state === 'parse-error'
                                ? '工具结果解析失败，请重新查询。'
                                : '已发送查询，正在等待 DSL 工具面板。'}
                      </span>
                    </div>
                    {dslPayload ? <em>{dslPayload.state}</em> : null}
                  </div>
                  {dslPayload?.state === 'success' ? (
                    <>
                      <dl className="ontology-workflow__stats">
                        <div><dt>chunks 功能</dt><dd>{evidence.functions.length}</dd></div>
                        <div><dt>DSL 功能</dt><dd>{dslPayload.envelope.summary.feature_count}</dd></div>
                        <div><dt>需求</dt><dd>{dslPayload.envelope.summary.requirement_count}</dd></div>
                        <div><dt>DSL 产物</dt><dd>{dslPayload.envelope.summary.artifact_count}</dd></div>
                        <div><dt>映射</dt><dd>{dslPayload.envelope.summary.relationship_count}</dd></div>
                        <div><dt>无产物需求</dt><dd>{dslPayload.envelope.summary.empty_artifact_requirement_count}</dd></div>
                        <div><dt>元数据缺失</dt><dd>{dslPayload.envelope.summary.metadata_missing_count}</dd></div>
                        <div><dt>Warnings</dt><dd>{dslPayload.envelope.warnings.length}</dd></div>
                      </dl>
                      <div className={`ontology-workflow__coverage ontology-workflow__coverage--${dslCoverageMatches ? 'matched' : 'mismatched'}`}>
                        {dslCoverageMatches
                          ? '功能数量一致，可以在人工审核后确认。'
                          : `功能数量不一致：chunks ${evidence.functions.length}，DSL ${dslFeatureCount}。`}
                      </div>
                      <div className="ontology-workflow__actions">
                        <button
                          type="button"
                          disabled={!dslCoverageMatches || !canSend || streaming}
                          onClick={onConfirmFunctionModeling}
                        >
                          确定全部功能 DSL 已审核
                        </button>
                      </div>
                    </>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
          {sendError ? <p className="ontology-workflow__error" role="alert">{sendError}</p> : null}
        </div>
      ) : null}
    </section>
  )
}

export default OntologyWorkflowPanel
