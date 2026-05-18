// environment 图导出 JSON 的类型定义 - 基于 helps/models.md
// 基本类
export interface ControllerTimerValue {
    timerName?: string
    intervalNum?: number
    addrNum?: string
}

export interface ProtocolTable {
    procTableName?: string
    procTableItems?: Record<string, string>  // { procTableItem: ItemMeaning }
}

export interface Port {
    direction: string
    portName?: string
    baseAttr?: string
    procTables?: Record<string, ProtocolTable>  // { dataName: ProtocolTable }
}

// Componenet 相关
export interface Component {
    id: string
    type: string
    name?: string
}

export interface HardComponent extends Component {

}

export interface Human extends HardComponent {

}

export interface Device extends HardComponent {
    ports?: Port[]
}

export interface ControlUnit extends HardComponent {
    ports?: Port[]
    timer?: ControllerTimerValue
    controlPeriod?: string
}

export interface SoftComponent extends Component {
    requirementID?: string
}

export interface Controller extends SoftComponent {

}

export interface FunctionalModule extends SoftComponent {

}

export interface Machine extends SoftComponent {

}

// Interaction相关
export interface Interaction {
    name?: string
    sender?: string
    receiver?: string
    message?: string
}

export interface Connect {
    id: string
    interactions?: Interaction[]
}

export interface IBD {
    id: string
    desc?: string
    graph_type?: 'IBD'
    components: Component[]
    connects: Connect[]
}

// 所有节点类型的联合
export type ExportComponent =
    | Device
    | ControlUnit
    | Human
    | FunctionalModule
    | Machine
    | Controller