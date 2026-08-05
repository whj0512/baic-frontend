import { useEffect, useState } from 'react'
import { Alert, Checkbox, Form, Input, Modal, Select, Typography } from 'antd'
import type { RequirementDimensionCode } from '../../models/RequirementModel'

export interface RequirementModelMetadataValue {
  identity?: string
  dimensionCode: RequirementDimensionCode
  name: string
  modelType: string | null
  modelKey: string
  isPrimary: boolean
  contextModelGroupId: string | null
}

export interface RequirementModelContextOption {
  value: string
  label: string
  modelKey: string
}

interface RequirementModelMetadataModalProps {
  open: boolean
  title: string
  initialValue: RequirementModelMetadataValue
  existingKeys: Array<{ identity: string; modelKey: string }>
  contextOptions?: RequirementModelContextOption[]
  creationMode?: boolean
  allowPrimaryToggle?: boolean
  onCancel: () => void
  onSubmit: (value: RequirementModelMetadataValue) => Promise<void> | void
}

function RequirementModelMetadataModal({
  open,
  title,
  initialValue,
  existingKeys,
  contextOptions = [],
  creationMode = false,
  allowPrimaryToggle = false,
  onCancel,
  onSubmit,
}: RequirementModelMetadataModalProps) {
  const [value, setValue] = useState(initialValue)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const needsContext = value.dimensionCode === 'ESD' || value.dimensionCode === 'ISD'

  useEffect(() => {
    if (!open) return
    setValue(initialValue)
    setError(null)
  }, [initialValue, open])

  const handleSubmit = async () => {
    const name = value.name.trim()
    const modelKey = value.modelKey.trim()

    if (!name) {
      setError('请输入模型名称')
      return
    }
    if (!modelKey) {
      setError('请输入模型业务键')
      return
    }
    if (existingKeys.some(item => item.identity !== value.identity && item.modelKey.trim() === modelKey)) {
      setError('同一维度内模型业务键不能重复')
      return
    }
    if (needsContext && !creationMode) {
      const contextIsValid = contextOptions.some(option => option.value === value.contextModelGroupId)
      if (!contextIsValid) {
        setError('请选择有效的 IBD 上下文模型')
        return
      }
    }

    setSubmitting(true)
    setError(null)
    try {
      await onSubmit({
        ...value,
        name,
        modelKey,
        modelType: value.modelType?.trim() || null,
        contextModelGroupId: creationMode ? null : value.contextModelGroupId,
      })
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '模型信息保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      title={title}
      okText="确认"
      cancelText="取消"
      confirmLoading={submitting}
      maskClosable={!submitting}
      closable={!submitting}
      onCancel={onCancel}
      onOk={() => void handleSubmit()}
    >
      <Form layout="vertical">
        {error && <Alert type="error" showIcon message={error} className="requirement-model-modal-error" />}
        <Form.Item label="模型名称" required>
          <Input
            value={value.name}
            maxLength={200}
            onChange={event => setValue(previous => ({ ...previous, name: event.target.value }))}
          />
        </Form.Item>
        <Form.Item label="模型类型">
          <Input
            value={value.modelType ?? ''}
            placeholder="可选，自由文本"
            onChange={event => setValue(previous => ({ ...previous, modelType: event.target.value }))}
          />
        </Form.Item>
        <Form.Item label="模型业务键" required>
          <Input
            value={value.modelKey}
            maxLength={200}
            onChange={event => setValue(previous => ({ ...previous, modelKey: event.target.value }))}
          />
        </Form.Item>
        {needsContext && (
          <Form.Item label="IBD 上下文模型" required={!creationMode}>
            {creationMode ? (
              <Typography.Text type="secondary">
                创建期使用本地主 IBD；需求创建后可改绑具体 IBD。
              </Typography.Text>
            ) : (
              <Select
                value={value.contextModelGroupId ?? undefined}
                placeholder="请选择 IBD 上下文模型"
                options={contextOptions.map(option => ({
                  value: option.value,
                  label: `${option.label} (${option.modelKey})`,
                }))}
                onChange={contextModelGroupId => setValue(previous => ({ ...previous, contextModelGroupId }))}
              />
            )}
          </Form.Item>
        )}
        <Form.Item label="主模型">
          {allowPrimaryToggle ? (
            <Checkbox
              checked={value.isPrimary}
              onChange={event => setValue(previous => ({ ...previous, isPrimary: event.target.checked }))}
            >
              设为该维度主模型
            </Checkbox>
          ) : (
            <Typography.Text type="secondary">
              {value.isPrimary ? '当前为主模型。请使用列表中的单选按钮切换。' : '请使用列表中的单选按钮设为主模型。'}
            </Typography.Text>
          )}
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default RequirementModelMetadataModal

