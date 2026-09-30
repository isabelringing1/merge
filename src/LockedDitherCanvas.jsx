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
  const [randomSeed] = useState(() => Math.floor(Math.random() * 1_000_000) + 1)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return

    const hiddenRatio = neighborCount ? hiddenNeighborCount / neighborCount : 0
    const influencedSeed =
      randomSeed + tileIndex * 131 + hiddenNeighborMask * 977

    context.imageSmoothingEnabled = false
    drawBoardDither(context, SIZE, SIZE, {
      seed: influencedSeed,
      samplesPerTile: SIZE,
      boardColumns: 1,
      boardRows: 1,
      densityOffset: (hiddenRatio - 0.5) * 0.28,
    })

    // Remove everything above the fixed, jagged rip while preserving the
    // complete dither sample squares along its edge.
    RIP_EDGE.forEach((edge, column) => {
      context.clearRect(column, 0, 1, edge)
    })
  }, [
    hiddenNeighborCount,
    hiddenNeighborMask,
    neighborCount,
    randomSeed,
    tileIndex,
  ])

  return <canvas ref={canvasRef} width={SIZE} height={SIZE} aria-hidden="true" />
}

export default LockedDitherCanvas
