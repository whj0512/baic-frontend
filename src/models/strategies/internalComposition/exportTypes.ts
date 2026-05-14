// Componenet 相关
export interface Component {
    id: string
    type: string
    name?: string
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

export interface Relation {
    id: string
    type: string
    source: Component
    target: Component
}

export interface BDD {
    id: string,
    desc?: string
    graph_type?: 'BDD'
    components: Component[]
    relations: Relation[]
}

export type ExportComponent =
    | FunctionalModule
    | Machine
    | Controller