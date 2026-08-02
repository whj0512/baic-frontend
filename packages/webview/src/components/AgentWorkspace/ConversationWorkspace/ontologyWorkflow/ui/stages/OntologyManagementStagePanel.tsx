import { useEffect, useState } from 'react'
import {
  PROJECT_ROOT_SELECTION,
  TTL_SELECTION,
} from '../shared/pathSelectionOptions'
import type { BaseStagePanelProps } from './stagePanelTypes'
import type {
  SceneEightFormValues,
  SceneNineFormValues,
  SceneSevenFormValues,
} from '../../core/types'
import WorkflowPathPicker from '../shared/WorkflowPathPicker'
import {
  buildOntologyQueryPrompt,
  buildSceneEightPrompt,
  buildSceneNinePrompt,
  buildSceneSevenPrompt,
} from '../../core/workflowProtocol'

const EMPTY_SCENE_SEVEN_FORM: SceneSevenFormValues = {
  projectRoot: '',
  ttlOutputPath: '',
  additionalRequirements: '',
}

const EMPTY_SCENE_EIGHT_FORM: SceneEightFormValues = {
  ttlPath: '',
  graphDbUrl: 'http://localhost:7200',
  repository: 'requirement',
}

const EMPTY_SCENE_NINE_FORM: SceneNineFormValues = {
  projectIdentifier: '',
  graphDbUrl: 'http://localhost:7200',
  repository: 'requirement',
}

function OntologyManagementStagePanel({
  evidence,
  canSend,
  streaming,
  sendText,
}: BaseStagePanelProps) {
  const [sceneSevenForm, setSceneSevenForm] = useState(EMPTY_SCENE_SEVEN_FORM)
  const [sceneEightForm, setSceneEightForm] = useState(EMPTY_SCENE_EIGHT_FORM)
  const [sceneNineForm, setSceneNineForm] = useState(EMPTY_SCENE_NINE_FORM)
  const [sceneSevenConfirmed, setSceneSevenConfirmed] = useState(false)
  const [sceneEightConfirmed, setSceneEightConfirmed] = useState(false)
  const [writeAuthorized, setWriteAuthorized] = useState(false)
  const [inferenceAuthorized, setInferenceAuthorized] = useState(false)
  const completed = evidence.ontologyPayload?.state === 'ready'
  const sceneSevenConfirmedForView = Boolean(
    evidence.sceneEight || sceneSevenConfirmed,
  )
  const sceneEightConfirmedForView = Boolean(
    evidence.sceneNine || sceneEightConfirmed,
  )
  const sceneSevenReady = Boolean(
    sceneSevenForm.projectRoot.trim() && sceneSevenForm.ttlOutputPath.trim(),
  )
  const sceneEightReady = Boolean(
    sceneEightForm.ttlPath.trim()
    && sceneEightForm.graphDbUrl.trim()
    && sceneEightForm.repository.trim()
    && writeAuthorized,
  )
  const sceneNineReady = Boolean(
    sceneNineForm.projectIdentifier.trim()
    && sceneNineForm.graphDbUrl.trim()
    && sceneNineForm.repository.trim()
    && inferenceAuthorized,
  )

  useEffect(() => {
    setSceneSevenForm((current) => ({
      projectRoot:
        evidence.sceneSeven?.projectRoot
        || current.projectRoot
        || evidence.commonProjectRoot
        || '',
      ttlOutputPath:
        evidence.sceneSeven?.ttlOutputPath || current.ttlOutputPath,
      additionalRequirements:
        evidence.sceneSeven?.additionalRequirements
        || current.additionalRequirements,
    }))
  }, [evidence.commonProjectRoot, evidence.sceneSeven?.messageIndex])

  useEffect(() => {
    if (!sceneSevenConfirmedForView) {
      return
    }
    setSceneEightForm((current) => ({
      ttlPath:
        evidence.sceneEight?.ttlPath
        || evidence.sceneSeven?.ttlOutputPath
        || current.ttlPath,
      graphDbUrl: evidence.sceneEight?.graphDbUrl || current.graphDbUrl,
      repository: evidence.sceneEight?.repository || current.repository,
    }))
  }, [
    sceneSevenConfirmedForView,
    evidence.sceneEight?.messageIndex,
    evidence.sceneSeven?.ttlOutputPath,
  ])

  useEffect(() => {
    if (!sceneEightConfirmedForView) {
      return
    }
    setSceneNineForm((current) => ({
      projectIdentifier:
        evidence.sceneNine?.projectIdentifier
        || evidence.projectName
        || evidence.sceneSeven?.projectRoot
        || evidence.commonProjectRoot
        || current.projectIdentifier,
      graphDbUrl:
        evidence.sceneNine?.graphDbUrl
        || evidence.sceneEight?.graphDbUrl
        || current.graphDbUrl,
      repository:
        evidence.sceneNine?.repository
        || evidence.sceneEight?.repository
        || current.repository,
    }))
  }, [
    sceneEightConfirmedForView,
    evidence.commonProjectRoot,
    evidence.projectName,
    evidence.sceneEight?.messageIndex,
    evidence.sceneNine?.messageIndex,
    evidence.sceneSeven?.projectRoot,
  ])

  const sendSceneSeven = async () => {
    if (!sceneSevenReady) {
      return
    }
    const sent = await sendText(buildSceneSevenPrompt(sceneSevenForm))
    if (sent) {
      setSceneSevenConfirmed(false)
      setSceneEightConfirmed(false)
      setWriteAuthorized(false)
      setInferenceAuthorized(false)
    }
  }

  const sendSceneEight = async () => {
    if (!sceneEightReady) {
      return
    }
    setWriteAuthorized(false)
    const sent = await sendText(buildSceneEightPrompt(sceneEightForm))
    if (sent) {
      setSceneEightConfirmed(false)
      setInferenceAuthorized(false)
    }
  }

  const sendSceneNine = async () => {
    if (!sceneNineReady) {
      return
    }
    setInferenceAuthorized(false)
    await sendText(buildSceneNinePrompt(sceneNineForm))
  }

  return (
    <>
      <div className="ontology-workflow__guidance-heading">
        <div>
          <strong>流水线三 · 本体关系管理</strong>
          <span>本地 TTL、GraphDB 写入和关系推理依次人工放行。</span>
        </div>
        {completed ? <em>流程已完成</em> : null}
      </div>

      <section className="ontology-workflow__management-step">
        <div className="ontology-workflow__guidance-heading">
          <div>
            <strong>场景 7 · 本地 TTL 校验</strong>
            <span>只生成并校验本地 Turtle，不访问 GraphDB。</span>
          </div>
          {evidence.sceneSeven ? <em>已发起</em> : null}
        </div>
        <div className="ontology-workflow__form-grid">
          <label>
            <span>项目根目录 *</span>
            <WorkflowPathPicker
              value={sceneSevenForm.projectRoot}
              placeholder="DSL 项目根目录"
              selection={PROJECT_ROOT_SELECTION}
              onChange={(value) => setSceneSevenForm((current) => ({
                ...current,
                projectRoot: value,
              }))}
            />
          </label>
          <label>
            <span>TTL 输出路径 *</span>
            <WorkflowPathPicker
              value={sceneSevenForm.ttlOutputPath}
              placeholder="本地 TTL 绝对路径"
              selection={TTL_SELECTION}
              onChange={(value) => setSceneSevenForm((current) => ({
                ...current,
                ttlOutputPath: value,
              }))}
            />
            <small>可直接填写尚未创建的输出文件绝对路径。</small>
          </label>
          <label className="ontology-workflow__form-field--wide">
            <span>补充要求</span>
            <textarea
              rows={2}
              value={sceneSevenForm.additionalRequirements}
              placeholder="选填；不能覆盖本地只读和 GraphDB 禁止约束"
              onChange={(event) => setSceneSevenForm((current) => ({
                ...current,
                additionalRequirements: event.target.value,
              }))}
            />
          </label>
        </div>
        <div className="ontology-workflow__actions">
          <button
            type="button"
            disabled={!sceneSevenReady || !canSend || streaming}
            onClick={() => void sendSceneSeven()}
          >
            {evidence.sceneSeven ? '重新发送场景 7' : '发送场景 7'}
          </button>
        </div>
        {evidence.sceneSeven && !sceneSevenConfirmedForView ? (
          <div className="ontology-workflow__checkpoint">
            <div>
              <strong>等待本地 TTL 结果</strong>
              <span>
                {evidence.sceneSevenResponseIndex !== null
                  ? 'Assistant 已结束，请人工审核 TTL 与校验结果。'
                  : 'Assistant 仍未返回可确认的结果。'}
              </span>
            </div>
            <button
              type="button"
              disabled={evidence.sceneSevenResponseIndex === null || streaming}
              onClick={() => setSceneSevenConfirmed(true)}
            >
              TTL 与本地校验已确认
            </button>
          </div>
        ) : null}
      </section>

      {sceneSevenConfirmedForView ? (
        <section className="ontology-workflow__management-step">
          <div className="ontology-workflow__guidance-heading">
            <div>
              <strong>场景 8 · GraphDB 上传</strong>
              <span>仅在本次明确授权后追加项目 ABox。</span>
            </div>
            {evidence.sceneEight ? <em>已发起</em> : null}
          </div>
          <div className="ontology-workflow__form-grid">
            <label>
              <span>TTL 路径 *</span>
              <WorkflowPathPicker
                value={sceneEightForm.ttlPath}
                placeholder="待上传 TTL 绝对路径"
                selection={TTL_SELECTION}
                onChange={(value) => setSceneEightForm((current) => ({
                  ...current,
                  ttlPath: value,
                }))}
              />
            </label>
            <label>
              <span>GraphDB 地址 *</span>
              <input
                value={sceneEightForm.graphDbUrl}
                onChange={(event) => setSceneEightForm((current) => ({
                  ...current,
                  graphDbUrl: event.target.value,
                }))}
              />
            </label>
            <label>
              <span>仓库 *</span>
              <input
                value={sceneEightForm.repository}
                onChange={(event) => setSceneEightForm((current) => ({
                  ...current,
                  repository: event.target.value,
                }))}
              />
            </label>
          </div>
          <label className="ontology-workflow__authorization">
            <input
              type="checkbox"
              checked={writeAuthorized}
              onChange={(event) => setWriteAuthorized(event.target.checked)}
            />
            <span>我明确授权向上述 GraphDB 仓库追加本项目 ABox。</span>
          </label>
          <div className="ontology-workflow__actions">
            <button
              type="button"
              disabled={!sceneEightReady || !canSend || streaming}
              onClick={() => void sendSceneEight()}
            >
              {evidence.sceneEight ? '重新授权并发送场景 8' : '授权并发送场景 8'}
            </button>
            {!writeAuthorized ? <small>发送前必须明确勾选写入授权。</small> : null}
          </div>
          {evidence.sceneEight && !sceneEightConfirmedForView ? (
            <div className="ontology-workflow__checkpoint">
              <div>
                <strong>等待上传与 SHACL 结果</strong>
                <span>
                  {evidence.sceneEightResponseIndex !== null
                    ? 'Assistant 已结束，请人工审核上传和验证结果。'
                    : 'Assistant 仍未返回可确认的结果。'}
                </span>
              </div>
              <button
                type="button"
                disabled={evidence.sceneEightResponseIndex === null || streaming}
                onClick={() => setSceneEightConfirmed(true)}
              >
                上传与 SHACL 结果已确认
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      {sceneEightConfirmedForView ? (
        <section className="ontology-workflow__management-step">
          <div className="ontology-workflow__guidance-heading">
            <div>
              <strong>场景 9 · 本体关系推理</strong>
              <span>推理授权独立于场景 8 的写入授权。</span>
            </div>
            {evidence.sceneNine ? <em>已发起</em> : null}
          </div>
          <div className="ontology-workflow__form-grid">
            <label>
              <span>项目标识 *</span>
              <input
                value={sceneNineForm.projectIdentifier}
                onChange={(event) => setSceneNineForm((current) => ({
                  ...current,
                  projectIdentifier: event.target.value,
                }))}
              />
            </label>
            <label>
              <span>GraphDB 地址 *</span>
              <input
                value={sceneNineForm.graphDbUrl}
                onChange={(event) => setSceneNineForm((current) => ({
                  ...current,
                  graphDbUrl: event.target.value,
                }))}
              />
            </label>
            <label>
              <span>仓库 *</span>
              <input
                value={sceneNineForm.repository}
                onChange={(event) => setSceneNineForm((current) => ({
                  ...current,
                  repository: event.target.value,
                }))}
              />
            </label>
          </div>
          <label className="ontology-workflow__authorization">
            <input
              type="checkbox"
              checked={inferenceAuthorized}
              onChange={(event) => setInferenceAuthorized(event.target.checked)}
            />
            <span>我明确授权在上述 GraphDB 仓库执行本体关系推理。</span>
          </label>
          <div className="ontology-workflow__actions">
            <button
              type="button"
              disabled={!sceneNineReady || !canSend || streaming}
              onClick={() => void sendSceneNine()}
            >
              {evidence.sceneNine ? '重新授权并发送场景 9' : '授权并发送场景 9'}
            </button>
            {!inferenceAuthorized ? <small>发送前必须单独勾选推理授权。</small> : null}
          </div>
        </section>
      ) : null}

      {evidence.sceneNine ? (
        <div className="ontology-workflow__checkpoint ontology-workflow__checkpoint--stacked">
          <div>
            <strong>本体实例关系</strong>
            <span>
              {evidence.ontologyPayload?.state === 'ready'
                ? '本体实例工具结果已就绪，本轮流程完成。'
                : evidence.ontologyPayload?.state === 'loading'
                  ? '已识别工具调用，正在等待结构化结果。'
                  : evidence.ontologyPayload?.state === 'parse-error'
                    ? `工具结果解析失败：${evidence.ontologyPayload.message}`
                    : evidence.sceneNineResponseIndex !== null
                      ? '推理回复已结束，可以主动加载当前项目关系图。'
                      : '等待场景 9 推理结果。'}
            </span>
          </div>
          <button
            type="button"
            disabled={
              evidence.sceneNineResponseIndex === null
              || evidence.ontologyPayload?.state === 'loading'
              || !canSend
              || streaming
            }
            onClick={() => void sendText(buildOntologyQueryPrompt())}
          >
            {evidence.ontologyPayload?.state === 'parse-error'
              ? '重新查看本体实例关系'
              : '查看本体实例关系'}
          </button>
        </div>
      ) : null}
    </>
  )
}

export default OntologyManagementStagePanel
