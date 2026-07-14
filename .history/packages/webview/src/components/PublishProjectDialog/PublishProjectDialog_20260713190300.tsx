import { useEffect, useState } from 'react'
import { Alert, Button, Descriptions, Input, Modal, Spin, Typography } from 'antd'
import { CloudUploadOutlined } from '@ant-design/icons'
import { getSourceInstallationId } from '../../config/authClient'
import {
  getPlatformApiBaseUrl,
  getRemoteProjectUrl,
} from '../../config/platformApi'
import type { Project } from '../../models/Project'
import type { PublishResponse, PublishStage } from '../../models/ProjectPublishing'
import {
  fetchProjectSnapshot,
  publishProjectSnapshot,
} from '../../services/projectPublishing'
import './PublishProjectDialog.css'

interface PublishProjectDialogProps {
  open: boolean
  project: Project | null
  onClose: () => void
}

const { Text, Paragraph } = Typography

function PublishProjectDialog({ open, project, onClose }: PublishProjectDialogProps) {
  const [installationId, setInstallationId] = useState('')
  const [versionLabel, setVersionLabel] = useState('')
  const [releaseNotes, setReleaseNotes] = useState('')
  const [stage, setStage] = useState<PublishStage>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [result, setResult] = useState<PublishResponse | null>(null)

  const platformApiBaseUrl = getPlatformApiBaseUrl()
  const isPublishing = stage === 'exporting' || stage === 'uploading'

  useEffect(() => {
    if (!open) return

    setVersionLabel('')
    setReleaseNotes('')
    setStage('idle')
    setErrorMessage('')
    setResult(null)
    setInstallationId('')

    void getSourceInstallationId()
      .then(setInstallationId)
      .catch(error => {
        setStage('error')
        setErrorMessage(getErrorMessage(error, '无法读取本地安装标识'))
      })
  }, [open, project?.id])

  const handlePublish = async () => {
    if (!project || isPublishing) return

    if (!installationId) {
      setStage('error')
      setErrorMessage('本地安装标识尚未准备完成')
      return
    }

    if (!platformApiBaseUrl) {
      setStage('error')
      setErrorMessage('未配置远程平台 API 地址')
      return
    }

    setErrorMessage('')
    setResult(null)
    setStage('exporting')

    try {
      const snapshot = await fetchProjectSnapshot(project.id, installationId)
      setStage('uploading')
      const publishResult = await publishProjectSnapshot(
        snapshot,
        versionLabel,
        releaseNotes,
      )
      setResult(publishResult)
      setStage('success')
    } catch (error) {
      setStage('error')
      setErrorMessage(getErrorMessage(error, '项目发布失败'))
    }
  }

  const remoteProjectUrl = result
    ? getRemoteProjectUrl(result.remote_project_id, result.version_id)
    : ''

  return (
    <Modal
      open={open}
      title={
        <span className="publish-project-dialog__title">
          <CloudUploadOutlined />
          发布到远程平台
        </span>
      }
      width={640}
      closable={!isPublishing}
      mask={{ closable: !isPublishing }}
      onCancel={isPublishing ? undefined : onClose}
      footer={[
        <Button key="cancel" onClick={onClose} disabled={isPublishing}>
          {stage === 'success' ? '关闭' : '取消'}
        </Button>,
        stage !== 'success' && (
          <Button
            key="publish"
            type="primary"
            icon={<CloudUploadOutlined />}
            loading={isPublishing}
            disabled={!project || !installationId}
            onClick={() => void handlePublish()}
          >
            {stage === 'error' ? '重试发布' : '发布'}
          </Button>
        ),
      ]}
    >
      <div className="publish-project-dialog__body">
        <Paragraph type="secondary" className="publish-project-dialog__intro">
          发布会读取本地项目当前快照并上传，不会修改本地项目数据。
        </Paragraph>

        <Descriptions bordered size="small" column={1}>
          <Descriptions.Item label="项目名称">
            {project?.name || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="远程 API">
            <Text type={platformApiBaseUrl ? undefined : 'danger'}>
              {platformApiBaseUrl || '未配置'}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="来源安装 ID">
            {installationId ? (
              <Text copyable className="publish-project-dialog__installation-id">
                {installationId}
              </Text>
            ) : (
              <Spin size="small" />
            )}
          </Descriptions.Item>
        </Descriptions>

        {!platformApiBaseUrl && (
          <Alert
            type="warning"
            showIcon
            title="尚未配置远程平台"
            description="请设置 VITE_PLATFORM_API_BASE_URL，或在 VS Code 中配置 baic.platformApiBaseUrl。"
          />
        )}

        <div className="publish-project-dialog__field">
          <label htmlFor="publish-version-label">版本标签（可选）</label>
          <Input
            id="publish-version-label"
            value={versionLabel}
            maxLength={100}
            placeholder="例如：需求评审版"
            disabled={isPublishing}
            onChange={event => setVersionLabel(event.target.value)}
          />
        </div>

        <div className="publish-project-dialog__field">
          <label htmlFor="publish-release-notes">发布说明（可选）</label>
          <Input.TextArea
            id="publish-release-notes"
            value={releaseNotes}
            maxLength={1000}
            rows={4}
            showCount
            placeholder="说明本次发布包含的主要变化"
            disabled={isPublishing}
            onChange={event => setReleaseNotes(event.target.value)}
          />
        </div>

        {stage === 'exporting' && (
          <Alert type="info" showIcon title="正在导出本地项目快照…" />
        )}
        {stage === 'uploading' && (
          <Alert type="info" showIcon title="快照已生成，正在上传到远程平台…" />
        )}
        {stage === 'error' && errorMessage && (
          <Alert
            type="error"
            showIcon
            title="发布失败"
            description={errorMessage}
          />
        )}
        {stage === 'success' && result && (
          <Alert
            type="success"
            showIcon
            title={result.deduplicated ? '项目内容未变化' : '发布成功'}
            description={
              <div className="publish-project-dialog__success-detail">
                <span>
                  {result.deduplicated
                    ? `远程平台已存在相同快照，沿用版本 v${result.version_number}。`
                    : `已创建远程版本 v${result.version_number}。`}
                </span>
                {remoteProjectUrl && (
                  <a href={remoteProjectUrl} target="_blank" rel="noreferrer">
                    查看远程项目
                  </a>
                )}
              </div>
            }
          />
        )}
      </div>
    </Modal>
  )
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback
}

export default PublishProjectDialog
