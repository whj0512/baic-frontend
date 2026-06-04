export interface LogicDefinition {
  name: string
  name_as: string
  type: 'logic'
  doc?: string
}

export interface SignalTypeDefinition {
  name: string
  type: 'type'
  doc?: string
  value_string_mapping?: Array<{ name: string; value: string }>
}

export interface CaseDatabaseData {
  logics: LogicDefinition[]
  types: SignalTypeDefinition[]
}

export const getDatabaseDataForCase = (): CaseDatabaseData => ({
  logics: [
    {
      name: 'save',
      name_as: 'save(value)',
      type: 'logic',
      doc: 'Persist the provided value.',
    },
    {
      name: 'calculate',
      name_as: 'calculate(left, right)',
      type: 'logic',
      doc: 'Calculate a derived value.',
    },
    {
      name: 'validate',
      name_as: 'validate(input)',
      type: 'logic',
      doc: 'Validate an input value.',
    },
  ],
  types: [
    {
      name: 'speed',
      type: 'type',
      doc: 'Vehicle speed.',
      value_string_mapping: [
        { name: 'Stopped', value: '0' },
        { name: 'Cruise', value: '80' },
      ],
    },
    {
      name: 'status',
      type: 'type',
      doc: 'Execution status.',
      value_string_mapping: [
        { name: 'Idle', value: 'idle' },
        { name: 'Running', value: 'running' },
        { name: 'Error', value: 'error' },
      ],
    },
  ],
})
