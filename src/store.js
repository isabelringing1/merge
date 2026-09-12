import { configureStore, createSlice } from '@reduxjs/toolkit'
import { DEBUG_GRID } from './debug.js'

export const COLS = 6
export const ROWS = 9

const CELL_COUNT = COLS * ROWS
const STORAGE_KEY = 'merge.board.v1'

const emptyCell = () => ({ enabled: true, item: null })

function cellFromDebugValue(value) {
  if (value === null || value === undefined) return { enabled: false, item: null }
  if (value === 0) return emptyCell()
  if (value === 'G') return { enabled: true, item: { type: 'generator' } }
  return { enabled: true, item: { type: 'number', value } }
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

function loadSavedCells() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (!Array.isArray(saved) || saved.length !== CELL_COUNT) return null
    return saved.map((cell) => ({
      enabled: Boolean(cell?.enabled),
      item: cell?.item?.type === 'generator'
        ? { type: 'generator' }
        : typeof cell?.item?.value === 'number'
          ? { type: 'number', value: cell.item.value }
          : null,
    }))
  } catch {
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
