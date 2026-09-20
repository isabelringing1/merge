import { useEffect, useRef, useState } from 'react'
import { drawBoardDither } from './boardDither.js'

const SEED_STORAGE_KEY = 'merge.board-dither-seed.v1'

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
  const [seed] = useState(loadOrCreateSeed)

  useEffect(() => {
    const canvas = canvasRef.current
    const board = canvas?.parentElement
    if (!canvas || !board) return undefined

    const render = () => {
      const { width, height } = board.getBoundingClientRect()
      if (width <= 0 || height <= 0) return

      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(width * pixelRatio)
      canvas.height = Math.round(height * pixelRatio)

      const context = canvas.getContext('2d')
      if (!context) return
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      context.imageSmoothingEnabled = false
      drawBoardDither(context, width, height, {
        seed,
        boardColumns: columns,
        boardRows: rows,
      })
    }

    const observer = new ResizeObserver(render)
    observer.observe(board)
    render()

    return () => observer.disconnect()
  }, [columns, rows, seed])

  return <canvas ref={canvasRef} className="board-dither" aria-hidden="true" />
}

export default BoardDitherCanvas
