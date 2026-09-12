import { useEffect, useLayoutEffect, useRef } from 'react'
import Generator from './Generator.jsx'
import Number from './Number.jsx'
import { getItemType } from './itemTypes.js'

const PULSE_KEYFRAMES = [
  { transform: 'scale(1)' },
  { transform: 'scale(1.35)', offset: 0.45 },
  { transform: 'scale(1)' },
]
const PULSE_TIMING = { duration: 220, easing: 'ease-out' }

// How high the spawn arc peaks, as a fraction of the cell size.
const SPAWN_ARC = 0.5

// Travels from the generator (dx/dy away) to this cell, peaking above the
// midpoint so the item lobs into place instead of sliding.
function spawnKeyframes(dx, dy, lift) {
  return [
    { transform: `translate(${dx}px, ${dy}px) scale(0.7)`, opacity: 0.5 },
    {
      transform: `translate(${dx / 2}px, ${dy / 2 - lift}px) scale(1)`,
      opacity: 1,
      offset: 0.5,
    },
    { transform: 'translate(0px, 0px) scale(1)' },
  ]
}

function Item({ item, dragging, snapping, pulse, spawn, offset, spawnMs, onPointerDown }) {
  const { fontOverride } = getItemType(item.type)
  const element = useRef(null)
  // Each pulse carries a new id so repeated pulses on the same cell replay the
  // animation. Seeded with the mount value so mounting never pulses.
  const lastPulse = useRef(pulse)

  useEffect(() => {
    if (pulse === null || pulse === lastPulse.current) return
    lastPulse.current = pulse
    element.current?.animate(PULSE_KEYFRAMES, PULSE_TIMING)
  }, [pulse])

  // Layout effect so the item's first paint is already back at the generator
  // rather than a frame at its destination. `spawn` is held in state upstream,
  // so its identity only changes when a new spawn starts.
  useLayoutEffect(() => {
    if (!spawn) return
    const el = element.current
    if (!el) return
    el.animate(spawnKeyframes(spawn.dx, spawn.dy, el.offsetHeight * SPAWN_ARC), {
      duration: spawnMs,
      easing: 'ease-out',
    })
  }, [spawn, spawnMs])

  const className = ['item', dragging && 'dragging', snapping && 'snapping', spawn && 'spawning']
    .filter(Boolean)
    .join(' ')

  const style = { fontFamily: fontOverride }
  if (dragging) style.transform = `translate(${offset.x}px, ${offset.y}px)`

  return (
    <div ref={element} className={className} style={style} onPointerDown={onPointerDown}>
      {item.kind === 'generator' ? <Generator /> : <Number value={item.value} />}
    </div>
  )
}

export default Item
