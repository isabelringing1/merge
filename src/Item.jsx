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
// Add the scale on top of a gravity translation so merge feedback does not
// interrupt a piece that is falling at the same time.
const PULSE_TIMING = { duration: 220, easing: 'ease-out', composite: 'add' }

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

function gravityDropKeyframes(dx, dy, settleDx, settleDy, cellSize) {
  const anticipation = Math.min(cellSize * 0.06, 6)
  const nearGround = -Math.min(cellSize * 0.08, 8)
  const overshoot = Math.min(cellSize * 0.045, 5)

  return [
    {
      transform: `translate(${dx}px, ${dy}px) scale(1.08)`,
      filter: 'drop-shadow(0 0.12em 0.1em rgba(0, 0, 0, 0.2))',
      easing: 'cubic-bezier(0.2, 0.72, 0.25, 1)',
    },
    {
      transform: `translate(${settleDx}px, ${settleDy}px) scale(1)`,
      filter: 'drop-shadow(0 0.16em 0.12em rgba(0, 0, 0, 0.16))',
      offset: 0.28,
      easing: 'linear',
    },
    {
      transform: `translate(${settleDx}px, ${settleDy}px) scale(1)`,
      offset: 0.42,
      easing: 'ease-out',
    },
    {
      transform: `translate(${settleDx}px, ${settleDy - anticipation}px) scale(0.99, 1.01)`,
      offset: 0.48,
      easing: 'cubic-bezier(0.5, 0, 0.88, 0.35)',
    },
    {
      transform: `translate(0, ${nearGround}px) scale(0.98, 1.04)`,
      filter: 'drop-shadow(0 0.08em 0.07em rgba(0, 0, 0, 0.13))',
      offset: 0.78,
      easing: 'ease-out',
    },
    {
      transform: `translate(0, ${overshoot}px) scale(1.08, 0.9)`,
      filter: 'drop-shadow(0 0.025em 0.035em rgba(0, 0, 0, 0.1))',
      offset: 0.87,
      easing: 'ease-out',
    },
    { transform: 'translate(0, -2px) scale(0.98, 1.03)', offset: 0.95 },
    {
      transform: 'translate(0, 0) scale(1)',
      filter: 'drop-shadow(0 0 0 transparent)',
    },
  ]
}

function swapKeyframes(dx, dy, kind, settleDx, settleDy, cellSize) {
  if (kind === 'gravity-drop') {
    return gravityDropKeyframes(dx, dy, settleDx, settleDy, cellSize)
  }

  if (kind === 'drop') {
    return [
      {
        transform: `translate(${dx}px, ${dy}px) scale(1.08)`,
        filter: 'drop-shadow(0 0.12em 0.1em rgba(0, 0, 0, 0.2))',
        easing: 'cubic-bezier(0.2, 0.72, 0.25, 1)',
      },
      {
        transform: 'translate(0px, 0px) scale(0.98, 1.03)',
        filter: 'drop-shadow(0 0.06em 0.06em rgba(0, 0, 0, 0.14))',
        offset: 0.72,
        easing: 'ease-out',
      },
      { transform: 'translate(0px, 0px) scale(1.08, 0.9)', offset: 0.84 },
      { transform: 'translate(0px, 0px) scale(0.98, 1.03)', offset: 0.93 },
      {
        transform: 'translate(0px, 0px) scale(1)',
        filter: 'drop-shadow(0 0 0 transparent)',
      },
    ]
  }

  return [
    { transform: `translate(${dx}px, ${dy}px)` },
    { transform: 'translate(0px, 0px)' },
  ]
}

function gravityKeyframes(rows, cellSize) {
  const origin = -rows * cellSize
  const anticipation = Math.min(cellSize * 0.06, 6)
  const nearGround = -Math.min(cellSize * 0.08, 8)
  const overshoot = Math.min(cellSize * 0.045, 5)

  return [
    {
      transform: `translate3d(0, ${origin}px, 0) scale(1)`,
      filter: 'drop-shadow(0 0.16em 0.12em rgba(0, 0, 0, 0.16))',
      offset: 0,
      easing: 'linear',
    },
    {
      transform: `translate3d(0, ${origin}px, 0) scale(1)`,
      filter: 'drop-shadow(0 0.16em 0.12em rgba(0, 0, 0, 0.16))',
      offset: 0.18,
      easing: 'ease-out',
    },
    {
      transform: `translate3d(0, ${origin - anticipation}px, 0) scale(0.99, 1.01)`,
      offset: 0.25,
      easing: 'cubic-bezier(0.5, 0, 0.88, 0.35)',
    },
    {
      transform: `translate3d(0, ${nearGround}px, 0) scale(0.98, 1.04)`,
      filter: 'drop-shadow(0 0.08em 0.07em rgba(0, 0, 0, 0.13))',
      offset: 0.76,
      easing: 'ease-out',
    },
    {
      transform: `translate3d(0, ${overshoot}px, 0) scale(1.08, 0.9)`,
      filter: 'drop-shadow(0 0.025em 0.035em rgba(0, 0, 0, 0.1))',
      offset: 0.86,
      easing: 'ease-out',
    },
    {
      transform: 'translate3d(0, -2px, 0) scale(0.98, 1.03)',
      offset: 0.94,
      easing: 'ease-out',
    },
    {
      transform: 'translate3d(0, 0, 0) scale(1)',
      filter: 'drop-shadow(0 0 0 transparent)',
    },
  ]
}

function Item({
  item,
  dragging,
  pulse,
  spawn,
  swap,
  spawnMs,
  swapMs,
  gravity,
  gravityMs,
  onPointerDown,
}) {
  const { fontOverride, fontWeight, textColor } = getItemType(item.type)
  const element = useRef(null)
  const gravityAnimation = useRef(null)
  // Each pulse carries a new id so repeated pulses on the same cell replay the
  // animation. Seeded with the mount value so mounting never pulses.
  const lastPulse = useRef(pulse)

  const setElement = useCallback(
    (node) => {
      element.current = node
      if (node) attachHaptic(node)
    },
    [],
  )

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
    el.animate(
      swapKeyframes(
        swap.dx,
        swap.dy,
        swap.kind,
        swap.settleDx,
        swap.settleDy,
        el.offsetHeight,
      ),
      {
        duration: swapMs,
        easing:
          swap.kind === 'drop' || swap.kind === 'gravity-drop'
            ? 'linear'
            : 'ease-in-out',
      },
    )
  }, [swap, swapMs])

  useLayoutEffect(() => {
    if (!gravity) return
    const el = element.current
    if (!el) return
    gravityAnimation.current?.cancel()
    gravityAnimation.current = el.animate(
      gravityKeyframes(gravity.rows, el.offsetHeight),
      {
        duration: gravityMs + Math.min(gravity.rows - 1, 3) * 32,
        delay: Math.min(gravity.order, 4) * 28,
        easing: 'linear',
        fill: 'backwards',
      },
    )
  }, [gravity, gravityMs])

  const className = [
    'item',
    dragging && 'dragging',
    spawn && 'spawning',
    swap && 'swapping',
    gravity && 'falling',
  ]
    .filter(Boolean)
    .join(' ')

  const style = { fontFamily: fontOverride, '--item-text-color': textColor }
  if (fontWeight !== undefined) style.fontWeight = fontWeight

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
