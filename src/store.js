import { configureStore, createSlice } from '@reduxjs/toolkit'
import { DEBUG_GRID } from './debug.js'
import { getItemType } from './itemTypes.js'

export const COLS = 6
export const ROWS = 9

const CELL_COUNT = COLS * ROWS
const STORAGE_KEY = 'merge.board.v1'

const emptyCell = () => ({ enabled: true, item: null })

// '<type>G' -> generator, '<type><int>' -> number. The type prefix is required.
function itemFromDebugValue(value) {
  const match = typeof value === 'string' && /^([a-z]+)(G|\d+)$/i.exec(value)
  if (!match) {
    throw new Error(
      `Debug grid value ${JSON.stringify(value)} is missing an item type - write e.g. 't1', 'tG' or 'c1'`,
    )
  }
  const [, typeId, body] = match
  getItemType(typeId)
  return body === 'G'
    ? { kind: 'generator', type: typeId }
    : { kind: 'number', type: typeId, value: Number(body) }
}

function cellFromDebugValue(value) {
  if (value === null || value === undefined) return { enabled: false, item: null }
  if (value === 0) return emptyCell()
  return { enabled: true, item: itemFromDebugValue(value) }
}

function cellsFromDebugGrid(rows) {
  const cells = []
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      cells.push(cellFromDebugValue(rows[r]?.[c]))
    }
  }
  return cells
}

function savedItem(item) {
  getItemType(item?.type)
  if (item.kind === 'generator') return { kind: 'generator', type: item.type }
  if (item.kind === 'number' && Number.isInteger(item.value)) {
    return { kind: 'number', type: item.type, value: item.value }
  }
  throw new Error(`Invalid saved item ${JSON.stringify(item)}`)
}

function loadSavedCells() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (!Array.isArray(saved) || saved.length !== CELL_COUNT) return null
    return saved.map((cell) => ({
      enabled: Boolean(cell?.enabled),
      item: cell?.item ? savedItem(cell.item) : null,
    }))
  } catch {
    // Unreadable or typeless board (saved before item types existed) - start fresh.
    return null
  }
}

function initialCells() {
  if (DEBUG_GRID) return cellsFromDebugGrid(DEBUG_GRID)
  return loadSavedCells() ?? Array.from({ length: CELL_COUNT }, emptyCell)
}

const gridSlice = createSlice({
  name: 'grid',
  initialState: {
    cols: COLS,
    rows: ROWS,
    cells: initialCells(),
  },
  reducers: {
    moveItem: (state, action) => {
      const { from, to } = action.payload
      const source = state.cells[from]
      const target = state.cells[to]
      if (!source?.item || !target?.enabled || target.item) return
      target.item = source.item
      source.item = null
    },
    resetBoard: (state) => {
      state.cells = Array.from({ length: CELL_COUNT }, emptyCell)
    },
  },
})

export const { moveItem, resetBoard } = gridSlice.actions

export const store = configureStore({
  reducer: { grid: gridSlice.reducer },
})

let lastSavedCells = store.getState().grid.cells
store.subscribe(() => {
  const { cells } = store.getState().grid
  if (cells === lastSavedCells) return
  lastSavedCells = cells
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cells))
  } catch {
    // local storage unavailable (private mode, quota) - board just won't persist
  }
})
