import { useEffect, useRef, useState } from 'react'
import { drawBoardDither } from './boardDither.js'

const SEED_STORAGE_KEY = 'merge.board-dither-seed.v1'
const SAMPLES_PER_TILE = 12

function loadOrCreateSeed() {
  try {
    const savedSeed = Number(localStorage.getItem(SEED_STORAGE_KEY))
    if (Number.isSafeInteger(savedSeed) && savedSeed > 0) return savedSeed

    const seed = Math.floor(Math.random() * 1_000_000) + 1
    localStorage.setItem(SEED_STORAGE_KEY, String(seed))
    return seed
  } catch {
    return Math.floor(Math.random() * 1_000_000) + 1
  }
}

function BoardDitherCanvas({ columns, rows }) {
  const canvasRef = useRef(null)
  const surroundRef = useRef(null)
  const [seed] = useState(loadOrCreateSeed)

  useEffect(() => {
    const canvas = canvasRef.current
    const surround = surroundRef.current
    const board = canvas?.parentElement
    if (!canvas || !surround || !board) return undefined

    const render = () => {
      const boardRect = board.getBoundingClientRect()
      const { width, height } = boardRect
      if (width <= 0 || height <= 0) return

      // One backing-canvas pixel is one dither sample. Scaling this exact grid
      // keeps every board tile at 12 x 12 samples at any rendered tile size.
      canvas.width = columns * SAMPLES_PER_TILE
      canvas.height = rows * SAMPLES_PER_TILE

      const context = canvas.getContext('2d')
      if (!context) return
      context.setTransform(1, 0, 0, 1, 0, 0)
      context.imageSmoothingEnabled = false
      drawBoardDither(context, canvas.width, canvas.height, {
        seed,
        samplesPerTile: SAMPLES_PER_TILE,
        boardColumns: columns,
        boardRows: rows,
      })

      const cellWidth = width / columns
      const cellHeight = height / rows
      const columnsBefore = Math.ceil(boardRect.left / cellWidth)
      const columnsAfter = Math.ceil(
        (window.innerWidth - boardRect.right) / cellWidth,
      )
      const surroundColumns = columnsBefore + columns + columnsAfter
      const surroundRows = Math.max(
        rows,
        Math.ceil((window.innerHeight - boardRect.top) / cellHeight),
      )

      surround.width = surroundColumns * SAMPLES_PER_TILE
      surround.height = surroundRows * SAMPLES_PER_TILE
      surround.style.left = `${-columnsBefore * cellWidth}px`
      surround.style.width = `${surroundColumns * cellWidth}px`
      surround.style.height = `${surroundRows * cellHeight}px`

      const surroundContext = surround.getContext('2d')
      if (!surroundContext) return
      surroundContext.setTransform(1, 0, 0, 1, 0, 0)
      surroundContext.imageSmoothingEnabled = false
      drawBoardDither(surroundContext, surround.width, surround.height, {
        seed,
        samplesPerTile: SAMPLES_PER_TILE,
        boardColumns: surroundColumns,
        boardRows: surroundRows,
        originColumn: -columnsBefore,
      })
    }

    const observer = new ResizeObserver(render)
    observer.observe(board)
    window.addEventListener('resize', render)
    render()

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', render)
    }
  }, [columns, rows, seed])

  return (
    <>
      <canvas
        ref={surroundRef}
        className="board-dither-surround"
        aria-hidden="true"
      />
      <canvas ref={canvasRef} className="board-dither" aria-hidden="true" />
    </>
  )
}

export default BoardDitherCanvas
