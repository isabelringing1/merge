import { useEffect, useRef, useState } from 'react'
import { drawBoardDither } from './boardDither.js'

const SIZE = 12
const RIP_EDGE = [6, 6, 7, 9, 8, 7, 8, 8, 8, 8, 7, 7]

function LockedDitherCanvas({
  tileIndex,
  hiddenNeighborMask,
  hiddenNeighborCount,
  neighborCount,
}) {
  const canvasRef = useRef(null)
  // Capture the neighboring state when this lock first appears. The cover must
  // not be regenerated as nearby hidden cells are revealed.
  const [pattern] = useState(() => {
    const hiddenRatio = neighborCount ? hiddenNeighborCount / neighborCount : 0
    const randomSeed = Math.floor(Math.random() * 1_000_000) + 1

    return {
      seed: randomSeed + tileIndex * 131 + hiddenNeighborMask * 977,
      densityOffset: (hiddenRatio - 0.5) * 0.28,
    }
  })

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return

    context.imageSmoothingEnabled = false
    drawBoardDither(context, SIZE, SIZE, {
      seed: pattern.seed,
      samplesPerTile: SIZE,
      boardColumns: 1,
      boardRows: 1,
      densityOffset: pattern.densityOffset,
    })

    // Remove everything above the fixed, jagged rip while preserving the
    // complete dither sample squares along its edge.
    RIP_EDGE.forEach((edge, column) => {
      context.clearRect(column, 0, 1, edge)
    })
  }, [pattern])

  return <canvas ref={canvasRef} width={SIZE} height={SIZE} aria-hidden="true" />
}

export default LockedDitherCanvas
