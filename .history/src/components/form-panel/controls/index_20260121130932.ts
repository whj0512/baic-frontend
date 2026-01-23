import React from 'react'
import InputText from './common/InputText'
import InputNumber from './common/InputNumber'
import Checkbox from './common/Checkbox'
import Select from './Select'

const controlMap = new Map<string, React.FC<any>>()

// 注册基础控件
controlMap.set('InputText', InputText)
controlMap.set('InputNumber', InputNumber)
controlMap.set('Checkbox', Checkbox)
controlMap.set('Select', Select)

export const getControlMap = () => new Map(controlMap)

export const registerControl = (name: string, component: React.FC<any>) => {
  controlMap.set(name, component)
}

export { InputText, InputNumber, Checkbox, Select }
