import { Tooltip } from 'antd'
import { QuestionCircleOutlined } from '@ant-design/icons'
import './DimensionList.css'

export interface DimensionListSection<Key extends string = string> {
  key: Key
  dimensionCode: string
  label: string
  desc: string
}

interface DimensionListProps<Section extends DimensionListSection = DimensionListSection> {
  sections: Section[]
  isSectionDefined: (section: Section) => boolean
  onSectionClick?: (section: Section) => void
}

function DimensionList<Section extends DimensionListSection = DimensionListSection>({
  sections,
  isSectionDefined,
  onSectionClick,
}: DimensionListProps<Section>) {
  return (
    <div className="dimension-list">
      {sections.map((section) => {
        const defined = isSectionDefined(section)

        return (
          <div
            key={section.key}
            className="dimension-item"
            onClick={() => onSectionClick?.(section)}
          >
            <div className="dimension-item-left">
              <span className={`dimension-tag tag-${section.dimensionCode}`}>{section.dimensionCode}</span>
              <span className="dimension-label">{section.label}</span>
              <Tooltip title={section.desc} placement="top">
                <button
                  type="button"
                  className="dimension-help-button"
                  aria-label={`${section.label}定义说明`}
                  onClick={(event) => event.stopPropagation()}
                >
                  <QuestionCircleOutlined />
                </button>
              </Tooltip>
            </div>
            <div className="dimension-item-right">
              {defined ? (
                <span className="dimension-status has-data">已定义</span>
              ) : (
                <span className="dimension-status no-data">未定义</span>
              )}
              <span className="dimension-arrow" aria-hidden="true">&rsaquo;</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default DimensionList
