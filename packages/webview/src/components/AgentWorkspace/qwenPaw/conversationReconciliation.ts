export function shouldReconcileConversationHistory(options: {
  historyStatus: string
  historyMessageCount: number
  baselineHistoryCount: number
  observedRunning: boolean
  terminalStatus: 'completed' | 'failed' | null
}): boolean {
  return options.terminalStatus !== 'failed'
    && options.historyStatus === 'idle'
    && (
      options.terminalStatus === 'completed'
      || options.observedRunning
      || options.historyMessageCount > options.baselineHistoryCount
    )
}
