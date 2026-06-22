// 预定义的信号和函数数据
export const mockSignalList = [
  {
    name: 'speed',
    type: 'type',
    doc: '速度信号 (km/h)',
    enumValues: ['0', '50', '100', '150', '200']
  },
  {
    name: 'temperature',
    type: 'type',
    doc: '温度信号 (°C)',
    enumValues: ['-20', '0', '25', '50', '100']
  },
  {
    name: 'pressure',
    type: 'type',
    doc: '压力信号 (kPa)',
    enumValues: ['0', '100', '200', '300', '500']
  },
  {
    name: 'status',
    type: 'type',
    doc: '状态信号',
    enumValues: ['idle', 'running', 'stopped', 'error']
  },
  {
    name: 'voltage',
    type: 'type',
    doc: '电压信号 (V)',
    enumValues: ['0', '5', '12', '24', '48']
  },
  {
    name: 'calculate',
    type: 'logic',
    doc: '计算函数：calculate(x, y) - 计算两个数的和',
    args: 'x, y'
  },
  {
    name: 'convert',
    type: 'logic',
    doc: '转换函数：convert(value) - 转换数值单位',
    args: 'value'
  },
  {
    name: 'validate',
    type: 'logic',
    doc: '验证函数：validate(input) - 验证输入是否合法',
    args: 'input'
  },
]

// 使用频率缓存 (localStorage key)
export const ACTION_SIGNAL_NAME = 'action_signal_usage_frequency'

// 获取符号列表
export const getSymbols = (groupId?: string): string[] => {
  return ['=', '>', '<', '>=', '<=', '!=', '==']
}

// 获取信号/函数列表
export const getListOfName = (groupId: string | undefined, env?: any) => {
  return mockSignalList
}

// 转换为 AutoComplete 选项格式
export const ConvertListToOptions = (summaryList: any[]) => {
  return summaryList.map(item => ({
    label: item.name,
    value: item.name,
  }))
}

// 检查名称是否匹配选项
export const isNameMatchOption = (summaryList: any[], name: string) => {
  const matched = summaryList.find(item => item.name === name)
  if (!matched) return false

  return () => {
    const selectedNameOption = matched
    const valueOptions = matched.type === 'type' && matched.enumValues
      ? matched.enumValues.map((v: string) => ({ label: v, value: v }))
      : []

    return { selectedNameOption, valueOptions }
  }
}

// 获取信号的枚举值提示
export const getSignalGuide = (selected: any) => {
  if (selected.type === 'type' && selected.enumValues) {
    return selected.enumValues.map((v: string) => ({ label: v, value: v }))
  }
  return []
}

// 获取函数的参数提示
export const getFunctionGuide = (selected: any) => {
  return selected.args || ''
}

// 检测字符串中的中文符号
export const getChCharOfStr = (text: string): string[] => {
  const chSymbols = ['，', '。', '；', '：', '（', '）', '【', '】', '、', '“', '”', '‘', '’']
  return chSymbols.filter(ch => text.includes(ch))
}

// 替换中文符号为英文符号
export const replaceChSymbolWithEnSymbol = (text: string, chSymbols: string[]): string => {
  const map: Record<string, string> = {
    '，': ',',
    '。': '.',
    '；': ';',
    '：': ':',
    '（': '(',
    '）': ')',
    '【': '[',
    '】': ']',
    '、': ',',
    '“': '"',
    '”': '"',
    '‘': "'",
    '’': "'",
  }

  let result = text
  chSymbols.forEach(ch => {
    if (map[ch]) {
      result = result.replace(new RegExp(ch, 'g'), map[ch])
    }
  })
  return result
}

// 判断是否是切换组件（某些信号自动设置符号）
export const isSwitchComponent = (selectedNameOption: any, type: string) => {
  // 简化实现：状态信号默认使用 = 符号
  if (selectedNameOption?.name === 'status' && type === 'type') {
    return () => '='
  }
  return false
}

// 判断是否在修改信号值（保持符号不变）
export const isModifySignalValue = (
  selectedNameOption: any,
  selectedSymbol: string,
  inputedValue: string
) => {
  return selectedNameOption?.type === 'type' && selectedSymbol && inputedValue
}

// 拼接对象为表达式字符串
export const joinObject = (obj: any) => {
  const { name = '', symbol = '', value = '' } = obj
  return {
    express: `${name} ${symbol} ${value}`.trim()
  }
}

// 按使用频率排序
export const sortSummaryListByUsageFrequency = (cacheKey: string, summaryList: any[]) => {
  try {
    const cached = localStorage.getItem(cacheKey)
    if (!cached) return

    const frequencyMap = JSON.parse(cached)
    summaryList.sort((a, b) => {
      const freqA = frequencyMap[a.name] || 0
      const freqB = frequencyMap[b.name] || 0
      return freqB - freqA
    })
  } catch (e) {
    console.error('Failed to sort by frequency:', e)
  }
}

// 缓存使用频率
export const cacheKeyWithUsageFrequency = (cacheKey: string, key: string) => {
  if (!key) return

  try {
    const cached = localStorage.getItem(cacheKey)
    const frequencyMap = cached ? JSON.parse(cached) : {}
    frequencyMap[key] = (frequencyMap[key] || 0) + 1
    localStorage.setItem(cacheKey, JSON.stringify(frequencyMap))
  } catch (e) {
    console.error('Failed to cache frequency:', e)
  }
}
