import React, { useEffect, useState } from 'react';
import { Spin, message, Card, Button } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { Graph } from '@antv/x6';
import { exportGraphToRBG } from '../../models/strategies/internalConstraints/exportGraph';
import type { Requirement } from '../../models/Requirement';
import { API_ENDPOINTS } from '../../config/api';

// Ensures shapes are registered
import '../graph/FlowGraph';
import internalConstraintsStrategy from '../graph/strategies/internalConstraints';

import './ReqRelationShip.css';

interface ReqRelationShipProps {
  requirements: Requirement[];
  onBack?: () => void;
}

const ReqRelationShip: React.FC<ReqRelationShipProps> = ({ requirements, onBack }) => {
  const [loading, setLoading] = useState(false);
  const [resultData, setResultData] = useState<any>(null);

  useEffect(() => {
    const processAndSend = async () => {
      setLoading(true);
      try {
        // 注册必要节点，防止从头进入时 X6 缺少节点配置报 "shape should be specified" 等错误
        if (internalConstraintsStrategy.registerNodes) {
          internalConstraintsStrategy.registerNodes();
        }

        const dummyContainer = document.createElement('div');
        const headlessGraph = new Graph({ container: dummyContainer });

        const requestBody = requirements
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
              // Hacky way: 将画布的额外数据赋回去，以防 exportGraphToRBG 获取到丢失
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
        const token = localStorage.getItem('token');
        const response = await fetch(dependencyUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

    if (requirements && requirements.length > 0) {
      processAndSend();
    }
  }, [requirements]);

  const getEchartsOption = () => {
    if (!resultData || !resultData.dependencies) {
      return {};
    }

    const nodesMap = new Map<string, any>();
    const links: any[] = [];
    // 使用归一化的 key（按字典序排序）来追踪任意两节点之间的所有边，
    // 这样 A→B 和 B→A 共享同一个计数器，能正确分配不同的 curveness
    const pairEdgeCountMap = new Map<string, number>();

    resultData.dependencies.forEach((dep: any) => {
      const source = dep.dependent_graph;
      const target = dep.depended_graph;

      if (!nodesMap.has(source)) {
        nodesMap.set(source, {
          id: source,
          name: source.substring(0, 8), // Show short hash as identifier
          symbol: 'circle',
          symbolSize: 70,
          itemStyle: {
            color: '#fff',
            borderType: 'dashed',
            borderColor: '#1890ff',
            borderWidth: 2,
          },
          label: {
            show: true,
            formatter: '{b}',
            color: '#333'
          },
          tooltip: {
            formatter: `需求: ${source}`
          }
        });
      }

      if (!nodesMap.has(target)) {
        nodesMap.set(target, {
          id: target,
          name: target.substring(0, 8),
          symbol: 'circle',
          symbolSize: 70,
          itemStyle: {
            color: '#fff',
            borderType: 'dashed',
            borderColor: '#1890ff',
            borderWidth: 2,
          },
          label: {
            show: true,
            formatter: '{b}',
            color: '#333'
          },
          tooltip: {
            formatter: `Graph ID: ${target}`
          }
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
          formatter: `<<Depend>>\n${dep.data_name || ''}`,
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
          formatter: `依赖数据: ${dep.data_name}<br />Dependent: ${source}<br />Depended: ${target}`
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
          {resultData ? (
            <Card className="result-card">
              <ReactECharts
                option={getEchartsOption()}
                style={{ height: '100%', minHeight: '600px', width: '100%' }}
                notMerge={true}
                lazyUpdate={true}
              />
            </Card>
          ) : (
            !loading && <div className="empty-tip">没有计算结果或没有有效需求数据</div>
          )}
        </Spin>
      </div>
    </div>
  );
};

export default ReqRelationShip;
