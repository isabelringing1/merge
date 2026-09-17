import { useEffect, useState } from 'react'

const RADIUS = 14
const ROTATION_MS = 8000

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
      // A whole-number frequency makes the end and start of each rotation
      // identical, avoiding a visible jump when the animation loops.
      const texture = Math.sin(longitude * 2)

      if (texture > 0.3) row += ';'
      else if (texture > -0.3) row += ':'
      else row += '.'
    }

    rows.push(row)
  }

  return rows.join('\n')
}

function AsciiSphere({ onClick }) {
  const [frame, setFrame] = useState(() => makeFrame(0))

  useEffect(() => {
    let animationFrame
    let startTime

    const animate = (time) => {
      startTime ??= time
      const phase = (((time - startTime) % ROTATION_MS) / ROTATION_MS) * Math.PI * 2
      setFrame(makeFrame(phase))
      animationFrame = window.requestAnimationFrame(animate)
    }

    animationFrame = window.requestAnimationFrame(animate)
    return () => window.cancelAnimationFrame(animationFrame)
  }, [])

  return (
    <button className="ascii-sphere" type="button" onClick={onClick} aria-label="Open game board">
      <pre aria-hidden="true">{frame}</pre>
    </button>
  )
}

export default AsciiSphere
