import type {
  FenceHandlerDefinition,
  RegisteredFenceHandler,
} from './types'

const DEFAULT_ROLES = ['assistant'] as const

export function defineFenceHandler<T>(
  definition: FenceHandlerDefinition<T>,
): RegisteredFenceHandler {
  return {
    keyword: definition.keyword,
    roles: definition.roles ?? DEFAULT_ROLES,
    parse: definition.parse,
    Component: definition.Component,
  } as RegisteredFenceHandler
}
