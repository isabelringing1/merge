import { useEffect, useMemo, useState } from 'react'

const RADIUS = 14
const FRAME_COUNT = 32
const FRAME_MS = 80

function makeFrame(phase) {
  const rows = []

  for (let y = -RADIUS; y <= RADIUS; y += 1) {
    let row = ''

    for (let x = -RADIUS; x <= RADIUS; x += 1) {
      const nx = x / RADIUS
      const ny = y / RADIUS
      const distance = nx * nx + ny * ny

      if (distance > 1) {
        row += ' '
        continue
      }

      const nz = Math.sqrt(1 - distance)
      const longitude = Math.atan2(nx, nz) + phase
      const texture = Math.sin(longitude * 2.4)

      if (texture > 0.3) row += ';'
      else if (texture > -0.3) row += ':'
      else row += '.'
    }

    rows.push(row)
  }

  return rows.join('\n')
}

function AsciiSphere({ onClick }) {
  const frames = useMemo(
    () =>
      Array.from({ length: FRAME_COUNT }, (_, index) =>
        makeFrame((index / FRAME_COUNT) * Math.PI * 2),
      ),
    [],
  )
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    const interval = window.setInterval(
      () => setFrame((current) => (current + 1) % frames.length),
      FRAME_MS,
    )
    return () => window.clearInterval(interval)
  }, [frames.length])

  return (
    <button className="ascii-sphere" type="button" onClick={onClick} aria-label="Open game board">
      <pre aria-hidden="true">{frames[frame]}</pre>
    </button>
  )
}

export default AsciiSphere
