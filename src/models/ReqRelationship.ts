export interface ReqRelationship {
    id: string
    project_id: string
    from_requirement: string
    to_requirement: string
    rel_type: string
    properties?: Record<string, any>
    created_by?: string
    created_at?: string
}