import { memo, useMemo } from 'react'
import type { ConversationMessageView } from '../qwenPaw/types'
import ConversationMessage from './ConversationMessage'
import { extractFencedMessage } from './fencedMessage/extractFencedMessage'
import { extractToolPanels } from './toolMessage/extractToolPanels'

interface ConversationMessageEntryProps {
  message: ConversationMessageView
  assistantName: string
}

function ConversationMessageEntry({
  message,
  assistantName,
}: ConversationMessageEntryProps) {
  const presentation = useMemo(() => {
    const fenced = extractFencedMessage(message)
    const panels = [
      ...fenced.blocks.map((block) => ({
        kind: 'fence' as const,
        partIndex: block.partIndex,
        order: block.blockIndex,
        block,
      })),
      ...extractToolPanels(message).map((panel, order) => ({
        kind: 'tool' as const,
        partIndex: panel.partIndex,
        order,
        panel,
      })),
    ].sort((left, right) =>
      left.partIndex - right.partIndex || left.order - right.order)

    return {
      displayMessage: fenced.displayMessage,
      panels,
    }
  }, [message])
  const standalone = presentation.displayMessage === null

  return (
    <div className="conversation-entry">
      {presentation.displayMessage ? (
        <ConversationMessage
          message={presentation.displayMessage}
          assistantName={assistantName}
        />
      ) : null}

      {presentation.panels.length > 0 ? (
        <div
          className={`conversation-entry__panels${
            standalone ? ' conversation-entry__panels--standalone' : ''
          }`}
        >
          {presentation.panels.map((item) => {
            if (item.kind === 'fence') {
              const { block } = item
              const Panel = block.handler.Component
              return (
                <Panel
                  key={`${message.id}:${block.keyword}:${block.blockIndex}`}
                  payload={block.payload}
                  rawBody={block.rawBody}
                  context={{
                    message,
                    assistantName,
                    standalone,
                  }}
                />
              )
            }

            const { panel } = item
            const Panel = panel.handler.Component
            return (
              <Panel
                key={`${message.id}:${panel.handler.id}:${panel.callId}`}
                payload={panel.payload}
                context={{
                  message,
                  assistantName,
                }}
              />
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

export default memo(ConversationMessageEntry)
