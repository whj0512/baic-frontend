import { useEffect, useState } from 'react'
import { useOntologyWorkflowInteraction } from '../../context/interactionContext'
import {
  MARKDOWN_SELECTION,
  PROJECT_ROOT_SELECTION,
} from '../shared/pathSelectionOptions'
import type { BaseStagePanelProps } from './stagePanelTypes'
import type { SceneThreeFormValues } from '../../core/types'
import WorkflowPathPicker from '../shared/WorkflowPathPicker'
import {
  buildDslQueryPrompt,
  buildSceneThreePrompt,
} from '../../core/workflowProtocol'

interface FunctionModelingStagePanelProps extends BaseStagePanelProps {
  onConfirm: () => void
}

const EMPTY_FORM: SceneThreeFormValues = {
  functionMarkdown: '',
  projectRoot: '',
  additionalRequirements: '',
}

function FunctionModelingStagePanel({
  evidence,
  canSend,
  streaming,
  sendText,
  onConfirm,
}: FunctionModelingStagePanelProps) {
  const [form, setForm] = useState(EMPTY_FORM)
  const interaction = useOntologyWorkflowInteraction()
  const selectedFunction = evidence.functions.find(
    (item) => item.chunkId === interaction?.selectedChunkId,
  ) ?? null
  const selectedProgress = selectedFunction
    ? evidence.functionProgress.get(selectedFunction.chunkId) ?? null
    : null
  const allFunctionsModeled =
    evidence.functions.length > 0
    && evidence.modeledFunctionCount === evidence.functions.length
  const pendingFunctions = evidence.functions.filter(
    (item) => !evidence.functionProgress.has(item.chunkId),
  )
  const inconsistentFunctions = evidence.functions.filter(
    (item) => evidence.inconsistentProjectRootChunkIds.includes(item.chunkId),
  )
  const dslPayload = evidence.dslPayload
  const dslFeatureCount = dslPayload?.state === 'success'
    ? dslPayload.envelope.summary.feature_count
    : null
  const dslModelCount = dslPayload?.state === 'success'
    ? dslPayload.envelope.protocol_version === '2.0'
      ? dslPayload.envelope.summary.model_count
      : dslPayload.envelope.summary.artifact_count
    : null
  const emptyDslRequirementCount = dslPayload?.state === 'success'
    ? dslPayload.envelope.protocol_version === '2.0'
      ? dslPayload.envelope.summary.empty_model_requirement_count
      : dslPayload.envelope.summary.empty_artifact_requirement_count
    : null
  const dslCoverageMatches =
    dslFeatureCount !== null && dslFeatureCount === evidence.functions.length
  const ready = Boolean(
    selectedFunction && form.functionMarkdown.trim() && form.projectRoot.trim(),
  )

  useEffect(() => {
    if (!selectedFunction) {
      setForm(EMPTY_FORM)
      return
    }
    setForm({
      functionMarkdown:
        selectedProgress?.functionMarkdown
        || selectedFunction.resolvedMarkdownPath
        || '',
      projectRoot: selectedProgress?.projectRoot || selectedFunction.projectRoot,
      additionalRequirements: '',
    })

    const frame = requestAnimationFrame(() => {
      const selection = document.getElementById('ontology-workflow-selection')
      selection?.focus({ preventScroll: true })
      selection?.scrollIntoView({ block: 'nearest' })
    })
    return () => cancelAnimationFrame(frame)
  }, [selectedFunction?.chunkId, selectedProgress?.latestMessageIndex])

  const sendSceneThree = async () => {
    if (!selectedFunction || !ready) {
      return
    }
    const sent = await sendText(buildSceneThreePrompt(selectedFunction, form))
    if (sent) {
      setForm((current) => ({ ...current, additionalRequirements: '' }))
    }
  }

  return (
    <>
      <div className="ontology-workflow__guidance-heading">
        <div>
          <strong>流水线二 · 场景 3 单功能建模</strong>
          <span>逐个发起功能建模，全部覆盖后再查询项目 DSL。</span>
        </div>
        <em>已覆盖 {evidence.modeledFunctionCount}/{evidence.functions.length}</em>
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
                  value={form.functionMarkdown}
                  placeholder="请填写或选择 Markdown 绝对路径"
                  selection={MARKDOWN_SELECTION}
                  onChange={(value) => setForm((current) => ({
                    ...current,
                    functionMarkdown: value,
                  }))}
                />
              </label>
              <label>
                <span>项目根目录 *</span>
                <WorkflowPathPicker
                  value={form.projectRoot}
                  placeholder="DSL 项目根目录"
                  selection={PROJECT_ROOT_SELECTION}
                  onChange={(value) => setForm((current) => ({
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
                  value={form.additionalRequirements}
                  placeholder="选填；不会覆盖原文、DSL 对齐和失败停止约束"
                  onChange={(event) => setForm((current) => ({
                    ...current,
                    additionalRequirements: event.target.value,
                  }))}
                />
              </label>
            </div>
            <div className="ontology-workflow__actions">
              <button
                type="button"
                disabled={!ready || !canSend || streaming}
                onClick={() => void sendSceneThree()}
              >
                {selectedProgress ? '重新发送场景 3' : '发送场景 3'}
              </button>
              {!ready ? <small>请填写功能 Markdown 和项目根目录。</small> : null}
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
                <div><dt>DSL 模型</dt><dd>{dslModelCount}</dd></div>
                <div><dt>映射</dt><dd>{dslPayload.envelope.summary.relationship_count}</dd></div>
                <div><dt>无模型需求</dt><dd>{emptyDslRequirementCount}</dd></div>
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
                  onClick={onConfirm}
                >
                  确定全部功能 DSL 已审核
                </button>
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </>
  )
}

export default FunctionModelingStagePanel
