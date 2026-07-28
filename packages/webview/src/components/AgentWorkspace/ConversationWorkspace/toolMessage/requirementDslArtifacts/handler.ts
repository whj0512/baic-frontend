import { defineToolPanelHandler } from '../defineToolPanelHandler'
import RequirementDslArtifactsPanel from './RequirementDslArtifactsPanel'
import {
  isRequirementDslArtifactsToolPart,
  parseRequirementDslArtifactsToolPart,
} from './parseRequirementDslArtifacts'

export const requirementDslArtifactsToolPanelHandler =
  defineToolPanelHandler({
    id: 'query-requirement-dsl-artifacts',
    matches: isRequirementDslArtifactsToolPart,
    parse: parseRequirementDslArtifactsToolPart,
    Component: RequirementDslArtifactsPanel,
  })
