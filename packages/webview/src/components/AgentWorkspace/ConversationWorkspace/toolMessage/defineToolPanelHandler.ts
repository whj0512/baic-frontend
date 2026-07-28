import type {
  RegisteredToolPanelHandler,
  ToolPanelHandlerDefinition,
} from './types'

export function defineToolPanelHandler<T>(
  definition: ToolPanelHandlerDefinition<T>,
): RegisteredToolPanelHandler {
  return definition as RegisteredToolPanelHandler
}
