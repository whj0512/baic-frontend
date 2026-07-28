import { defineFenceHandler } from '../defineFenceHandler'
import ChunksMessagePanel from './ChunksMessagePanel'
import { parseChunksEnvelope } from './parseChunks'

export const chunksFenceHandler = defineFenceHandler({
  keyword: 'chunks',
  parse: parseChunksEnvelope,
  Component: ChunksMessagePanel,
})
