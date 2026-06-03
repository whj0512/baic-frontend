import React from 'react'
import { CloseOutlined } from '@ant-design/icons'
import './DeleteCoverageButton.css'

interface DeleteCoverageButtonProps {
  propertyName?: string
  onFieldUpdate?: (fieldName: string, value: any) => void
}

const DeleteCoverageButton: React.FC<DeleteCoverageButtonProps> = ({
  propertyName = 'condition_points_coverage',
  onFieldUpdate,
}) => {
  const handleClick = () => {
    if (!onFieldUpdate) return

    // 清空所有相关字段
    onFieldUpdate(`test_coverage.${propertyName}.coverage_type`, undefined)
    onFieldUpdate(`test_coverage.${propertyName}.asil_level`, undefined)
    onFieldUpdate(`test_coverage.${propertyName}.condition_coverage_method`, undefined)
    onFieldUpdate(`test_coverage.${propertyName}.point_coverage_method`, undefined)
  }

  return (
    <CloseOutlined
      onClick={handleClick}
      className="delete-coverage-button"
      title="清空条件覆盖策略"
    />
  )
}

export default DeleteCoverageButton
