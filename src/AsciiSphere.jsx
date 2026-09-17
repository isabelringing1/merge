import { useEffect, useRef, useState } from 'react'

const RADIUS = 14
const ROTATION_MS = 8000
const DRAG_THRESHOLD_PX = 4
const FULL_TURN = Math.PI * 2

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
  const phaseRef = useRef(0)
  const dragRef = useRef(null)
  const suppressClickRef = useRef(false)

  useEffect(() => {
    let animationFrame
    let previousTime

    const animate = (time) => {
      previousTime ??= time

      if (!dragRef.current) {
        phaseRef.current = (phaseRef.current + ((time - previousTime) / ROTATION_MS) * FULL_TURN) % FULL_TURN
        setFrame(makeFrame(phaseRef.current))
      }

      previousTime = time
      animationFrame = window.requestAnimationFrame(animate)
    }

    animationFrame = window.requestAnimationFrame(animate)
    return () => window.cancelAnimationFrame(animationFrame)
  }, [])

  const handlePointerDown = (event) => {
    if (event.button !== 0) return

    const width = event.currentTarget.getBoundingClientRect().width
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startPhase: phaseRef.current,
      width,
      moved: false,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    const deltaX = event.clientX - drag.startX
    if (Math.abs(deltaX) >= DRAG_THRESHOLD_PX) drag.moved = true

    // Decreasing the texture phase moves the visible surface to the right.
    phaseRef.current = drag.startPhase - (deltaX / drag.width) * FULL_TURN
    setFrame(makeFrame(phaseRef.current))
  }

  const finishDrag = (event) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    suppressClickRef.current = drag.moved
    dragRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const handleClick = (event) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      event.preventDefault()
      return
    }

    onClick()
  }

  return (
    <button
      className="ascii-sphere"
      type="button"
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
      aria-label="Open game board"
    >
      <pre aria-hidden="true">{frame}</pre>
    </button>
  )
}

export default AsciiSphere
