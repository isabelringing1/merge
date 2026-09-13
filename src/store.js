import { configureStore, createSlice } from '@reduxjs/toolkit'
import { DEBUG_GRID, DEFAULT_BOARD_STATE } from './debug.js'
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
  return loadSavedCells() ?? cellsFromDebugGrid(DEFAULT_BOARD_STATE)
}

// Two items merge only if both are Numbers of the same item type and value, so
// t1 + t1 works but t1 + t2 and t1 + c1 do not. Generators never merge.
export function canMerge(source, target) {
  return (
    source?.kind === 'number' &&
    target?.kind === 'number' &&
    source.type === target.type &&
    source.value === target.value
  )
}

// Nearest enabled, empty cell to `index`, or null if the board has none. Ranked
// by straight-line distance, so the eight surrounding cells come first; ties
// break top-to-bottom, left-to-right.
export function nearestOpenCell(cells, index) {
  const fromRow = Math.floor(index / COLS)
  const fromCol = index % COLS
  let best = null

  for (let i = 0; i < cells.length; i++) {
    if (i === index || !cells[i].enabled || cells[i].item) continue
    const distance = (Math.floor(i / COLS) - fromRow) ** 2 + ((i % COLS) - fromCol) ** 2
    if (best === null || distance < best.distance) best = { index: i, distance }
  }

  return best?.index ?? null
}

// 'move' | 'merge' | null, where null means the drop is invalid and the dragged
// item should snap back.
export function dropOutcome(cells, from, to) {
  if (from === to) return null
  const source = cells[from]
  const target = cells[to]
  if (!source?.item || !target?.enabled) return null
  if (!target.item) return 'move'
  return canMerge(source.item, target.item) ? 'merge' : null
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
    mergeItems: (state, action) => {
      const { from, to } = action.payload
      const source = state.cells[from]
      const target = state.cells[to]
      if (!target?.enabled || !canMerge(source?.item, target.item)) return
      target.item = { ...target.item, value: source.item.value + target.item.value }
      source.item = null
    },
    // Drops a value-1 number of the generator's own type into `to`, which the
    // caller picks with nearestOpenCell so it can animate along the same path.
    spawnItem: (state, action) => {
      const { from, to } = action.payload
      const generator = state.cells[from]?.item
      const target = state.cells[to]
      if (generator?.kind !== 'generator' || !target?.enabled || target.item) return
      target.item = { kind: 'number', type: generator.type, value: 1 }
    },
    resetBoard: (state) => {
      state.cells = Array.from({ length: CELL_COUNT }, emptyCell)
    },
  },
})

export const { moveItem, mergeItems, spawnItem, resetBoard } = gridSlice.actions

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
