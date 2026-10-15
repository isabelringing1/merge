import { configureStore, createSlice } from '@reduxjs/toolkit'
import { DEBUG_GRID, DEFAULT_BOARD_STATE } from './debug.js'
import { getItemType } from './itemTypes.js'

export const COLS = 6
export const ROWS = 8
export const BOARD_IDS = [1, 2, 3, 4]

const CELL_COUNT = COLS * ROWS
const PREVIOUS_CELL_COUNT = COLS * 9
const STORAGE_KEY = 'merge.boards.v4'

const emptyCell = () => ({ hidden: false, locked: false, item: null })
const itemId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `item-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

export const createItemId = itemId

// '<type>G' -> generator, '<type><int>' -> number. The type prefix is required.
function itemFromDebugValue(value, boardId) {
  const match = typeof value === 'string' && /^([a-z]+)(G|\d+)$/i.exec(value)
  if (!match) {
    throw new Error(
      `Debug grid value ${JSON.stringify(value)} is missing an item type - write e.g. 't1', 'tG' or 'c1'`,
    )
  }
  const [, typeId, body] = match
  const itemType = getItemType(typeId)
  if (!itemType.boardIds.includes(boardId)) {
    throw new Error(`Item type "${typeId}" is not available on board ${boardId}`)
  }
  return body === 'G'
    ? { id: itemId(), kind: 'generator', type: typeId }
    : { id: itemId(), kind: 'number', type: typeId, value: Number(body) }
}

function cellFromDebugValue(value, boardId) {
  if (value === null || value === undefined) {
    return { hidden: true, locked: false, item: null }
  }
  if (value === 0) return emptyCell()

  const hiddenMatch = typeof value === 'string' && /^\{\{(.+)\}\}$/.exec(value)
  const lockedMatch =
    !hiddenMatch && typeof value === 'string' && /^\{([^{}]+)\}$/.exec(value)
  const item = itemFromDebugValue(hiddenMatch?.[1] ?? lockedMatch?.[1] ?? value, boardId)
  if ((hiddenMatch || lockedMatch) && item.kind !== 'number') {
    throw new Error(
      `${hiddenMatch ? 'Hidden' : 'Locked'} cell ${JSON.stringify(value)} must contain a Number`,
    )
  }
  return { hidden: Boolean(hiddenMatch), locked: Boolean(lockedMatch), item }
}

function cellsFromDebugGrid(rows, boardId) {
  const cells = []
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      cells.push(cellFromDebugValue(rows[r]?.[c], boardId))
    }
  }
  return cells
}

function savedItem(item, boardId) {
  const itemType = getItemType(item?.type)
  if (!itemType.boardIds.includes(boardId)) {
    throw new Error(`Item type "${item.type}" does not belong to board ${boardId}`)
  }
  const id = typeof item.id === 'string' ? item.id : itemId()
  if (item.kind === 'generator') return { id, kind: 'generator', type: item.type }
  if (item.kind === 'number' && Number.isInteger(item.value)) {
    return { id, kind: 'number', type: item.type, value: item.value }
  }
  throw new Error(`Invalid saved item ${JSON.stringify(item)}`)
}

// Compact each uninterrupted, revealed-and-unlocked section of a column.
// Hidden and locked cells are barriers even when empty, so gravity can never
// pull an item through one to fill a vacancy on the other side.
export function applyGravity(cells) {
  const moves = []

  for (let column = 0; column < COLS; column += 1) {
    let segmentBottom = ROWS - 1

    while (segmentBottom >= 0) {
      const bottomIndex = segmentBottom * COLS + column
      if (cells[bottomIndex].hidden || cells[bottomIndex].locked) {
        segmentBottom -= 1
        continue
      }

      let segmentTop = segmentBottom
      while (segmentTop > 0) {
        const above = cells[(segmentTop - 1) * COLS + column]
        if (above.hidden || above.locked) break
        segmentTop -= 1
      }

      let destinationRow = segmentBottom
      let fallOrder = 0
      for (let row = segmentBottom; row >= segmentTop; row -= 1) {
        const from = row * COLS + column
        const item = cells[from].item
        if (!item) continue

        const to = destinationRow * COLS + column
        if (to !== from) {
          cells[to].item = item
          cells[from].item = null
          moves.push({
            id: item.id,
            from,
            to,
            rows: destinationRow - row,
            order: fallOrder,
          })
          fallOrder += 1
        }
        destinationRow -= 1
      }

      segmentBottom = segmentTop - 1
    }
  }

  return moves
}

function settle(board) {
  const moves = applyGravity(board.cells)
  board.gravity = {
    revision: board.gravity.revision + 1,
    moves,
  }
}

function normalizeSavedCells(saved, boardId) {
  if (
    !Array.isArray(saved) ||
    (saved.length !== CELL_COUNT && saved.length !== PREVIOUS_CELL_COUNT)
  ) {
    return null
  }
  // The 6x9 board had one extra empty row at the bottom.
  return saved.slice(0, CELL_COUNT).map((cell) => {
    const item = cell?.item ? savedItem(cell.item, boardId) : null
    const hidden = Boolean(cell?.hidden)
    return {
      hidden,
      locked: Boolean(!hidden && cell?.locked && item?.kind === 'number'),
      item,
    }
  })
}

function loadSavedBoards() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return {}

    const boards = {}
    for (const boardId of BOARD_IDS) {
      const cells = normalizeSavedCells(saved[boardId], boardId)
      if (cells) boards[boardId] = cells
    }
    return boards
  } catch {
    return {}
  }
}

function initialBoard(boardId, savedBoards) {
  const cells =
    boardId === 1 && DEBUG_GRID
      ? cellsFromDebugGrid(DEBUG_GRID, boardId)
      : savedBoards[boardId] ?? cellsFromDebugGrid(DEFAULT_BOARD_STATE[boardId], boardId)
  applyGravity(cells)
  return { cells, gravity: { revision: 0, moves: [] } }
}

function initialBoards() {
  const savedBoards = loadSavedBoards()
  return Object.fromEntries(
    BOARD_IDS.map((boardId) => [boardId, initialBoard(boardId, savedBoards)]),
  )
}

function activeBoard(state) {
  return state.boards[state.activeBoardId]
}

export function selectActiveBoardState(state) {
  const { grid } = state
  return grid.boards[grid.activeBoardId]
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

// Nearest revealed, empty cell to `index`, or null if the board has none. Ranked
// by straight-line distance, so the eight surrounding cells come first; ties
// break top-to-bottom, left-to-right.
export function nearestOpenCell(cells, index) {
  const fromRow = Math.floor(index / COLS)
  const fromCol = index % COLS
  let best = null

  for (let i = 0; i < cells.length; i++) {
    if (i === index || cells[i].hidden || cells[i].item) continue
    const distance = (Math.floor(i / COLS) - fromRow) ** 2 + ((i % COLS) - fromCol) ** 2
    if (best === null || distance < best.distance) best = { index: i, distance }
  }

  return best?.index ?? null
}

// 'move' | 'merge' | 'swap' | null, where null means the drop is invalid and
// the dragged item should snap back.
export function dropOutcome(cells, from, to) {
  if (from === to) return null
  const source = cells[from]
  const target = cells[to]
  if (!source?.item || source.hidden || source.locked || !target || target.hidden) return null
  if (!target.item) return 'move'
  if (canMerge(source.item, target.item)) return 'merge'
  return target.locked ? null : 'swap'
}

const gridSlice = createSlice({
  name: 'grid',
  initialState: {
    cols: COLS,
    rows: ROWS,
    activeBoardId: BOARD_IDS[0],
    boards: initialBoards(),
  },
  reducers: {
    selectBoard: (state, action) => {
      const boardId = Number(action.payload)
      if (BOARD_IDS.includes(boardId)) state.activeBoardId = boardId
    },
    moveItem: (state, action) => {
      const board = activeBoard(state)
      const { from, to } = action.payload
      const source = board.cells[from]
      const target = board.cells[to]
      if (!source?.item || source.hidden || source.locked || !target || target.hidden || target.item) {
        return
      }
      target.item = source.item
      source.item = null
      settle(board)
    },
    swapItems: (state, action) => {
      const board = activeBoard(state)
      const { from, to } = action.payload
      const source = board.cells[from]
      const target = board.cells[to]
      if (
        !source?.item ||
        source.hidden ||
        source.locked ||
        !target?.item ||
        target.hidden ||
        target.locked
      ) {
        return
      }
      const sourceItem = source.item
      source.item = target.item
      target.item = sourceItem
      settle(board)
    },
    mergeItems: (state, action) => {
      const board = activeBoard(state)
      const { from, to } = action.payload
      const source = board.cells[from]
      const target = board.cells[to]
      if (
        source?.hidden ||
        source?.locked ||
        !target ||
        target.hidden ||
        !canMerge(source?.item, target.item)
      ) {
        return
      }
      const mergedIntoLockedTile = target.locked
      target.item = { ...target.item, value: source.item.value + target.item.value }
      target.locked = false
      source.item = null

      if (mergedIntoLockedTile) {
        const row = Math.floor(to / COLS)
        const col = to % COLS
        const neighbors = [
          row > 0 ? to - COLS : null,
          row < ROWS - 1 ? to + COLS : null,
          col > 0 ? to - 1 : null,
          col < COLS - 1 ? to + 1 : null,
        ]
        for (const index of neighbors) {
          if (index === null || !board.cells[index].hidden) continue
          board.cells[index].hidden = false
          board.cells[index].locked = Boolean(board.cells[index].item)
        }
      }
      settle(board)
    },
    // Drops a value-1 number of the generator's own type into `to`, which the
    // caller picks with nearestOpenCell so it can animate along the same path.
    spawnItem: (state, action) => {
      const board = activeBoard(state)
      const { from, to } = action.payload
      const source = board.cells[from]
      const generator = source?.item
      const target = board.cells[to]
      if (
        source?.hidden ||
        source?.locked ||
        generator?.kind !== 'generator' ||
        !target ||
        target.hidden ||
        target.item
      ) {
        return
      }
      target.item = {
        id: action.payload.id ?? itemId(),
        kind: 'number',
        type: generator.type,
        value: 1,
      }
      settle(board)
    },
    resetBoard: (state) => {
      const board = activeBoard(state)
      board.cells = Array.from({ length: CELL_COUNT }, emptyCell)
      board.gravity = { revision: board.gravity.revision + 1, moves: [] }
    },
  },
})

export const { selectBoard, moveItem, swapItems, mergeItems, spawnItem, resetBoard } =
  gridSlice.actions

export const store = configureStore({
  reducer: { grid: gridSlice.reducer },
})

let lastSavedBoards = store.getState().grid.boards
store.subscribe(() => {
  const { boards } = store.getState().grid
  if (boards === lastSavedBoards) return
  lastSavedBoards = boards
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(
        Object.fromEntries(BOARD_IDS.map((boardId) => [boardId, boards[boardId].cells])),
      ),
    )
  } catch {
    // local storage unavailable (private mode, quota) - board just won't persist
  }
})
