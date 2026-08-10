import { useState } from 'react'
import {
  DownOutlined,
  UpOutlined,
} from '@ant-design/icons'
import {
  createOntologyScene10Prompt,
  createOntologyScene10ResultsQueryPrompt,
  createOntologyScene9Prompt,
  createOntologyScene9ResultsQueryPrompt,
  ONTOLOGY_QA_QUICK_PROMPTS,
} from './promptTemplates'
import type { OntologyQaQuickPromptsProps } from './types'
import './OntologyQaQuickPrompts.css'

const DEFAULT_REPOSITORY_NAME = 'requirement'
const INFERENCE_AUTHORIZATION =
  '我明确授权在上述 GraphDB 仓库执行本体关系推理。'

function OntologyQaQuickPrompts({
  projectDisplayName,
  demoMode,
  disabled,
  disabledReason,
  onApplyPrompt,
}: OntologyQaQuickPromptsProps) {
  const [expanded, setExpanded] = useState(true)
  const [repositoryName, setRepositoryName] = useState(DEFAULT_REPOSITORY_NAME)
  const [queryRepositoryName, setQueryRepositoryName] = useState(
    DEFAULT_REPOSITORY_NAME,
  )
  const [scene10RepositoryName, setScene10RepositoryName] = useState(
    DEFAULT_REPOSITORY_NAME,
  )
  const [scene10FunctionName, setScene10FunctionName] = useState(
    demoMode ? '蓝牙音乐' : '',
  )
  const [scene10QueryFunctionName, setScene10QueryFunctionName] = useState(
    demoMode ? '蓝牙音乐' : '',
  )
  const [inferenceAuthorized, setInferenceAuthorized] = useState(false)
  const trimmedRepositoryName = repositoryName.trim()
  const trimmedQueryRepositoryName = queryRepositoryName.trim()
  const trimmedScene10RepositoryName = scene10RepositoryName.trim()
  const trimmedScene10FunctionName = scene10FunctionName.trim()
  const trimmedScene10QueryFunctionName = scene10QueryFunctionName.trim()
  const repositoryInvalid = trimmedRepositoryName.length === 0
  const queryRepositoryInvalid = trimmedQueryRepositoryName.length === 0
  const scene10RepositoryInvalid = trimmedScene10RepositoryName.length === 0
  const scene10FunctionInvalid = trimmedScene10FunctionName.length === 0
  const scene10QueryFunctionInvalid =
    trimmedScene10QueryFunctionName.length === 0
  const scene9 = ONTOLOGY_QA_QUICK_PROMPTS[0]
  const scene9Results = ONTOLOGY_QA_QUICK_PROMPTS[1]
  const scene10 = ONTOLOGY_QA_QUICK_PROMPTS[2]
  const scene10Results = ONTOLOGY_QA_QUICK_PROMPTS[3]
  const scene9Disabled = disabled || repositoryInvalid || !inferenceAuthorized
  const scene9ResultsDisabled = disabled || queryRepositoryInvalid
  const scene10Disabled = disabled
    || scene10RepositoryInvalid
    || scene10FunctionInvalid
  const scene10ResultsDisabled = disabled || scene10QueryFunctionInvalid
  const scene9DisabledReason = disabledReason
    || (repositoryInvalid
      ? '请先填写非空的 GraphDB 仓库名称'
      : !inferenceAuthorized
        ? '请先勾选本次推理授权'
        : undefined)
  const scene9ResultsDisabledReason = disabledReason
    || (queryRepositoryInvalid
      ? '请先填写非空的 GraphDB 仓库名称'
      : undefined)
  const scene10DisabledReason = disabledReason
    || (scene10RepositoryInvalid
      ? '请先填写非空的 GraphDB 仓库名称'
      : scene10FunctionInvalid
        ? '请先填写非空的功能名称'
        : undefined)
  const scene10ResultsDisabledReason = disabledReason
    || (scene10QueryFunctionInvalid
      ? '请先填写非空的功能名称'
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
            <UpOutlined aria-hidden="true" />
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
            <DownOutlined />
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
        <article className="ontology-qa-prompt-card ontology-qa-prompt-card--authorized ontology-qa-prompt-card--scene-9">
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

        <article className="ontology-qa-prompt-card ontology-qa-prompt-card--scene-9-results">
          <header>
            <strong>{scene9Results.label}</strong>
            <span>{scene9Results.description}</span>
          </header>
          <label className="ontology-qa-prompt-card__field">
            <span>仓库名称</span>
            <input
              type="text"
              value={queryRepositoryName}
              disabled={disabled}
              aria-required="true"
              aria-invalid={queryRepositoryInvalid}
              aria-describedby={queryRepositoryInvalid
                ? 'ontology-scene-9-results-repository-error'
                : undefined}
              onChange={(event) => setQueryRepositoryName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                }
              }}
            />
          </label>
          {queryRepositoryInvalid ? (
            <span
              id="ontology-scene-9-results-repository-error"
              className="ontology-qa-prompt-card__error"
              role="alert"
            >
              仓库名称不能为空
            </span>
          ) : null}
          <p>
            保留 <code>&lt;绝对项目目录&gt;</code> 供你在草稿中补充。
          </p>
          <button
            type="button"
            disabled={scene9ResultsDisabled}
            aria-describedby={scene9ResultsDisabled
              ? 'ontology-scene-9-results-disabled-reason'
              : undefined}
            title={scene9ResultsDisabledReason
              || '将场景 9 结果查询 Skill 模板填入聊天输入框'}
            onClick={() => onApplyPrompt(
              createOntologyScene9ResultsQueryPrompt(
                trimmedQueryRepositoryName,
              ),
            )}
          >
            填入聊天输入框
          </button>
          {scene9ResultsDisabled ? (
            <span
              id="ontology-scene-9-results-disabled-reason"
              className="ontology-qa-prompt-card__hint"
            >
              {scene9ResultsDisabledReason}
            </span>
          ) : null}
        </article>

        <article className="ontology-qa-prompt-card ontology-qa-prompt-card--scene-10">
          <header>
            <strong>{scene10.label}</strong>
            <span>{scene10.description}</span>
          </header>
          <label className="ontology-qa-prompt-card__field">
            <span>仓库名称</span>
            <input
              type="text"
              value={scene10RepositoryName}
              disabled={disabled}
              aria-required="true"
              aria-invalid={scene10RepositoryInvalid}
              aria-describedby={scene10RepositoryInvalid
                ? 'ontology-scene-10-repository-error'
                : undefined}
              onChange={(event) => setScene10RepositoryName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                }
              }}
            />
          </label>
          {scene10RepositoryInvalid ? (
            <span
              id="ontology-scene-10-repository-error"
              className="ontology-qa-prompt-card__error"
              role="alert"
            >
              仓库名称不能为空
            </span>
          ) : null}
          <label className="ontology-qa-prompt-card__field">
            <span>功能名称</span>
            <input
              type="text"
              value={scene10FunctionName}
              placeholder="请输入功能名称"
              disabled={disabled}
              aria-required="true"
              aria-invalid={scene10FunctionInvalid}
              aria-describedby={scene10FunctionInvalid
                ? 'ontology-scene-10-function-error'
                : undefined}
              onChange={(event) => setScene10FunctionName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                }
              }}
            />
          </label>
          {scene10FunctionInvalid ? (
            <span
              id="ontology-scene-10-function-error"
              className="ontology-qa-prompt-card__error"
              role="alert"
            >
              功能名称不能为空
            </span>
          ) : null}
          <p>
            保留 <code>&lt;绝对项目目录&gt;</code> 供你在草稿中编辑。
          </p>
          <button
            type="button"
            disabled={scene10Disabled}
            aria-describedby={scene10Disabled
              ? 'ontology-scene-10-disabled-reason'
              : undefined}
            title={scene10DisabledReason || '将场景 10 模板填入聊天输入框'}
            onClick={() => onApplyPrompt(
              createOntologyScene10Prompt(
                trimmedScene10RepositoryName,
                trimmedScene10FunctionName,
              ),
            )}
          >
            填入聊天输入框
          </button>
          {scene10Disabled ? (
            <span
              id="ontology-scene-10-disabled-reason"
              className="ontology-qa-prompt-card__hint"
            >
              {scene10DisabledReason}
            </span>
          ) : null}
        </article>

        <article className="ontology-qa-prompt-card ontology-qa-prompt-card--scene-10-results">
          <header>
            <strong>{scene10Results.label}</strong>
            <span>{scene10Results.description}</span>
          </header>
          <label className="ontology-qa-prompt-card__field">
            <span>功能名称</span>
            <input
              type="text"
              value={scene10QueryFunctionName}
              placeholder="请输入功能名称"
              disabled={disabled}
              aria-required="true"
              aria-invalid={scene10QueryFunctionInvalid}
              aria-describedby={scene10QueryFunctionInvalid
                ? 'ontology-scene-10-results-function-error'
                : undefined}
              onChange={(event) =>
                setScene10QueryFunctionName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                }
              }}
            />
          </label>
          {scene10QueryFunctionInvalid ? (
            <span
              id="ontology-scene-10-results-function-error"
              className="ontology-qa-prompt-card__error"
              role="alert"
            >
              功能名称不能为空
            </span>
          ) : null}
          <p>
            保留 <code>&lt;绝对项目目录&gt;</code> 供你在草稿中补充。
          </p>
          <button
            type="button"
            disabled={scene10ResultsDisabled}
            aria-describedby={scene10ResultsDisabled
              ? 'ontology-scene-10-results-disabled-reason'
              : undefined}
            title={scene10ResultsDisabledReason
              || '将场景 10 功能关系查询 Skill 模板填入聊天输入框'}
            onClick={() => onApplyPrompt(
              createOntologyScene10ResultsQueryPrompt(
                trimmedScene10QueryFunctionName,
              ),
            )}
          >
            填入聊天输入框
          </button>
          {scene10ResultsDisabled ? (
            <span
              id="ontology-scene-10-results-disabled-reason"
              className="ontology-qa-prompt-card__hint"
            >
              {scene10ResultsDisabledReason}
            </span>
          ) : null}
        </article>
      </div>
      </section>
    </>
  )
}

export default OntologyQaQuickPrompts
