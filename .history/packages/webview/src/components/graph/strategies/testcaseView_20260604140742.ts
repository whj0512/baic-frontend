import { register } from '@antv/x6-react-shape'
import type { FormConfig, GraphStrategy } from './types'
import Assignment from '../../nodes/testcaseView/Assignment'
import Executable from '../../nodes/testcaseView/Executable'
import Loop from '../../nodes/testcaseView/Loop'
import Traverse from '../../nodes/testcaseView/Traverse'
import Branch from '../../nodes/testcaseView/Branch'
import SubBranch from '../../nodes/testcaseView/SubBranch'
import Action from '../form-panel/controls/testcaseView/Action'
import Observe from '../form-panel/controls/testcaseView/Observe'

const formConfig: FormConfig = {
    nodes: {
        'assginment-node': {
            schema: {
                tabs: [
                    {
                        name: '数据',
                        groups: [
                            {
                                controls: [
                                    { label: '节点名称', name: 'nodeName', shape: 'InputText' },
                                    { label: '备注', name: 'comment', shape: 'InputText' },
                                    { label: '赋值', name: 'assignment', shape: 'Action' },
                                ]
                            },
                        ]
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
                ]
            },
            controlMap: {
                Action,
            },
        },
        'branch-node': {
            schema: {
                tabs: [
                    {
                        name: '数据',
                        groups: [
                            {
                                controls: [
                                    {
                                        label: '节点名称',
                                        name: 'nodeName',
                                        shape: 'InputText',
                                    },
                                    {
                                        label: '备注',
                                        name: 'comment',
                                        shape: 'InputText',
                                    },
                                ]
                            },
                        ]
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
                ]
            },
        },
        'sub-branch-node': {
            schema: {
                tabs: [
                    {
                        name: '数据',
                        groups: [
                            {
                                controls: [
                                    { label: '节点名称', name: 'nodeName', shape: 'InputText' },
                                    { label: '备注', name: 'comment', shape: 'InputText' },
                                    { label: '条件表达式', name: 'conditionalExpression', shape: 'InputText' },
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
                ]
            },
        },
        'executable-node': {
            schema: {
                tabs: [
                    {
                        name: '数据',
                        groups: [
                            {
                                controls: [
                                    { label: '节点名称', name: 'nodeName', shape: 'InputText' },
                                    { label: '超时时间(秒)', name: 'Timeout', shape: 'InputText' },
                                    { label: '备注', name: 'comment', shape: 'InputText' },
                                    {
                                        label: '观测',
                                        name: 'observe',
                                        shape: 'Observe',
                                    },
                                    {
                                        label: '期望',
                                        name: 'expect',
                                        shape: 'Action',
                                    },
                                    {
                                        label: '发送',
                                        name: 'send',
                                        shape: 'Action',
                                    },
                                ]
                            },
                        ]
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
                ]
            },
            controlMap: {
                Action,
                Observe
            },
        },
        'loop-node': {
            schema: {
                tabs: [
                    {
                        name: '数据',
                        groups: [
                            {
                                controls: [
                                    { label: '节点名称', name: 'nodeName', shape: 'InputText' },
                                    { label: '备注', name: 'comment', shape: 'InputText' },
                                    {
                                        label: '判断表达式', name: 'judgingExpression', shape: 'InputText'
                                    },
                                ]
                            },
                        ]
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
                ]
            },
        },
        'traverse-node': {
            schema: {
                tabs: [
                    {
                        name: '数据',
                        groups: [
                            {
                                controls: [
                                    {
                                        label: '节点名称',
                                        name: 'nodeName',
                                        shape: 'InputText',
                                    },
                                    {
                                        label: '备注',
                                        name: 'comment',
                                        shape: 'InputText',
                                    },
                                    {
                                        label: '目标数组',
                                        name: 'array',
                                        shape: 'InputText',
                                        placeholder: '允许输入多个数值，用英文逗号分隔',
                                    },
                                    {
                                        label: '索引名称',
                                        name: 'indexName',
                                        shape: 'InputText',
                                        defaultValue: 'index',
                                    },
                                    {
                                        label: '元素名称',
                                        name: 'elementName',
                                        shape: 'InputText',
                                        defaultValue: 'element',
                                    },
                                    {
                                        label: '终止条件',
                                        name: 'terminalCondition',
                                        shape: 'InputText',
                                    },
                                ]
                            },
                        ]
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
                ]
            },
        }
    }
}

const testcaseViewStrategy: GraphStrategy = {
    stencilLayoutOptions: {
        columns: 1,
        columnWidth: 100,
        rowHeight: 120,
        center: true,
        resizeToFit: false,
        marginX: 5,
        marginY: 5,
    },
    stencilGraphWidth: 120,
    stencilGraphHeight: 1000,
    stencilGraphPadding: 10,
    sidebarItems: [
        {
            type: 'assginment',
            label: 'Assginment',
            shape: 'assginment-node',
            color: '#ffffffff',
            defaultAttrs: {
                width: 100,
                height: 60,
                stroke: '#333',
                fill: '#fff'
            }
        },
        {
            type: 'executable',
            label: 'Executable',
            shape: 'executable-node',
            color: '#ffffffff',
            defaultAttrs: {
                width: 100,
                height: 60,
                stroke: '#333',
                fill: '#fff'
            }
        },
        {
            type: 'loop',
            label: 'Loop',
            shape: 'loop-node',
            color: '#ffffffff',
            defaultAttrs: {
                width: 100,
                height: 60,
                stroke: '#333',
                fill: '#fff'
            }
        },
        {
            type: 'traverse',
            label: 'Traverse',
            shape: 'traverse-node',
            color: '#ffffffff',
            defaultAttrs: {
                width: 100,
                height: 60,
                stroke: '#333',
                fill: '#fff'
            }
        },
        {
            type: 'branch',
            label: 'Branch',
            shape: 'branch-node',
            color: '#ffffffff',
            defaultAttrs: {
                width: 100,
                height: 60,
                stroke: '#333',
                fill: '#fff'
            }
        }
    ],
    registerNodes: () => {
        register({
            shape: 'assginment-node',
            component: Assignment
        })
        register({
            shape: 'executable-node',
            component: Executable
        })
        register({
            shape: 'loop-node',
            component: Loop
        })
        register({
            shape: 'traverse-node',
            component: Traverse
        })
        register({
            shape: 'branch-node',
            component: Branch
        })
        register({
            shape: 'sub-branch-node',
            component: SubBranch
        })
    },
    formConfig: formConfig,
    defaultEdgeMarker: null,
    edgeRules: {
        // 获取节点的 port group 配置
        getPortGroups: (_nodeShape: string) => {
            const basePortStyle = {
                r: 4,
                magnet: true,
                stroke: '#1890ff',
                fill: '#fff',
                strokeWidth: 1,
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
        getInitialPorts: (_nodeShape: string) => {
            // 其他节点：无初始 port，创建连线时动态添加
            return []
        },

        // 节点是否支持动态添加多个 port
        supportsMultiplePorts: (_nodeShape: string) => {
            return true
        },
    },
}

export default testcaseViewStrategy
