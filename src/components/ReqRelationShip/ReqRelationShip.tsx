import React, { useEffect, useState } from 'react';
import { Spin, message, Card } from 'antd';
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
}

const ReqRelationShip: React.FC<ReqRelationShipProps> = ({ requirements }) => {
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

            // 为了避免 empty object 或者只包含元数据（如 { id: '...', desc: '...' }）时，
            // fromJSON 把顶级对象当作缺少 shape 字段的独立节点处理，必须确保携带 cells 数组或者跳过。
            if (!Array.isArray(graphData.cells) && !Array.isArray(graphData)) {
              if (Object.keys(graphData).length > 0) {
                graphData = { cells: [], ...graphData };
              } else {
                return null;
              }
            } else if (Array.isArray(graphData.cells) && graphData.cells.length === 0) {
              return null;
            } else if (Array.isArray(graphData) && graphData.length === 0) {
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
    const edgeCountMap = new Map<string, number>();

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
            formatter: `Graph ID: ${source}`
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

      const edgeKey = `${source}-${target}`;
      const count = edgeCountMap.get(edgeKey) || 0;
      let curveness = count === 0 ? 0 : (Math.ceil(count / 2) * 0.2) * (count % 2 === 0 ? -1 : 1);
      edgeCountMap.set(edgeKey, count + 1);

      links.push({
        source,
        target,
        symbol: ['none', 'arrow'],
        symbolSize: [0, 10],
        label: {
          show: true,
          formatter: `<<Depend>>`,
          fontSize: 10,
          color: '#666',
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
          layout: 'force',
          force: {
            repulsion: 1500,
            edgeLength: [150, 300],
            gravity: 0.1
          },
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
