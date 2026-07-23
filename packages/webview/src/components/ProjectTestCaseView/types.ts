export type JsonPrimitive = string | number | boolean | null

export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue }

export interface ProjectTestCase {
  id: string
  name: string | null
  project_id: string
  test_content?: JsonValue
  related_requirements?: JsonValue
  related_scenarios?: JsonValue
  properties?: JsonValue
  created_by?: JsonValue
  created_at?: JsonValue
  updated_at?: JsonValue
  [key: string]: JsonValue | undefined
}
