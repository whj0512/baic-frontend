import { loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'

type MonacoWorkerConstructor = new () => Worker

const monacoWorkerMap: Record<string, MonacoWorkerConstructor> = {
  css: cssWorker,
  handlebars: htmlWorker,
  html: htmlWorker,
  javascript: tsWorker,
  json: jsonWorker,
  less: cssWorker,
  razor: htmlWorker,
  scss: cssWorker,
  typescript: tsWorker,
}

const monacoGlobal = self as unknown as {
  MonacoEnvironment?: {
    getWorker: (_workerId: string, label: string) => Worker
  }
}

monacoGlobal.MonacoEnvironment = {
  getWorker(_workerId, label) {
    const WorkerConstructor = monacoWorkerMap[label] ?? editorWorker

    return new WorkerConstructor()
  },
}

loader.config({ monaco })
