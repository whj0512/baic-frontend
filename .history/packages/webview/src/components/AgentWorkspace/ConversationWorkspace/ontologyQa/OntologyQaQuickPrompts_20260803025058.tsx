import { useState } from 'react'
import {
  DownOutlined,
  UpOutlined,
} from '@ant-design/icons'
import {
  createOntologyScene10Prompt,
  createOntologyScene9Prompt,
  ONTOLOGY_QA_QUICK_PROMPTS,
} from './promptTemplates'
import type { OntologyQaQuickPromptsProps } from './types'
import './OntologyQaQuickPrompts.css'

const DEFAULT_REPOSITORY_NAME = 'requirement'
const INFERENCE_AUTHORIZATION =
  '我明确授权在上述 GraphDB 仓库执行本体关系推理。'

function OntologyQaQuickPrompts({
  projectDisplayName,
  disabled,
  disabledReason,
  onApplyPrompt,
}: OntologyQaQuickPromptsProps) {
  const [expanded, setExpanded] = useState(true)
  const [repositoryName, setRepositoryName] = useState(DEFAULT_REPOSITORY_NAME)
  const [inferenceAuthorized, setInferenceAuthorized] = useState(false)
  const trimmedRepositoryName = repositoryName.trim()
  const repositoryInvalid = trimmedRepositoryName.length === 0
  const scene9 = ONTOLOGY_QA_QUICK_PROMPTS[0]
  const scene10 = ONTOLOGY_QA_QUICK_PROMPTS[1]
  const scene9Disabled = disabled || repositoryInvalid || !inferenceAuthorized
  const scene9DisabledReason = disabledReason
    || (repositoryInvalid
      ? '请先填写非空的 GraphDB 仓库名称'
      : !inferenceAuthorized
        ? '请先勾选本次推理授权'
        : undefined)

  return (
    <>
      {!expanded ? (
        <div className="ontology-qa-prompts__reveal">
          <button
            type="button"
            aria-expanded="false"
            aria-controls="ontology-qa-prompts-panel"
            aria-label="展开快捷模板面板"
            title="展开快捷模板面板"
            onClick={() => setExpanded(true)}
          >
            <span className="ontology-qa-prompts__toggle-icon" aria-hidden="true">
              <UpOutlined />
            </span>
            <span>展开快捷模板</span>
          </button>
        </div>
      ) : null}
      <section
        id="ontology-qa-prompts-panel"
        className="ontology-qa-prompts"
        aria-labelledby="ontology-qa-prompts-title"
        hidden={!expanded}
      >
      <div className="ontology-qa-prompts__heading">
        <div className="ontology-qa-prompts__heading-copy">
          <strong id="ontology-qa-prompts-title">快捷模板</strong>
          <span>模板只会填入草稿，不会自动发送或执行。</span>
        </div>
        <button
          type="button"
          className="ontology-qa-prompts__toggle"
          aria-expanded="true"
          aria-controls="ontology-qa-prompts-content"
          aria-label="收起快捷模板面板"
          title="收起快捷模板面板"
          onClick={() => setExpanded(false)}
        >
          <span className="ontology-qa-prompts__toggle-icon" aria-hidden="true">
            < DownOutlined />
          </span>
          <span className="ontology-qa-prompts__toggle-label">
            收起
          </span>
        </button>
      </div>
      <div
        id="ontology-qa-prompts-content"
        className="ontology-qa-prompts__grid"
      >
        <article className="ontology-qa-prompt-card ontology-qa-prompt-card--authorized">
          <header>
            <strong>{scene9.label}</strong>
            <span>{scene9.description}</span>
          </header>
          <label className="ontology-qa-prompt-card__field">
            <span>仓库名称</span>
            <input
              type="text"
              value={repositoryName}
              disabled={disabled}
              aria-required="true"
              aria-invalid={repositoryInvalid}
              aria-describedby={repositoryInvalid
                ? 'ontology-scene-9-repository-error'
                : undefined}
              onChange={(event) => setRepositoryName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                }
              }}
            />
          </label>
          {repositoryInvalid ? (
            <span
              id="ontology-scene-9-repository-error"
              className="ontology-qa-prompt-card__error"
              role="alert"
            >
              仓库名称不能为空
            </span>
          ) : null}
          <label className="ontology-qa-prompt-card__authorization">
            <input
              type="checkbox"
              checked={inferenceAuthorized}
              disabled={disabled}
              onChange={(event) => setInferenceAuthorized(event.target.checked)}
            />
            <span>{INFERENCE_AUTHORIZATION}</span>
          </label>
          <button
            type="button"
            disabled={scene9Disabled}
            aria-describedby={scene9Disabled
              ? 'ontology-scene-9-disabled-reason'
              : undefined}
            title={scene9DisabledReason || '将场景 9 模板填入聊天输入框'}
            onClick={() => onApplyPrompt(
              createOntologyScene9Prompt(
                trimmedRepositoryName,
                projectDisplayName,
              ),
              () => setInferenceAuthorized(false),
            )}
          >
            填入聊天输入框
          </button>
          {scene9Disabled ? (
            <span
              id="ontology-scene-9-disabled-reason"
              className="ontology-qa-prompt-card__hint"
            >
              {scene9DisabledReason}
            </span>
          ) : null}
        </article>

        <article className="ontology-qa-prompt-card">
          <header>
            <strong>{scene10.label}</strong>
            <span>{scene10.description}</span>
          </header>
          <p>
            保留 <code>&lt;功能名&gt;</code> 供你在草稿中编辑；固定查询
            <code> requirement </code>仓库。
          </p>
          <button
            type="button"
            disabled={disabled}
            aria-describedby={disabled
              ? 'ontology-scene-10-disabled-reason'
              : undefined}
            title={disabledReason || '将场景 10 模板填入聊天输入框'}
            onClick={() => onApplyPrompt(createOntologyScene10Prompt())}
          >
            填入聊天输入框
          </button>
          {disabled ? (
            <span
              id="ontology-scene-10-disabled-reason"
              className="ontology-qa-prompt-card__hint"
            >
              {disabledReason}
            </span>
          ) : null}
        </article>
      </div>
      </section>
    </>
  )
}

export default OntologyQaQuickPrompts
