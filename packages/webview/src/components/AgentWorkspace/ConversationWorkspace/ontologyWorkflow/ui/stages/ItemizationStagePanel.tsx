import { useState } from 'react'
import {
  MARKDOWN_SELECTION,
  PROJECT_ROOT_SELECTION,
  SOURCE_DOCUMENT_SELECTION,
} from '../shared/pathSelectionOptions'
import type { BaseStagePanelProps } from './stagePanelTypes'
import type { SceneOneFormValues } from '../../core/types'
import WorkflowPathPicker from '../shared/WorkflowPathPicker'
import {
  buildChunksQueryPrompt,
  buildChunksRecoveryPrompt,
  buildSceneOnePrompt,
} from '../../core/workflowProtocol'

interface ItemizationStagePanelProps extends BaseStagePanelProps {
  onConfirm: () => void
}

const EMPTY_FORM: SceneOneFormValues = {
  sourceDocument: '',
  mineruMarkdown: '',
  projectRoot: '',
  additionalConstraints: '',
}

function ItemizationStagePanel({
  evidence,
  canSend,
  streaming,
  sendText,
  onConfirm,
}: ItemizationStagePanelProps) {
  const [form, setForm] = useState(EMPTY_FORM)
  const chunksSucceeded = evidence.chunksEnvelope?.status === 'success'
  const chunksProjectRoot = evidence.sceneOne?.projectRoot
    || evidence.recoveryProjectRoot
    || evidence.functions.find((item) => item.projectRoot)?.projectRoot
    || ''
  const unsafePathCount = evidence.functions.filter(
    (item) => !item.resolvedMarkdownPath,
  ).length
  const missingFields = [
    !form.sourceDocument.trim() ? '原始文档' : null,
    !form.mineruMarkdown.trim() ? 'MinerU Markdown' : null,
    !form.projectRoot.trim() ? '项目根目录' : null,
  ].filter((value): value is string => Boolean(value))
  const ready = missingFields.length === 0

  return (
    <>
      <div className="ontology-workflow__guidance-heading">
        <div>
          <strong>流水线一 · 场景 1</strong>
          <span>填写本地绝对路径，发送条目化提示词。</span>
        </div>
        {evidence.sceneOne ? <em>场景 1 已发起</em> : null}
      </div>

      {!chunksSucceeded && evidence.compressedChunksArchiveDetected ? (
        <div className="ontology-workflow__checkpoint ontology-workflow__checkpoint--stacked">
          <div>
            <strong>检测到上下文压缩归档</strong>
            <span>
              原 chunks 围栏已不在当前窗口；检测到
              {evidence.recoverableSceneThreeCount} 条可恢复的场景 3 消息。
            </span>
            {!evidence.recoveryProjectRoot ? (
              <small role="alert">
                幸存消息中的项目根目录缺失或不一致，无法安全自动选择查询范围。
              </small>
            ) : null}
          </div>
          <button
            type="button"
            disabled={!evidence.recoveryProjectRoot || !canSend || streaming}
            onClick={() => void sendText(buildChunksRecoveryPrompt(
              evidence.recoveryProjectRoot ?? '',
            ))}
          >
            重新查询并恢复功能清单
          </button>
        </div>
      ) : null}

      <div className="ontology-workflow__form-grid">
        <label>
          <span>原始文档 *</span>
          <WorkflowPathPicker
            value={form.sourceDocument}
            placeholder="DOCX/PDF 绝对路径"
            selection={SOURCE_DOCUMENT_SELECTION}
            onChange={(value) => setForm((current) => ({
              ...current,
              sourceDocument: value,
            }))}
          />
        </label>
        <label>
          <span>MinerU Markdown *</span>
          <WorkflowPathPicker
            value={form.mineruMarkdown}
            placeholder="Markdown 绝对路径"
            selection={MARKDOWN_SELECTION}
            onChange={(value) => setForm((current) => ({
              ...current,
              mineruMarkdown: value,
            }))}
          />
        </label>
        <label>
          <span>项目根目录 *</span>
          <WorkflowPathPicker
            value={form.projectRoot}
            placeholder="输出目录绝对路径"
            selection={PROJECT_ROOT_SELECTION}
            onChange={(value) => setForm((current) => ({
              ...current,
              projectRoot: value,
            }))}
          />
        </label>
        <label className="ontology-workflow__form-field--wide">
          <span>补充限制</span>
          <textarea
            value={form.additionalConstraints}
            placeholder="选填；不会覆盖固定的关系证据与目录推断限制"
            rows={2}
            onChange={(event) => setForm((current) => ({
              ...current,
              additionalConstraints: event.target.value,
            }))}
          />
        </label>
      </div>

      <div className="ontology-workflow__actions">
        <button
          type="button"
          disabled={!ready || !canSend || streaming}
          onClick={() => void sendText(buildSceneOnePrompt(form))}
        >
          发送场景 1
        </button>
        {!ready ? <small>请填写：{missingFields.join('、')}</small> : null}
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
          <div className="ontology-workflow__checkpoint-actions">
            <button
              type="button"
              className="ontology-workflow__button--secondary"
              disabled={!chunksProjectRoot || !canSend || streaming}
              onClick={() => void sendText(buildChunksQueryPrompt(chunksProjectRoot))}
            >
              重新查询功能清单
            </button>
            <button
              type="button"
              disabled={evidence.functions.length === 0 || !canSend || streaming}
              onClick={onConfirm}
            >
              确定条目化结果，进入功能建模
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}

export default ItemizationStagePanel
