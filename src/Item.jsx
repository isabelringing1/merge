import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import Generator from './Generator.jsx'
import Number from './Number.jsx'
import { attachHaptic } from './haptics.js'
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

function swapKeyframes(dx, dy, kind) {
  if (kind === 'drop') {
    return [
      { transform: `translate(${dx}px, ${dy}px) scale(1.08)` },
      { transform: 'translate(0px, 0px) scale(0.96)', offset: 0.78 },
      { transform: 'translate(0px, 0px) scale(1)' },
    ]
  }

  return [
    { transform: `translate(${dx}px, ${dy}px)` },
    { transform: 'translate(0px, 0px)' },
  ]
}

function Item({
  item,
  dragging,
  snapping,
  pulse,
  spawn,
  swap,
  offset,
  spawnMs,
  swapMs,
  onPointerDown,
  generatorHapticsEnabled,
}) {
  const { fontOverride, fontWeight, textColor } = getItemType(item.type)
  const element = useRef(null)
  const hapticSwitch = useRef(null)
  // Each pulse carries a new id so repeated pulses on the same cell replay the
  // animation. Seeded with the mount value so mounting never pulses.
  const lastPulse = useRef(pulse)

  const setElement = useCallback(
    (node) => {
      element.current = node
      if (item.kind === 'generator') hapticSwitch.current = attachHaptic(node)
    },
    [item.kind],
  )

  useLayoutEffect(() => {
    if (!hapticSwitch.current) return
    hapticSwitch.current.style.pointerEvents = generatorHapticsEnabled ? '' : 'none'
  }, [generatorHapticsEnabled])

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

  useLayoutEffect(() => {
    if (!swap) return
    const el = element.current
    if (!el) return
    el.animate(swapKeyframes(swap.dx, swap.dy, swap.kind), {
      duration: swapMs,
      easing: swap.kind === 'drop' ? 'cubic-bezier(0.2, 0.8, 0.2, 1)' : 'ease-in-out',
    })
  }, [swap, swapMs])

  const className = [
    'item',
    dragging && 'dragging',
    snapping && 'snapping',
    spawn && 'spawning',
    swap && 'swapping',
  ]
    .filter(Boolean)
    .join(' ')

  const style = { fontFamily: fontOverride, '--item-text-color': textColor }
  if (fontWeight !== undefined) style.fontWeight = fontWeight
  if (dragging) style.transform = `translate(${offset.x}px, ${offset.y}px)`

  return (
    <div ref={setElement} className={className} style={style} onPointerDown={onPointerDown}>
      {item.kind === 'generator' ? (
        <Generator />
      ) : (
        <Number type={item.type} value={item.value} />
      )}
    </div>
  )
}

export default Item
