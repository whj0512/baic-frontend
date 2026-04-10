export interface ParamField {
    name: string
    type: string
}

export interface Message {
    message: string
    params: ParamField[]
    stereotype: string
    returnType: string
    msgType: string
    isReturn: boolean
}

export interface Componenet {
    id: string
    name: string
    type: string
    width: number
    height: number
    x: number
    y: number
}

export interface Interaction {
    id: string
    name: string
    sender?: Componenet
    receiver?: Componenet
    message?: Message
    source: any
    target: any
}

// 组合片段区域
export interface RelationScope {
    condition?: string
    interactions: Interaction[]
}

// 对应组合片段
export interface InterfaceRelation {
    id: string
    type: string
    scope?: RelationScope[]
    x: number
    y: number
    width: number
    height: number
}

export interface ESD {
    id: string
    desc?: string
    graph_type?: 'ESD'
    interactions: Interaction[]
    interfaceRelations: InterfaceRelation[]
}