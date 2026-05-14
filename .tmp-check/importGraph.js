"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.importGraphFromJSON = void 0;
const COMPONENT_START_X = 100;
const COMPONENT_Y = 100;
const COMPONENT_GAP = 200;
const COMPONENT_DEFAULT_WIDTH = 120;
const COMPONENT_DEFAULT_HEIGHT = 300;
const HEADER_HEIGHT = 50;
const EDGE_START_Y_OFFSET = 80;
const EDGE_Y_GAP = 80;
const FRAGMENT_DEFAULT_X = 100;
const FRAGMENT_DEFAULT_WIDTH = 200;
const FRAGMENT_DEFAULT_HEIGHT = 120;
const FRAGMENT_TAG_HEIGHT = 28;
const FRAGMENT_MIN_GAP_Y = 16;
const FRAGMENT_BASE_Z_INDEX = -200;
const isInteraction = (value) => {
    if (!value || typeof value !== 'object') {
        return false;
    }
    const candidate = value;
    return typeof candidate.id === 'string';
};
const normalizeFragmentSections = (relation) => {
    const rawScope = Array.isArray(relation.scope) ? relation.scope : [];
    if (rawScope.length === 0) {
        return [{ condition: '', interactions: [] }];
    }
    return rawScope.map(entry => {
        // par: scope is Interaction[][]
        if (Array.isArray(entry)) {
            return {
                condition: '',
                interactions: entry.filter(isInteraction),
            };
        }
        // alt/opt/loop: scope is [{ condition, interactions }]
        if (entry && typeof entry === 'object') {
            const scopeEntry = entry;
            if (Array.isArray(scopeEntry.interactions)) {
                return {
                    condition: scopeEntry.condition ?? '',
                    interactions: scopeEntry.interactions.filter(isInteraction),
                };
            }
        }
        // Defensive fallback: tolerate malformed single item section.
        return {
            condition: '',
            interactions: isInteraction(entry) ? [entry] : [],
        };
    });
};
const formatLabel = (data) => {
    const parts = [];
    if (data.stereotype && data.stereotype !== 'base') {
        parts.push(`<<${data.stereotype}>>`);
    }
    const msg = data.message || '';
    const prm = data.params && Array.isArray(data.params)
        ? data.params.map(item => `${item.name}: ${item.type}`).join(', ')
        : '';
    const ret = data.returnType ? `: ${data.returnType}` : '';
    const mainPart = `${msg}(${prm})${ret}`;
    if (mainPart !== '()') {
        parts.push(mainPart);
    }
    return parts.join('\n');
};
const convertComponentNode = (component, index) => {
    let shape = 'seq-object-node';
    const data = {
        stroke: '#1890ff',
        fill: '#fff'
    };
    if (component.type === 'human') {
        shape = 'seq-actor-node';
        data.actorName = component.name;
        delete data.stroke;
        delete data.fill;
    }
    else {
        data.className = component.name;
        data.type = component.type;
    }
    const x = component.x ?? (index % 5) * COMPONENT_GAP + COMPONENT_START_X;
    const y = component.y ?? COMPONENT_Y;
    const width = component.width ?? COMPONENT_DEFAULT_WIDTH;
    const height = component.height ?? COMPONENT_DEFAULT_HEIGHT;
    return {
        id: component.id,
        shape,
        x,
        y,
        width,
        height,
        data,
    };
};
const buildScopeMetrics = (sections, interactionPositionMap) => {
    return sections.map(section => {
        const yValues = section.interactions
            .map(interaction => {
            const layout = interactionPositionMap.get(interaction.id);
            return layout ? (layout.source.y + layout.target.y) / 2 : null;
        })
            .filter((value) => value !== null)
            .sort((a, b) => a - b);
        if (yValues.length === 0) {
            return null;
        }
        return {
            minY: yValues[0],
            maxY: yValues[yValues.length - 1],
            centerY: (yValues[0] + yValues[yValues.length - 1]) / 2,
        };
    });
};
const calculateFragmentSectionHeight = (scopeMetrics) => {
    const heightCandidates = [EDGE_Y_GAP];
    scopeMetrics.forEach(metric => {
        if (metric) {
            heightCandidates.push(metric.maxY - metric.minY + EDGE_Y_GAP);
        }
    });
    let previousCenterY;
    scopeMetrics.forEach(metric => {
        if (!metric)
            return;
        if (previousCenterY !== undefined) {
            heightCandidates.push(metric.centerY - previousCenterY);
        }
        previousCenterY = metric.centerY;
    });
    return Math.max(...heightCandidates);
};
const calculateFragmentHorizontalBounds = (sections, componentPositionMap, interactionPositionMap) => {
    const scopedInteractions = sections.flatMap(section => section.interactions);
    const involvedComponentIds = new Set();
    scopedInteractions.forEach(interaction => {
        if (interaction.sender?.id) {
            involvedComponentIds.add(interaction.sender.id);
        }
        if (interaction.receiver?.id) {
            involvedComponentIds.add(interaction.receiver.id);
        }
    });
    const involvedComponents = Array.from(involvedComponentIds)
        .map(componentId => componentPositionMap.get(componentId))
        .filter((component) => Boolean(component));
    if (involvedComponents.length > 0) {
        const left = Math.min(...involvedComponents.map(component => component.x));
        const right = Math.max(...involvedComponents.map(component => component.x + component.width));
        return {
            x: left,
            width: Math.max(FRAGMENT_DEFAULT_WIDTH, right - left),
        };
    }
    const scopedLayouts = scopedInteractions
        .map(interaction => interactionPositionMap.get(interaction.id))
        .filter((layout) => Boolean(layout));
    if (scopedLayouts.length > 0) {
        const points = scopedLayouts.flatMap(layout => [layout.source.x, layout.target.x]);
        const left = Math.min(...points) - COMPONENT_DEFAULT_WIDTH / 2;
        const right = Math.max(...points) + COMPONENT_DEFAULT_WIDTH / 2;
        return {
            x: left,
            width: Math.max(FRAGMENT_DEFAULT_WIDTH, right - left),
        };
    }
    return {
        x: FRAGMENT_DEFAULT_X,
        width: FRAGMENT_DEFAULT_WIDTH,
    };
};
const calculateFragmentVerticalBounds = (relation, sections, interactionPositionMap) => {
    const sectionCount = Math.max(1, sections.length);
    const scopeMetrics = buildScopeMetrics(sections, interactionPositionMap);
    const sectionHeight = calculateFragmentSectionHeight(scopeMetrics);
    const firstScopeWithInteractions = scopeMetrics.findIndex(metric => metric !== null);
    if (firstScopeWithInteractions !== -1) {
        const firstMetric = scopeMetrics[firstScopeWithInteractions];
        const bodyTop = firstMetric.centerY - sectionHeight / 2 - firstScopeWithInteractions * sectionHeight;
        return {
            y: Math.max(COMPONENT_Y, bodyTop - FRAGMENT_TAG_HEIGHT),
            height: Math.max(FRAGMENT_DEFAULT_HEIGHT, FRAGMENT_TAG_HEIGHT + sectionCount * sectionHeight),
        };
    }
    return {
        y: relation.y > 0 ? relation.y : Math.max(COMPONENT_Y, COMPONENT_Y + EDGE_START_Y_OFFSET - FRAGMENT_TAG_HEIGHT),
        height: relation.height > 0
            ? relation.height
            : Math.max(FRAGMENT_DEFAULT_HEIGHT, FRAGMENT_TAG_HEIGHT + sectionCount * EDGE_Y_GAP),
    };
};
const collectInteractionIds = (sections) => {
    const interactionIds = new Set();
    sections.forEach(section => {
        section.interactions.forEach(interaction => {
            interactionIds.add(interaction.id);
        });
    });
    return interactionIds;
};
const getCellBounds = (cell) => {
    const x = cell.x ?? FRAGMENT_DEFAULT_X;
    const y = cell.y ?? COMPONENT_Y;
    const width = cell.width ?? FRAGMENT_DEFAULT_WIDTH;
    const height = cell.height ?? FRAGMENT_DEFAULT_HEIGHT;
    return {
        left: x,
        top: y,
        right: x + width,
        bottom: y + height,
        width,
        height,
    };
};
const isSubset = (left, right) => {
    if (left.size === 0 || right.size === 0 || left.size > right.size) {
        return false;
    }
    return Array.from(left).every(item => right.has(item));
};
const isNestedFragment = (a, b) => {
    const aBounds = getCellBounds(a.cell);
    const bBounds = getCellBounds(b.cell);
    const aInsideB = aBounds.left >= bBounds.left &&
        aBounds.right <= bBounds.right &&
        aBounds.top >= bBounds.top &&
        aBounds.bottom <= bBounds.bottom;
    const bInsideA = bBounds.left >= aBounds.left &&
        bBounds.right <= aBounds.right &&
        bBounds.top >= aBounds.top &&
        bBounds.bottom <= aBounds.bottom;
    if (aInsideB || bInsideA) {
        return true;
    }
    return isSubset(a.interactionIds, b.interactionIds) || isSubset(b.interactionIds, a.interactionIds);
};
const optimizeFragmentLayout = (items) => {
    const ordered = [...items].sort((a, b) => {
        const ay = a.cell.y ?? 0;
        const by = b.cell.y ?? 0;
        if (ay !== by)
            return ay - by;
        return a.sourceIndex - b.sourceIndex;
    });
    const placed = [];
    ordered.forEach(item => {
        const bounds = getCellBounds(item.cell);
        let nextTop = bounds.top;
        // Resolve collisions for independent fragments by shifting downward.
        for (let turn = 0; turn < ordered.length * 2; turn++) {
            let blockerBottom = null;
            placed.forEach(prev => {
                if (isNestedFragment(item, prev)) {
                    return;
                }
                const prevBounds = getCellBounds(prev.cell);
                const horizontalOverlap = bounds.left < prevBounds.right &&
                    bounds.right > prevBounds.left;
                const verticalConflict = nextTop < prevBounds.bottom + FRAGMENT_MIN_GAP_Y &&
                    nextTop + bounds.height > prevBounds.top - FRAGMENT_MIN_GAP_Y;
                if (horizontalOverlap && verticalConflict) {
                    blockerBottom = blockerBottom === null
                        ? prevBounds.bottom
                        : Math.max(blockerBottom, prevBounds.bottom);
                }
            });
            if (blockerBottom === null) {
                break;
            }
            nextTop = blockerBottom + FRAGMENT_MIN_GAP_Y;
        }
        item.cell.y = nextTop;
        placed.push(item);
    });
    const byAreaDesc = [...placed].sort((a, b) => {
        const areaA = (a.cell.width ?? FRAGMENT_DEFAULT_WIDTH) * (a.cell.height ?? FRAGMENT_DEFAULT_HEIGHT);
        const areaB = (b.cell.width ?? FRAGMENT_DEFAULT_WIDTH) * (b.cell.height ?? FRAGMENT_DEFAULT_HEIGHT);
        if (areaA !== areaB)
            return areaB - areaA;
        return a.sourceIndex - b.sourceIndex;
    });
    byAreaDesc.forEach((item, index) => {
        const zIndex = FRAGMENT_BASE_Z_INDEX + index;
        item.cell.zIndex = zIndex;
        item.cell.data = {
            ...(item.cell.data || {}),
            zIndex,
        };
    });
    return placed
        .sort((a, b) => a.sourceIndex - b.sourceIndex)
        .map(item => item.cell);
};
const convertFragmentNode = (relation, sections, componentPositionMap, interactionPositionMap) => {
    const conditions = sections.map(section => section.condition);
    const data = {
        fragmentType: relation.type,
        fragmentName: relation.id,
        conditions
    };
    const hasFrameSize = relation.width > 0 && relation.height > 0;
    const hasPlacedPosition = relation.x !== 0 || relation.y !== 0;
    // Backend may return an origin placeholder frame (0,0,200,120) even when
    // interactions exist. In that case we still rebuild coordinates.
    if (hasFrameSize && hasPlacedPosition) {
        return {
            id: relation.id,
            shape: 'seq-fragment-node',
            x: relation.x,
            y: relation.y,
            width: relation.width,
            height: relation.height,
            data
        };
    }
    const { x, width } = calculateFragmentHorizontalBounds(sections, componentPositionMap, interactionPositionMap);
    const { y, height } = calculateFragmentVerticalBounds(relation, sections, interactionPositionMap);
    return {
        id: relation.id,
        shape: 'seq-fragment-node',
        x,
        y,
        width,
        height,
        data
    };
};
const convertEdge = (interaction) => {
    const edgeData = {
        name: interaction.name,
        message: interaction.message?.message,
        params: interaction.message?.params || [],
        stereotype: interaction.message?.stereotype,
        returnType: interaction.message?.returnType,
        msgType: interaction.message?.msgType,
        isReturn: interaction.message?.isReturn,
        sourceId: interaction.sender?.id,
        targetId: interaction.receiver?.id
    };
    const labelText = formatLabel(edgeData);
    const labels = labelText ? [{ attrs: { text: { text: labelText } } }] : undefined;
    return {
        id: interaction.id,
        shape: 'edge',
        source: interaction.source,
        target: interaction.target,
        labels,
        attrs: {
            line: {
                stroke: '#1890ff',
                strokeWidth: 2,
                targetMarker: { name: 'block', width: 12, height: 8 },
            },
        },
        data: edgeData,
    };
};
const importGraphFromJSON = (jsonString) => {
    const apiData = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
    const cells = [];
    const uniqueNodes = new Map();
    if (apiData.interactions && Array.isArray(apiData.interactions)) {
        apiData.interactions.forEach(interaction => {
            if (interaction.sender?.id) {
                uniqueNodes.set(interaction.sender.id, interaction.sender);
            }
            if (interaction.receiver?.id) {
                uniqueNodes.set(interaction.receiver.id, interaction.receiver);
            }
        });
    }
    if (apiData.components && Array.isArray(apiData.components)) {
        apiData.components.forEach(component => {
            if (component.id && !uniqueNodes.has(component.id)) {
                uniqueNodes.set(component.id, component);
            }
        });
    }
    const componentPositionMap = new Map();
    const interactionPositionMap = new Map();
    let nodeIndex = 0;
    uniqueNodes.forEach(component => {
        const x = COMPONENT_START_X + nodeIndex * COMPONENT_GAP;
        const y = COMPONENT_Y;
        const width = component.width ?? COMPONENT_DEFAULT_WIDTH;
        const height = component.height ?? COMPONENT_DEFAULT_HEIGHT;
        componentPositionMap.set(component.id, { x, y, width, height });
        const repositionedComponent = { ...component, x, y, width, height };
        cells.push(convertComponentNode(repositionedComponent, nodeIndex));
        nodeIndex++;
    });
    if (apiData.interactions && Array.isArray(apiData.interactions)) {
        apiData.interactions.forEach((interaction, edgeIndex) => {
            const senderId = interaction.sender?.id;
            const receiverId = interaction.receiver?.id;
            if (!senderId || !receiverId)
                return;
            const senderPos = componentPositionMap.get(senderId);
            const receiverPos = componentPositionMap.get(receiverId);
            if (!senderPos || !receiverPos)
                return;
            const edgeY = COMPONENT_Y + HEADER_HEIGHT + EDGE_START_Y_OFFSET + edgeIndex * EDGE_Y_GAP;
            const sourceX = senderPos.x + senderPos.width / 2;
            const targetX = receiverPos.x + receiverPos.width / 2;
            const repositionedInteraction = {
                ...interaction,
                source: { x: sourceX, y: edgeY },
                target: { x: targetX, y: edgeY },
            };
            interactionPositionMap.set(interaction.id, {
                source: repositionedInteraction.source,
                target: repositionedInteraction.target,
            });
            cells.push(convertEdge(repositionedInteraction));
        });
    }
    if (apiData.interactionRelations && Array.isArray(apiData.interactionRelations)) {
        const fragmentItems = [];
        apiData.interactionRelations.forEach((relation, index) => {
            const sections = normalizeFragmentSections(relation);
            fragmentItems.push({
                cell: convertFragmentNode(relation, sections, componentPositionMap, interactionPositionMap),
                interactionIds: collectInteractionIds(sections),
                sourceIndex: index,
            });
        });
        cells.push(...optimizeFragmentLayout(fragmentItems));
    }
    const totalInteractions = apiData.interactions?.length ?? 0;
    const requiredHeight = HEADER_HEIGHT + EDGE_START_Y_OFFSET + totalInteractions * EDGE_Y_GAP + 60;
    cells.forEach(cell => {
        if (cell.shape === 'seq-object-node' || cell.shape === 'seq-actor-node') {
            if (cell.height < requiredHeight) {
                cell.height = requiredHeight;
            }
        }
    });
    return { cells };
};
exports.importGraphFromJSON = importGraphFromJSON;
exports.default = exports.importGraphFromJSON;
