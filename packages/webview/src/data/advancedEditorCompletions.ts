import type { AdvancedEditorCompletionItem } from '../hooks/useAdvancedEditor'
import { getDatabaseDataForCase } from '../components/graph/form-panel/controls/testcaseView/getDatabaseDataForCase'
import { getLegacyActionDatabaseData } from '../../../extension/data/legacyLogics'
import { getListOfName } from '../components/graph/form-panel/controls/internalConstraints/Action/utils'

export const createActionCompletionItems = (groupId?: string): AdvancedEditorCompletionItem[] => {
  const legacyData = getLegacyActionDatabaseData()
  const caseData = getDatabaseDataForCase()
  const candidates = getListOfName(groupId, {
    logics: legacyData.logics,
    types: legacyData.types.concat(caseData.types),
  })
  const items = new Map<string, AdvancedEditorCompletionItem>()

  candidates.forEach((candidate) => {
    if (candidate.type === 'logic') {
      items.set(`logic:${candidate.name}`, {
        label: candidate.name,
        insertText: candidate.name_as || candidate.name,
        detail: candidate.name_as,
        documentation: candidate.doc,
        kind: 'function',
      })
      return
    }

    items.set(`type:${candidate.name}`, {
      label: candidate.name,
      insertText: candidate.name,
      detail: candidate.value_string_mapping
        ?.map((option) => `${option.name}: ${option.value}`)
        .join(', ') || 'type',
      documentation: candidate.doc,
      kind: 'variable',
    })
  })

  return Array.from(items.values())
}
