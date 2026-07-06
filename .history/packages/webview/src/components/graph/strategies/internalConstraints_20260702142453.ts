import { register } from '@antv/x6-react-shape'
import type { GraphStrategy, FormConfig } from './types'
import { ensureInternalConstraintsRequiredNodes } from './internalConstraintsRequiredNodes'
import Call from '../../nodes/internalConstraints/Call';
import Comment from '../../nodes/internalConstraints/Comment';
import Condition from '../../nodes/internalConstraints/Condition';
import Goto from '../../nodes/internalConstraints/Goto';
import Graph from '../../nodes/internalConstraints/Graph';
import Start from '../../nodes/internalConstraints/Start';
import Then from '../../nodes/internalConstraints/Then';
import State from '../../nodes/internalConstraints/State';
import TruthTable from '../../nodes/internalConstraints/TruthTable';

// 导入 Call 节点的自定义控件
import Params from '../form-panel/controls/internalConstraints/Params'
import Script from '../form-panel/controls/internalConstraints/Script'

// 导入 Condition 节点的自定义控件
import ConditionExpression from '../form-panel/controls/internalConstraints/ConditionExpression'
import TimeTolerance from '../form-panel/controls/internalConstraints/TimeTolerance'
import TestLayer from '../form-panel/controls/internalConstraints/TestLayer'

// 导入 Goto 节点的自定义控件
import TargetSelecter from '../form-panel/controls/internalConstraints/TargetSelecter'

// 导入 Graph 节点的自定义控件
import RefGraphs from '../form-panel/controls/internalConstraints/RefGraphs'
import PathCoverage from '../form-panel/controls/internalConstraints/PathCoverage'
import DeleteCoverageButton from '../form-panel/controls/internalConstraints/DeleteCoverageButton'

// 导入 Canvas 画布表单的专属自定义控件
import LocalVariableList from '../form-panel/controls/internalConstraints/LocalVariableList'
import VariableActionList from '../form-panel/controls/internalConstraints/VariableActionList'

// 导入 Truth 节点的自定义控件
import TruthTableControl from '../form-panel/controls/internalConstraints/TruthTable'

// 导入 State 节点的自定义控件
import TestTimeProps from '../form-panel/controls/internalConstraints/TestTimeProps'
import Action from '../form-panel/controls/internalConstraints/Action'

const DISABLED_SOURCE_SHAPES = new Set([
  'condition-node',
  'comment-node',
  'call-node',
  'goto-node',
])

const DISABLED_TARGET_SHAPES = new Set([
  'comment-node',
  'call-node',
  'start-node',
])

// 表单配置
const formConfig: FormConfig = {
  // 画布表单
  canvas: {
    tabs: [
      {
        name: '数据',
        groups: [
          {
            title: '基础信息',
            controls: [
              { label: '描述', name: 'desc', shape: 'InputText' },
              { label: '局部变量声明', name: 'local_variable_list', shape: 'LocalVariableList' },
              { label: '局部变量动作', name: 'variable_action_list', shape: 'VariableActionList' },
            ],
          },
          {
            title: '测试覆盖策略',
            controls: [
              {
                label: '',
                name: 'test_coverage',
                shape: 'DeleteCoverageButton',
                propertyName: 'condition_points_coverage',
              },
              {
                label: '条件覆盖策略',
                name: 'test_coverage.condition_points_coverage.coverage_type',
                shape: 'Select',
                options: [
                  { value: 'Functional Safety', label: '功能安全' },
                  { value: 'Customize', label: '自定义' },
                ],
              },
              {
                label: '安全等级',
                name: 'test_coverage.condition_points_coverage.asil_level',
                shape: 'Select',
                options: [
                  { value: 'ASILA', label: 'ASILA' },
                  { value: 'ASILB', label: 'ASILB' },
                  { value: 'ASILC', label: 'ASILC' },
                  { value: 'ASILD', label: 'ASILD' },
                ],
                hidden: true,
                dependencies: [
                  {
                    name: 'test_coverage.condition_points_coverage.coverage_type',
                    condition: 'Functional Safety',
                    hidden: false,
                  },
                ],
              },
              {
                label: '条件组合方法',
                name: 'test_coverage.condition_points_coverage.condition_coverage_method',
                shape: 'Select',
                options: [
                  { value: 'MCDC', label: 'MCDC' },
                  { value: 'DC', label: 'DC' },
                  { value: 'DT', label: 'DT' },
                  { value: 'All_DT', label: 'All_DT' },
                ],
                hidden: true,
                dependencies: [
                  {
                    name: 'test_coverage.condition_points_coverage.coverage_type',
                    condition: 'Customize',
                    hidden: false,
                  },
                ],
              },
              {
                label: '点数量',
                name: 'test_coverage.condition_points_coverage.point_coverage_method',
                shape: 'Select',
                options: [
                  { value: '1-point', label: '1-point' },
                  { value: '3-points', label: '3-points' },
                  { value: '5-points', label: '5-points' },
                ],
                hidden: true,
                dependencies: [
                  {
                    name: 'test_coverage.condition_points_coverage.coverage_type',
                    condition: 'Customize',
                    hidden: false,
                  },
                ],
              },
            ],
          },
        ]
      }
    ],
    controlMap: {
      'DeleteCoverageButton': DeleteCoverageButton,
      'LocalVariableList': LocalVariableList,
      'VariableActionList': VariableActionList,
    },
  },
  // 边表单
  edge: {
    tabs: [
      {
        name: '数据',
        groups: [
          {
            title: '基础信息',
            controls: [
              { label: '边名称', name: 'edgeName', shape: 'InputText' },
              { label: '备注', name: 'comment', shape: 'InputText' },
              { label: '循环次数', name: 'loop_times', shape: 'InputNumber' },
              { label: '浮点类型取点是否包含阈值', name: 'isContainThreshold', shape: 'Checkbox' },
            ],
          },
          {
            title: '条件配置',
            controls: [
              { label: '条件', name: 'condition', shape: 'ConditionExpression' },
              { label: '时间偏差', name: 'time_tolerance', shape: 'TimeTolerance' },
            ],
          },
          {
            title: '测试样点',
            controls: [
              { label: '样点集', name: 'test_layer.data', shape: 'TestLayer' },
              { label: '是否排序', name: 'test_layer.is_order', shape: 'Checkbox' },
              { label: '是否分组', name: 'test_layer.is_group', shape: 'Checkbox' },
            ],
          },
          {
            title: '测试覆盖策略',
            controls: [
              {
                label: '',
                name: 'test_coverage',
                shape: 'DeleteCoverageButton',
                propertyName: 'condition_points_coverage',
              },
              {
                label: '条件覆盖策略',
                name: 'test_coverage.condition_points_coverage.coverage_type',
                shape: 'Select',
                options: [
                  { value: 'Functional Safety', label: '功能安全' },
                  { value: 'Customize', label: '自定义' },
                ],
              },
              {
                label: '安全等级',
                name: 'test_coverage.condition_points_coverage.asil_level',
                shape: 'Select',
                options: [
                  { value: 'ASILA', label: 'ASILA' },
                  { value: 'ASILB', label: 'ASILB' },
                  { value: 'ASILC', label: 'ASILC' },
                  { value: 'ASILD', label: 'ASILD' },
                ],
                hidden: true,
                dependencies: [
                  {
                    name: 'test_coverage.condition_points_coverage.coverage_type',
                    condition: 'Functional Safety',
                    hidden: false,
                  },
                ],
              },
              {
                label: '条件组合方法',
                name: 'test_coverage.condition_points_coverage.condition_coverage_method',
                shape: 'Select',
                options: [
                  { value: 'MCDC', label: 'MCDC' },
                  { value: 'DC', label: 'DC' },
                  { value: 'DT', label: 'DT' },
                  { value: 'All_DT', label: 'All_DT' },
                ],
                hidden: true,
                dependencies: [
                  {
                    name: 'test_coverage.condition_points_coverage.coverage_type',
                    condition: 'Customize',
                    hidden: false,
                  },
                ],
              },
              {
                label: '点数量',
                name: 'test_coverage.condition_points_coverage.point_coverage_method',
                shape: 'Select',
                options: [
                  { value: '1-point', label: '1-point' },
                  { value: '3-points', label: '3-points' },
                  { value: '5-points', label: '5-points' },
                ],
                hidden: true,
                dependencies: [
                  {
                    name: 'test_coverage.condition_points_coverage.coverage_type',
                    condition: 'Customize',
                    hidden: false,
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        name: '样式',
        groups: [
          {
            controls: [
              { label: '线条颜色', name: 'stroke', shape: 'InputText' },
              { label: '线条宽度', name: 'strokeWidth', shape: 'InputNumber' },
            ],
          },
        ],
      },
    ],
    controlMap: {
      'ConditionExpression': ConditionExpression,
      'TimeTolerance': TimeTolerance,
      'TestLayer': TestLayer,
      'DeleteCoverageButton': DeleteCoverageButton,
    },
  },

  // 节点表单（按 shape 映射）
  nodes: {
    'state-node': {
      schema: {
        tabs: [
          {
            name: '数据',
            groups: [
              {
                controls: [
                  { label: '节点名称', name: 'nodeName', shape: 'InputText' },
                  { label: '备注', name: 'comment', shape: 'InputText' },
                  { label: '后置思考时间', name: 'post_think_time', shape: 'InputNumber', extra: '秒' },
                  { label: '正向传播', name: 'forward_propagation', shape: 'Checkbox' },
                  { label: '测试时间属性', name: 'time_props', shape: 'TestTimeProps', extra: '秒' },
                  { label: '动作-常规', name: 'normal_test_action_list', shape: 'Action', groupId: 'normal_testcase' },
                  { label: '动作-动态', name: 'dynamic_test_action_list', shape: 'Action', groupId: 'dynamic_testcase' },
                ],
              },
            ],
          },
          {
            name: '样式',
            groups: [
              {
                controls: [
                  { label: '边框颜色', name: 'stroke', shape: 'InputText' },
                  { label: '填充颜色', name: 'fill', shape: 'InputText' },
                ],
              },
            ],
          },
        ],
      },
      controlMap: {
        'TestTimeProps': TestTimeProps,
        'Action': Action,
      },
    },

    'start-node': {
      schema: {
        tabs: [
          {
            name: '数据',
            groups: [
              {
                controls: [
                  { label: '节点名称', name: 'nodeName', shape: 'InputText' },
                ],
              },
            ],
          },
          {
            name: '样式',
            groups: [
              {
                controls: [
                  { label: '填充颜色', name: 'fill', shape: 'InputText' },
                ],
              },
            ],
          },
        ],
      },
    },

    'goto-node': {
      schema: {
        tabs: [
          {
            name: '数据',
            groups: [
              {
                controls: [
                  { label: '节点名称', name: 'nodeName', shape: 'InputText' },
                  { label: '备注', name: 'comment', shape: 'InputText' },
                  { label: '目标节点', name: 'friend', shape: 'TargetSelecter' },
                ],
              },
            ],
          },
          {
            name: '样式',
            groups: [
              {
                controls: [
                  { label: '边框颜色', name: 'stroke', shape: 'InputText' },
                  { label: '填充颜色', name: 'fill', shape: 'InputText' },
                ],
              },
            ],
          },
        ],
      },
      controlMap: {
        'TargetSelecter': TargetSelecter,
      },
    },

    'condition-node': {
      schema: {
        tabs: [
          {
            name: '数据',
            groups: [
              {
                controls: [
                  { label: '节点名称', name: 'nodeName', shape: 'InputText' },
                  { label: '备注', name: 'comment', shape: 'InputText' },
                  { label: '条件', name: 'condition', shape: 'ConditionExpression' },
                  { label: '时间偏差', name: 'time_tolerance', shape: 'TimeTolerance' },
                ],
              },
              {
                title: '测试样点',
                controls: [
                  { label: '样点集', name: 'test_layer.data', shape: 'TestLayer' },
                  { label: '是否排序', name: 'test_layer.is_order', shape: 'Checkbox' },
                  { label: '是否分组', name: 'test_layer.is_group', shape: 'Checkbox' },
                ],
              },
              {
                title: '测试覆盖策略',
                controls: [
                  {
                    label: '',
                    name: 'test_coverage',
                    shape: 'DeleteCoverageButton',
                    propertyName: 'condition_points_coverage',
                  },
                  {
                    label: '条件覆盖策略',
                    name: 'test_coverage.condition_points_coverage.coverage_type',
                    shape: 'Select',
                    options: [
                      { value: 'Functional Safety', label: '功能安全' },
                      { value: 'Customize', label: '自定义' },
                    ],
                  },
                  {
                    label: '安全等级',
                    name: 'test_coverage.condition_points_coverage.asil_level',
                    shape: 'Select',
                    options: [
                      { value: 'ASILA', label: 'ASILA' },
                      { value: 'ASILB', label: 'ASILB' },
                      { value: 'ASILC', label: 'ASILC' },
                      { value: 'ASILD', label: 'ASILD' },
                    ],
                    hidden: true,
                    dependencies: [
                      {
                        name: 'test_coverage.condition_points_coverage.coverage_type',
                        condition: 'Functional Safety',
                        hidden: false,
                      },
                    ],
                  },
                  {
                    label: '条件组合方法',
                    name: 'test_coverage.condition_points_coverage.condition_coverage_method',
                    shape: 'Select',
                    options: [
                      { value: 'MCDC', label: 'MCDC' },
                      { value: 'DC', label: 'DC' },
                      { value: 'DT', label: 'DT' },
                      { value: 'All_DT', label: 'All_DT' },
                    ],
                    hidden: true,
                    dependencies: [
                      {
                        name: 'test_coverage.condition_points_coverage.coverage_type',
                        condition: 'Customize',
                        hidden: false,
                      },
                    ],
                  },
                  {
                    label: '点数量',
                    name: 'test_coverage.condition_points_coverage.point_coverage_method',
                    shape: 'Select',
                    options: [
                      { value: '1-point', label: '1-point' },
                      { value: '3-points', label: '3-points' },
                      { value: '5-points', label: '5-points' },
                    ],
                    hidden: true,
                    dependencies: [
                      {
                        name: 'test_coverage.condition_points_coverage.coverage_type',
                        condition: 'Customize',
                        hidden: false,
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            name: '样式',
            groups: [
              {
                controls: [
                  { label: '边框颜色', name: 'stroke', shape: 'InputText' },
                  { label: '填充颜色', name: 'fill', shape: 'InputText' },
                ],
              },
            ],
          },
        ],
      },
      // 注册自定义控件
      controlMap: {
        'ConditionExpression': ConditionExpression,
        'TimeTolerance': TimeTolerance,
        'TestLayer': TestLayer,
        'DeleteCoverageButton': DeleteCoverageButton,
      },
    },

    'call-node': {
      schema: {
        tabs: [
          {
            name: '数据',
            groups: [
              {
                controls: [
                  { label: '节点名称', name: 'nodeName', shape: 'InputText' },
                  { label: '备注', name: 'comment', shape: 'InputText' },
                  { label: '参数', name: 'params_list', shape: 'Params' },
                  { label: '脚本', name: 'script', shape: 'Script' },
                  { label: '启用逆向函数', name: 'enable_inverse', shape: 'Checkbox' },
                ],
              },
            ],
          },
          {
            name: '样式',
            groups: [
              {
                controls: [
                  { label: '边框颜色', name: 'stroke', shape: 'InputText' },
                  { label: '填充颜色', name: 'fill', shape: 'InputText' },
                ],
              },
            ],
          },
        ],
      },
      // 注册自定义控件
      controlMap: {
        'Params': Params,
        'Script': Script,
      },
    },

    'comment-node': {
      schema: {
        tabs: [
          {
            name: '数据',
            groups: [
              {
                controls: [
                  { label: '节点名称', name: 'nodeName', shape: 'InputText' },
                  { label: '注释内容', name: 'comment', shape: 'InputText' },
                ],
              },
            ],
          },
          {
            name: '样式',
            groups: [
              {
                controls: [
                  { label: '边框颜色', name: 'stroke', shape: 'InputText' },
                  { label: '填充颜色', name: 'fill', shape: 'InputText' },
                ],
              },
            ],
          },
        ],
      },
    },

    'graph-node': {
      schema: {
        tabs: [
          {
            name: '数据',
            groups: [
              {
                controls: [
                  { label: '节点名称', name: 'nodeName', shape: 'InputText' },
                  { label: '备注', name: 'comment', shape: 'InputText' },
                  { label: '引用图', name: 'graph', shape: 'RefGraphs' },
                ],
              },
              {
                title: '引用图路径覆盖策略',
                controls: [
                  { label: '是否包含用例', name: 'test_coverage.contain_test_layer', shape: 'Checkbox' },
                  { label: '路径覆盖策略', name: 'test_coverage.path_coverage.path_coverage_method', shape: 'PathCoverage' },
                ],
              },
              {
                title: '引用图条件覆盖策略',
                controls: [
                  {
                    label: '',
                    name: 'test_coverage',
                    shape: 'DeleteCoverageButton',
                    propertyName: 'condition_points_coverage',
                  },
                  {
                    label: '条件覆盖策略',
                    name: 'test_coverage.condition_points_coverage.coverage_type',
                    shape: 'Select',
                    options: [
                      { value: 'Functional Safety', label: '功能安全' },
                      { value: 'Customize', label: '自定义' },
                    ],
                  },
                  {
                    label: '安全等级',
                    name: 'test_coverage.condition_points_coverage.asil_level',
                    shape: 'Select',
                    options: [
                      { value: 'ASILA', label: 'ASILA' },
                      { value: 'ASILB', label: 'ASILB' },
                      { value: 'ASILC', label: 'ASILC' },
                      { value: 'ASILD', label: 'ASILD' },
                    ],
                    hidden: true,
                    dependencies: [
                      {
                        name: 'test_coverage.condition_points_coverage.coverage_type',
                        condition: 'Functional Safety',
                        hidden: false,
                      },
                    ],
                  },
                  {
                    label: '条件组合方法',
                    name: 'test_coverage.condition_points_coverage.condition_coverage_method',
                    shape: 'Select',
                    options: [
                      { value: 'MCDC', label: 'MCDC' },
                      { value: 'DC', label: 'DC' },
                      { value: 'DT', label: 'DT' },
                      { value: 'All_DT', label: 'All_DT' },
                    ],
                    hidden: true,
                    dependencies: [
                      {
                        name: 'test_coverage.condition_points_coverage.coverage_type',
                        condition: 'Customize',
                        hidden: false,
                      },
                    ],
                  },
                  {
                    label: '点数量',
                    name: 'test_coverage.condition_points_coverage.point_coverage_method',
                    shape: 'Select',
                    options: [
                      { value: '1-point', label: '1-point' },
                      { value: '3-points', label: '3-points' },
                      { value: '5-points', label: '5-points' },
                    ],
                    hidden: true,
                    dependencies: [
                      {
                        name: 'test_coverage.condition_points_coverage.coverage_type',
                        condition: 'Customize',
                        hidden: false,
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            name: '样式',
            groups: [
              {
                controls: [
                  { label: '边框颜色', name: 'stroke', shape: 'InputText' },
                  { label: '填充颜色', name: 'fill', shape: 'InputText' },
                ],
              },
            ],
          },
        ],
      },
      controlMap: {
        'RefGraphs': RefGraphs,
        'PathCoverage': PathCoverage,
        'DeleteCoverageButton': DeleteCoverageButton,
      },
    },

    'then-node': {
      schema: {
        tabs: [
          {
            name: '数据',
            groups: [
              {
                controls: [
                  { label: '节点名称', name: 'nodeName', shape: 'InputText' },
                ],
              },
            ],
          },
          {
            name: '样式',
            groups: [
              {
                controls: [
                  { label: '边框颜色', name: 'stroke', shape: 'InputText' },
                  { label: '填充颜色', name: 'fill', shape: 'InputText' },
                ],
              },
            ],
          },
        ],
      },
    },

    'truth-node': {
      schema: {
        tabs: [
          {
            name: '数据',
            groups: [
              {
                controls: [
                  { label: '节点名称', name: 'nodeName', shape: 'InputText' },
                  { label: '备注', name: 'comment', shape: 'InputText' },
                  { label: '真值表', name: 'truthTable', shape: 'TruthTable' },
                ],
              },
            ],
          },
          {
            name: '样式',
            groups: [
              {
                controls: [
                  { label: '边框颜色', name: 'stroke', shape: 'InputText' },
                  { label: '填充颜色', name: 'fill', shape: 'InputText' },
                ],
              },
            ],
          },
        ],
      },
      controlMap: {
        'TruthTable': TruthTableControl,
      },
    },
  },
}

const internalConstraintsStrategy: GraphStrategy = {
  ensureRequiredNodes: ensureInternalConstraintsRequiredNodes,
  preConnectionRules: {
    maxDistance: 200,
    canUseSource: node => !DISABLED_SOURCE_SHAPES.has(node.shape),
    canUseTarget: node => !DISABLED_TARGET_SHAPES.has(node.shape),
  },
  sidebarItems: [
    {
      type: 'call',
      label: 'call',
      shape: 'call-node',
      color: '#e6f7ff',
      tooltip: '允许用户编写自定义脚本或代码，实现特定的逻辑或功能',
      defaultAttrs: {
        width: 120,
        height: 60,
        data: {
          stroke: '#1890ff',
          fill: '#e6f7ff',
        }
      },
    },
    {
      type: 'comment',
      label: 'comment',
      shape: 'comment-node',
      color: '#e6f7ff',
      tooltip: '用于添加注释或说明信息',
      defaultAttrs: {
        width: 120,
        height: 60,
        data: {
          stroke: '#1890ff',
          fill: '#e6f7ff',
        }
      },
    },
    {
      type: 'condition',
      label: 'condition',
      shape: 'condition-node',
      color: '#e6f7ff',
      tooltip: '用于定义条件判断逻辑',
      defaultAttrs: {
        width: 120,
        height: 80,
        data: {
          stroke: '#333',
          fill: '#fff',
        }
      },
    },
    {
      type: 'goto',
      label: 'goto',
      shape: 'goto-node',
      color: '#e6f7ff',
      tooltip: '用于跳转到指定的节点',
      defaultAttrs: {
        width: 120,
        height: 60,
        data: {
          stroke: '#333',
          fill: '#fff',
        }
      },
    },
    {
      type: 'graph',
      label: 'graph',
      shape: 'graph-node',
      color: '#e6f7ff',
      tooltip: '允许在当前图中引用其他状态图',
      defaultAttrs: {
        width: 120,
        height: 60,
        data: {
          stroke: '#1890ff',
          fill: '#e6f7ff',
        }
      },
    },
    {
      type: 'start',
      label: 'start',
      shape: 'start-node',
      color: '#e6f7ff',
      tooltip: '表示流程的起点',
      defaultAttrs: {
        data: {
          stroke: '#333',
          fill: '#686666',
        }
      },
    },
    {
      type: 'state',
      label: 'state',
      shape: 'state-node',
      color: '#e6f7ff',
      tooltip: '表示流程中的状态或阶段',
      defaultAttrs: {
        width: 120,
        height: 80,
        data: {
          stroke: '#333',
          fill: '#fff',
        }
      },
    },
    {
      type: 'then',
      label: 'then',
      shape: 'then-node',
      color: '#e6f7ff',
      tooltip: '承接上一条件或动作后的后续流程',
      defaultAttrs: {
        data: {
          stroke: '#333',
          fill: '#fff',
        }
      },
    },
    {
      type: 'truth-table',
      label: 'truth table',
      shape: 'truth-node',
      color: '#e6f7ff',
      tooltip: '使用真值表定义条件组合和期望结果',
      defaultAttrs: {
        width: 120,
        height: 60,
        data: {
          stroke: '#1890ff',
          fill: '#e6f7ff',
        }
      },
    }
  ],
  registerNodes: () => {
    register({
      shape: 'call-node',
      width: 120,
      height: 60,
      component: Call,
    });
    register({
      shape: 'comment-node',
      width: 120,
      height: 60,
      component: Comment,
    });
    register({
      shape: 'condition-node',
      width: 120,
      height: 80,
      component: Condition,
    });
    register({
      shape: 'goto-node',
      width: 120,
      height: 60,
      component: Goto,
    });
    register({
      shape: 'graph-node',
      width: 120,
      height: 60,
      component: Graph,
    });
    register({
      shape: 'start-node',
      width: 30,
      height: 30,
      component: Start,
    });
    register({
      shape: 'state-node',
      width: 120,
      height: 80,
      component: State,
    });
    register({
      shape: 'then-node',
      width: 30,
      height: 30,
      component: Then,
    });
    register({
      shape: 'truth-node',
      width: 120,
      height: 60,
      component: TruthTable,
    });
  },
  // 表单配置
  formConfig,
  // 边规则配置（基于 Port）
  edgeRules: {
    // 获取节点的 port group 配置
    getPortGroups: (nodeShape: string) => {
      const basePortStyle = {
        r: 4,
        magnet: true,
        stroke: '#1890ff',
        fill: '#fff',
        strokeWidth: 1,
      }

      if (nodeShape === 'condition-node') {
        return {
          in: {
            position: 'top',
            attrs: { circle: { ...basePortStyle } },
          },
          'out-yes': {
            position: 'left',
            attrs: { circle: { ...basePortStyle, stroke: '#52c41a' } },
          },
          'out-no': {
            position: 'right',
            attrs: { circle: { ...basePortStyle, stroke: '#ff4d4f' } },
          },
        }
      }

      return {
        in: {
          position: 'top',
          attrs: { circle: { ...basePortStyle } },
        },
        out: {
          position: 'bottom',
          attrs: { circle: { ...basePortStyle } },
        },
      }
    },

    // 获取节点的初始 ports
    getInitialPorts: (nodeShape: string) => {
      if (nodeShape === 'condition-node') {
        return [
          { id: 'in-0', group: 'in' },
          { id: 'out-yes', group: 'out-yes' },
          { id: 'out-no', group: 'out-no' },
        ]
      }
      // 其他节点：无初始 port，创建连线时动态添加
      return []
    },

    // 节点是否支持动态添加多个 port
    supportsMultiplePorts: (nodeShape: string) => {
      return !['condition-node'].includes(nodeShape)
    },

    // 判断节点是否有多个命名输出
    hasMultipleOutputs: (_nodeId: string, nodeShape: string) => {
      return nodeShape === 'condition-node'
    },

    // 获取命名输出选项
    getOutputOptions: (_nodeId: string, nodeShape: string) => {
      if (nodeShape === 'condition-node') {
        return [
          { value: 'out-yes', label: 'Yes (左侧)' },
          { value: 'out-no', label: 'No (右侧)' },
        ]
      }
      return []
    },
  },
  stencilLayoutOptions: {
    columns: 1,
    columnWidth: 160,
    rowHeight: 100,
    center: true,
    resizeToFit: false,
    marginX: 0,
    marginY: 0,
  },
  stencilGraphWidth: 180,
  stencilGraphHeight: 1000,
  stencilGraphPadding: 10,
}

export default internalConstraintsStrategy
