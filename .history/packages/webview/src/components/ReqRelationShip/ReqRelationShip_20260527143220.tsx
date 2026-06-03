import React, { useEffect, useState, useMemo } from 'react';
import { Spin, message, Card, Button, TreeSelect, Segmented } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { InteractiveNvlWrapper } from '@neo4j-nvl/react';
import { Graph } from '@antv/x6';
import { exportGraphToRBG } from '../../models/strategies/internalConstraints/exportGraph';
import type { Requirement } from '../../models/Requirement';
import type { ReqRelationship } from '../../models/ReqRelationship';
import { API_ENDPOINTS, authFetch } from '../../config/api';
import { getRequirementRelationNodeStyle } from '../echartsNodeStyles';

// Ensures shapes are registered
import '../graph/FlowGraph';
import internalConstraintsStrategy from '../graph/strategies/internalConstraints';

import './ReqRelationShip.css';

interface ReqRelationShipProps {
  requirements: Requirement[];
  onBack?: () => void;
}

type RenderMode = 'echarts' | 'nvl';

interface DependencyResult {
  dependent_graph: string;
  depended_graph: string;
  data_name?: string;
  dependent_range?: string;
  depended_range?: string;
  [key: string]: unknown;
}

interface DependencyResponse {
  dependencies?: DependencyResult[];
  relationships?: ReqRelationship[];
}

interface NormalizedReqRelationship {
  id: string;
  sourceRequirementId: string;
  targetRequirementId: string;
  relationType: string;
  dataName?: string;
  dependentRange?: string;
  dependedRange?: string;
  properties?: Record<string, any>;
}

interface NvlNode {
  id: string;
  caption?: string;
  size?: number;
  color?: string;
  properties?: Record<string, any>;
}

interface NvlRelationship {
  id: string;
  from: string;
  to: string;
  caption?: string;
  type?: string;
  color?: string;
  width?: number;
  properties?: Record<string, any>;
}

const ReqRelationShip: React.FC<ReqRelationShipProps> = ({ requirements, onBack }) => {
  const [loading, setLoading] = useState(false);
  const [resultData, setResultData] = useState<DependencyResponse | null>(null);
  const [selectedReqIds, setSelectedReqIds] = useState<string[]>([]);
  const [renderMode, setRenderMode] = useState<RenderMode>('echarts');

  const requirementMap = useMemo(() => {
    return new Map(requirements.map((req) => [req.id, req]));
  }, [requirements]);

  const treeData = useMemo(() => {
    const grouped = requirements.reduce((acc, req) => {
      const type = req.type || '未分类';
      if (!acc[type]) acc[type] = [];
      acc[type].push(req);
      return acc;
    }, {} as Record<string, Requirement[]>);

    return Object.entries(grouped).map(([type, reqs]) => ({
      title: type,
      value: `type:${type}`, // 保证上一级 key 的唯一性
      children: reqs.map(req => ({
        title: req.name || req.id,
        value: req.id,
      }))
    }));
  }, [requirements]);

  useEffect(() => {
    const allIds = requirements.map(req => req.id);
    setSelectedReqIds(allIds);
    if (allIds.length > 0) {
      processAndSend(allIds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requirements]);

  const processAndSend = async (idsToProcess: string[] = selectedReqIds) => {
    setLoading(true);
    try {
      // 注册必要节点，防止从头进入时 X6 缺少节点配置报 "shape should be specified" 等错误
      if (internalConstraintsStrategy.registerNodes) {
        internalConstraintsStrategy.registerNodes();
      }

      const dummyContainer = document.createElement('div');
      const headlessGraph = new Graph({ container: dummyContainer });

      const requestBody = requirements
        .filter(req => idsToProcess.includes(req.id))
        .map((req) => {
          let graphData = req.graph_SC;
          if (typeof graphData === 'string') {
            try {
              graphData = JSON.parse(graphData);
            } catch (e) {
              graphData = { cells: [] };
            }
          }
          if (!graphData || typeof graphData !== 'object') {
            return null;
          }

          // 若 graphData 包含 cells 属性，说明是 X6 画布格式，需要走 fromJSON + exportGraphToRBG 转换；
          // 否则认为已经是 RBG DSL 格式，直接返回。
          if (!('cells' in graphData)) {
            return graphData;
          }

          // cells 为空数组时跳过
          if (Array.isArray(graphData.cells) && graphData.cells.length === 0) {
            return null;
          }

          headlessGraph.clearCells();
          try {
            (headlessGraph as any).canvasData = graphData;
            headlessGraph.fromJSON(graphData);
            return exportGraphToRBG(headlessGraph, req.id, req.nl_text);
          } catch (err) {
            console.error(`解析需求 ${req.id} 时 X6 fromJSON 返回异常:`, err);
            return null;
          }
        })
        .filter(Boolean);

      headlessGraph.dispose();

      console.log('Sending dependencies Request Body:', requestBody);

      const dependencyUrl = API_ENDPOINTS.dependency;
      const response = await authFetch(dependencyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error('请求依赖计算失败');
      }

      const data = await response.json();
      setResultData(data);
    } catch (error: any) {
      console.error('ReqRelationShip Error:', error);
      message.error(error.message || '获取需求间关系失败');
    } finally {
      setLoading(false);
    }
  };

  const normalizedRelationships = useMemo<NormalizedReqRelationship[]>(() => {
    if (!resultData) return [];

    if (Array.isArray(resultData.relationships)) {
      return resultData.relationships.map((rel, index) => ({
        id: rel.id || `relationship-${index}`,
        sourceRequirementId: rel.from_requirement,
        targetRequirementId: rel.to_requirement,
        relationType: rel.rel_type || 'depends_on',
        dataName: typeof rel.properties?.data_name === 'string' ? rel.properties.data_name : undefined,
        dependentRange: typeof rel.properties?.dependent_range === 'string' ? rel.properties.dependent_range : undefined,
        dependedRange: typeof rel.properties?.depended_range === 'string' ? rel.properties.depended_range : undefined,
        properties: rel.properties,
      }));
    }

    if (Array.isArray(resultData.dependencies)) {
      return resultData.dependencies.map((dep, index) => ({
        id: `dependency-${dep.dependent_graph}-${dep.depended_graph}-${dep.data_name || index}`,
        sourceRequirementId: dep.dependent_graph,
        targetRequirementId: dep.depended_graph,
        relationType: 'depends_on',
        dataName: dep.data_name,
        dependentRange: dep.dependent_range,
        dependedRange: dep.depended_range,
        properties: dep,
      }));
    }

    return [];
  }, [resultData]);

  const getEchartsOption = () => {
    if (normalizedRelationships.length === 0) {
      return {};
    }

    const nodesMap = new Map<string, any>();
    const links: any[] = [];
    // 使用归一化的 key（按字典序排序）来追踪任意两节点之间的所有边，
    // 这样 A→B 和 B→A 共享同一个计数器，能正确分配不同的 curveness
    const pairEdgeCountMap = new Map<string, number>();

    normalizedRelationships.forEach((rel) => {
      const source = rel.sourceRequirementId;
      const sourceMeta = requirementMap.get(source);
      const target = rel.targetRequirementId;
      const targetMeta = requirementMap.get(target);

      if (!nodesMap.has(source)) {
        const nodeName = sourceMeta?.name;
        const style = getRequirementRelationNodeStyle(sourceMeta?.type);
        nodesMap.set(source, {
          id: source,
          name: nodeName?.substring(0, 8) || source.substring(0, 8),
          symbol: 'circle',
          symbolSize: style.symbolSize,
          itemStyle: {
            color: style.backgroundColor,
            borderType: style.borderType,
            borderColor: style.borderColor,
            borderWidth: style.borderWidth,
          },
          label: {
            show: true,
            formatter: '{b}',
            color: style.labelColor,
          },
          tooltip: {
            formatter: `需求: ${nodeName || source}<br/>层级: ${sourceMeta?.type || '未分类'}`,
          },
        });
      }

      if (!nodesMap.has(target)) {
        const nodeName = targetMeta?.name;
        const style = getRequirementRelationNodeStyle(targetMeta?.type);
        nodesMap.set(target, {
          id: target,
          name: nodeName?.substring(0, 8) || target.substring(0, 8),
          symbol: 'circle',
          symbolSize: style.symbolSize,
          itemStyle: {
            color: style.backgroundColor,
            borderType: style.borderType,
            borderColor: style.borderColor,
            borderWidth: style.borderWidth,
          },
          label: {
            show: true,
            formatter: '{b}',
            color: style.labelColor,
          },
          tooltip: {
            formatter: `需求: ${nodeName || target}<br/>层级: ${targetMeta?.type || '未分类'}`,
          },
        });
      }

      // 归一化 key：无论 A→B 还是 B→A，都使用相同的 pairKey
      const [first, second] = [source, target].sort();
      const pairKey = `${first}||${second}`;
      const pairIndex = pairEdgeCountMap.get(pairKey) || 0;
      pairEdgeCountMap.set(pairKey, pairIndex + 1);

      // curveness 分配策略：
      // 第 0 条边: +0.2，第 1 条边: -0.2，第 2 条边: +0.4，第 3 条边: -0.4 ...
      // 确保任意两节点间的边都有不同的曲率，标签自然分开
      const curveStep = 0.2;
      const level = Math.floor(pairIndex / 2) + 1;
      const sign = pairIndex % 2 === 0 ? 1 : -1;
      const curveness = level * curveStep * sign;
      links.push({
        source,
        target,
        symbol: ['none', 'arrow'],
        symbolSize: [0, 10],
        label: {
          show: true,
          formatter: `<<Depend>>\n${rel.dataName || ''}`,
          fontSize: 10,
          color: '#666',
          backgroundColor: 'rgba(255, 255, 255, 0.85)',
          padding: [2, 4],
          borderRadius: 2,
        },
        lineStyle: {
          curveness,
          color: '#999',
          width: 2,
        },
        tooltip: {
          formatter: `依赖数据: ${rel.dataName || ''}<br />Dependent: ${sourceMeta?.name || source}<br />Depended: ${targetMeta?.name || target}`
        }
      });
    });

    return {
      tooltip: {
        trigger: 'item',
      },
      animationDurationUpdate: 1500,
      animationEasingUpdate: 'quinticInOut',
      series: [
        {
          type: 'graph',
          layout: 'circular',
          roam: true,
          draggable: true,
          label: {
            show: true,
          },
          edgeSymbol: ['none', 'arrow'],
          edgeLabel: {
            fontSize: 12,
          },
          data: Array.from(nodesMap.values()),
          links: links,
          lineStyle: {
            opacity: 0.9,
            width: 2,
            curveness: 0,
          },
        },
      ],
    };
  };

  const nvlGraphData = useMemo(() => {
    const nodesMap = new Map<string, NvlNode>();
    const rels: NvlRelationship[] = [];

    normalizedRelationships.forEach((rel) => {
      const source = rel.sourceRequirementId;
      const target = rel.targetRequirementId;
      const sourceMeta = requirementMap.get(source);
      const targetMeta = requirementMap.get(target);

      if (!nodesMap.has(source)) {
        const style = getRequirementRelationNodeStyle(sourceMeta?.type);
        nodesMap.set(source, {
          id: source,
          caption: sourceMeta?.name?.substring(0, 8) || source.substring(0, 8),
          size: Math.max(24, style.symbolSize / 2),
          color: style.backgroundColor,
          properties: {
            name: sourceMeta?.name || source,
            type: sourceMeta?.type,
            subtype: sourceMeta?.subtype,
          },
        });
      }

      if (!nodesMap.has(target)) {
        const style = getRequirementRelationNodeStyle(targetMeta?.type);
        nodesMap.set(target, {
          id: target,
          caption: targetMeta?.name?.substring(0, 8) || target.substring(0, 8),
          size: Math.max(24, style.symbolSize / 2),
          color: style.backgroundColor,
          properties: {
            name: targetMeta?.name || target,
            type: targetMeta?.type,
            subtype: targetMeta?.subtype,
          },
        });
      }

      rels.push({
        id: rel.id,
        from: source,
        to: target,
        caption: rel.dataName || rel.relationType,
        type: rel.relationType,
        color: '#999',
        width: 2,
        properties: {
          ...rel.properties,
          dataName: rel.dataName,
          dependentRange: rel.dependentRange,
          dependedRange: rel.dependedRange,
        },
      });
    });

    return {
      nodes: Array.from(nodesMap.values()),
      rels,
    };
  }, [normalizedRelationships, requirementMap]);

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
        <Segmented
          className="req-relationship-render-switch"
          size="small"
          value={renderMode}
          onChange={(value) => setRenderMode(value as RenderMode)}
          options={[
            { label: 'ECharts', value: 'echarts' },
            { label: 'Neo4j NVL', value: 'nvl' },
          ]}
        />
      </div>
      <div className="req-relationship-content">
        <Spin spinning={loading} tip="正在计算需求间关系...">
          {normalizedRelationships.length > 0 ? (
            <Card className="result-card">
              {renderMode === 'echarts' ? (
                <ReactECharts
                  option={getEchartsOption()}
                  style={{ height: '100%', minHeight: '600px', width: '100%' }}
                  notMerge={true}
                  lazyUpdate={true}
                />
              ) : (
                <div className="nvl-graph-container">
                  <InteractiveNvlWrapper
                    nodes={nvlGraphData.nodes}
                    rels={nvlGraphData.rels}
                    layout="forceDirected"
                    nvlOptions={{ disableTelemetry: true, disableWebWorkers: true, initialZoom: 1 }}
                  />
                </div>
              )}
            </Card>
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
        <Button type="primary" onClick={() => processAndSend()} loading={loading}>
          生成 / 刷新关系
        </Button>
      </div>
    </div>
  );
};

export default ReqRelationShip;
