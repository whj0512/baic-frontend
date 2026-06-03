import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Spin, message, Button, TreeSelect } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import type { Requirement } from '../../models/Requirement'
import { API_ENDPOINTS, authFetch } from '../../config/api'
import { buildDependencyRequestBody } from './dependencyPayload'
import AntvG6GraphRenderer from './graph-renderers/AntvG6GraphRenderer'
import {
  buildG6GraphData,
  buildRequirementTreeData,
  createRequirementMap,
  normalizeRelationships,
} from './relationshipGraphData'
import type { DependencyResponse } from './types'

import './ReqRelationShip.css'

interface ReqRelationShipProps {
  requirements: Requirement[]
  onBack?: () => void
}

const ReqRelationShip: React.FC<ReqRelationShipProps> = ({ requirements, onBack }) => {
  const [loading, setLoading] = useState(false)
  const [resultData, setResultData] = useState<DependencyResponse | null>(null)
  const [selectedReqIds, setSelectedReqIds] = useState<string[]>([])

  const requirementMap = useMemo(() => createRequirementMap(requirements), [requirements])
  const treeData = useMemo(() => buildRequirementTreeData(requirements), [requirements])
  const normalizedRelationships = useMemo(() => normalizeRelationships(resultData), [resultData])
  const g6GraphData = useMemo(
    () => buildG6GraphData(normalizedRelationships, requirementMap),
    [normalizedRelationships, requirementMap],
  )

  const processAndSend = useCallback(async (idsToProcess: string[]) => {
    setLoading(true)
    try {
      const requestBody = buildDependencyRequestBody(requirements, idsToProcess)
      console.log('Sending dependencies Request Body:', requestBody)

      const response = await authFetch(API_ENDPOINTS.dependency, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw new Error('请求依赖计算失败')
      }

      const data = await response.json()
      setResultData(data)
    } catch (error: any) {
      console.error('ReqRelationShip Error:', error)
      message.error(error.message || '获取需求间关系失败')
    } finally {
      setLoading(false)
    }
  }, [requirements])

  useEffect(() => {
    const allIds = requirements.map(req => req.id)
    setSelectedReqIds(allIds)
    if (allIds.length > 0) {
      processAndSend(allIds)
    } else {
      setResultData(null)
    }
  }, [requirements, processAndSend])

  const handleRefresh = useCallback(() => {
    processAndSend(selectedReqIds)
  }, [processAndSend, selectedReqIds])

  return (
    <div className="req-relationship-container">
      <div className="req-relationship-header">
        {onBack && (
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={onBack}
            className="req-relationship-back-btn"
          >
            返回
          </Button>
        )}
        <h2>需求间关系</h2>
      </div>
      <div className="req-relationship-content">
        <Spin spinning={loading} tip="正在计算需求间关系...">
          {normalizedRelationships.length > 0 ? (
            <AntvG6GraphRenderer graphData={g6GraphData} />
          ) : (
            !loading && <div className="empty-tip">没有计算结果或没有有效需求数据</div>
          )}
        </Spin>
      </div>
      <div className="req-relationship-operation">
        <span className="operation-label">筛选分析需求：</span>
        <TreeSelect
          treeData={treeData}
          treeCheckable={true}
          showCheckedStrategy={TreeSelect.SHOW_CHILD}
          allowClear
          placeholder="请选择需要纳入关系分析的需求"
          value={selectedReqIds}
          onChange={(vals) => setSelectedReqIds(vals as string[])}
          style={{ flex: 1, marginRight: 16 }}
          maxTagCount="responsive"
        />
        <Button type="primary" onClick={handleRefresh} loading={loading}>
          生成 / 刷新关系
        </Button>
      </div>
    </div>
  )
}

export default ReqRelationShip
