import { useCallback, useEffect, useRef, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import {
  dropOutcome,
  mergeItems,
  moveItem,
  nearestOpenCell,
  spawnItem,
  swapItems,
} from './store.js'
import Cell from './Cell.jsx'
import BoardDitherCanvas from './BoardDitherCanvas.jsx'
import DebugMenu from './DebugMenu.jsx'
import AsciiSphere from './AsciiSphere.jsx'
import { MAX_ENERGY, useEnergy } from './energy.js'
import './App.css'

const TITLE = 'NUMBER MINE'
const SPAWN_MS = 280
const SWAP_MS = 220
// Small buffer so an item becomes grabbable strictly after it has landed.
const SPAWN_SETTLE_MS = 60
// Pointer movement (px) allowed before a press counts as a drag instead of a tap.
const TAP_SLOP = 8
// A quick release projects the pointer forward, giving pieces a short, bounded
// "throw" only after the player has already dragged across a meaningful part
// of the board. Short, precise moves land exactly where the finger releases.
const THROW_LOOKAHEAD_MS = 120
const THROW_START_DISTANCE_CELLS = 2
const THROW_FULL_DISTANCE_CELLS = 5
const MAX_THROW_CELLS = 0.85
const DROP_RADIUS_CELLS = 1.15
const VELOCITY_WINDOW_MS = 90
const ENERGY_PULSE_KEYFRAMES = [
  { transform: 'scale(1)' },
  { transform: 'scale(1.18)', offset: 0.45 },
  { transform: 'scale(1)' },
]

function cellIndexAt(x, y) {
  const el = document.elementFromPoint(x, y)?.closest('[data-index]')
  return el ? Number(el.dataset.index) : null
}

function cellCenter(index) {
  const rect = document.querySelector(`[data-index="${index}"]`)?.getBoundingClientRect()
  return rect && { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
}

function dragVelocity(samples) {
  if (samples.length < 2) return { x: 0, y: 0 }
  const last = samples[samples.length - 1]
  const first =
    samples.find((sample) => last.time - sample.time <= VELOCITY_WINDOW_MS) ?? samples[0]
  const elapsed = last.time - first.time
  if (elapsed <= 0) return { x: 0, y: 0 }
  return {
    x: (last.x - first.x) / elapsed,
    y: (last.y - first.y) / elapsed,
  }
}

function intendedDrop(cells, from, x, y, dragDistance, velocity = { x: 0, y: 0 }) {
  const sourceRect = document
    .querySelector(`[data-index="${from}"]`)
    ?.getBoundingClientRect()
  if (!sourceRect) return null

  const cellSize = Math.max(sourceRect.width, sourceRect.height)
  const dragDistanceCells = dragDistance / cellSize
  const throwStrength = Math.max(
    0,
    Math.min(
      1,
      (dragDistanceCells - THROW_START_DISTANCE_CELLS) /
        (THROW_FULL_DISTANCE_CELLS - THROW_START_DISTANCE_CELLS),
    ),
  )
  const rawProjection = {
    x: velocity.x * THROW_LOOKAHEAD_MS * throwStrength,
    y: velocity.y * THROW_LOOKAHEAD_MS * throwStrength,
  }
  const projectionLength = Math.hypot(rawProjection.x, rawProjection.y)
  const maxProjection = cellSize * MAX_THROW_CELLS
  const projectionScale =
    projectionLength > maxProjection ? maxProjection / projectionLength : 1
  const projected = {
    x: x + rawProjection.x * projectionScale,
    y: y + rawProjection.y * projectionScale,
  }
  const directlyUnderPointer = cellIndexAt(x, y)
  if (directlyUnderPointer === from) {
    return { index: from, outcome: 'return' }
  }
  let best = null

  cells.forEach((_, index) => {
    const outcome = dropOutcome(cells, from, index)
    if (!outcome) return
    const center = cellCenter(index)
    if (!center) return

    const projectedDistance = Math.hypot(center.x - projected.x, center.y - projected.y)
    const releaseDistance = Math.hypot(center.x - x, center.y - y)
    if (
      projectedDistance > cellSize * DROP_RADIUS_CELLS &&
      index !== directlyUnderPointer
    ) {
      return
    }

    // Merges and empty slots are more intentional than swaps when a release is
    // ambiguous. An exact release on a swappable item still wins naturally.
    const outcomePenalty =
      outcome === 'swap' ? cellSize * 0.22 : outcome === 'merge' ? -cellSize * 0.08 : 0
    const score = projectedDistance + releaseDistance * 0.12 + outcomePenalty
    if (!best || score < best.score) best = { index, outcome, score }
  })

  return best
    ? { index: best.index, outcome: best.outcome }
    : { index: from, outcome: 'return' }
}

function hiddenNeighborsAt(cells, index, columns, rows) {
  const cellRow = Math.floor(index / columns)
  const cellColumn = index % columns
  let hiddenNeighborMask = 0
  let hiddenNeighborCount = 0
  let neighborCount = 0
  let bit = 0

  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
      if (rowOffset === 0 && columnOffset === 0) continue

      const row = cellRow + rowOffset
      const column = cellColumn + columnOffset
      if (row >= 0 && row < rows && column >= 0 && column < columns) {
        neighborCount += 1
        if (cells[row * columns + column].hidden) {
          hiddenNeighborMask |= 1 << bit
          hiddenNeighborCount += 1
        }
      }
      bit += 1
    }
  }

  return { hiddenNeighborMask, hiddenNeighborCount, neighborCount }
}

function formatTimer(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function EnergyCounter({ energy }) {
  const element = useRef(null)
  const previousEnergy = useRef(energy)

  useEffect(() => {
    if (energy === previousEnergy.current) return
    previousEnergy.current = energy
    element.current?.animate(ENERGY_PULSE_KEYFRAMES, { duration: 220, easing: 'ease-out' })
  }, [energy])

  return (
    <span ref={element} className="energy-count">
      <img src={`${import.meta.env.BASE_URL}shovel.png`} alt="" />
      <span>{energy}</span>
    </span>
  )
}

function GameBoard({ active, onBack }) {
  const { cols, rows, cells } = useSelector((state) => state.grid)
  const dispatch = useDispatch()
  const { energy, secondsToNext, spendEnergy } = useEnergy()

  // Index of the item being dragged plus its offset from where the drag started.
  const [drag, setDrag] = useState(null)
  const dragSession = useRef(null)
  const dragFrame = useRef(null)
  const cellsRef = useRef(cells)
  const [dropTarget, setDropTarget] = useState(null)
  // Which cell's item is pulsing, and an id that changes on every pulse so the
  // same cell can pulse repeatedly.
  const [pulse, setPulse] = useState(null)
  // Items currently flying out of a generator, keyed by destination cell. They
  // are inert until they land, and several can be in the air at once.
  const [spawns, setSpawns] = useState({})
  // Both items in a swap animate from their old visual positions into the
  // cells they occupy after the state update.
  const [swaps, setSwaps] = useState({})
  const spawnTimeouts = useRef(new Set())
  const swapTimeouts = useRef(new Set())
  const pulseId = useRef(0)

  useEffect(() => {
    cellsRef.current = cells
  }, [cells])

  const pulseItem = useCallback((index) => {
    pulseId.current += 1
    setPulse({ index, id: pulseId.current })
  }, [])

  // Spawns a value-1 item into the nearest open cell and tweens it out of the
  // generator. Generators with nowhere to spawn still pulse.
  const spawnFrom = useCallback(
    (from, cells) => {
      if (!spendEnergy()) return

      const to = nearestOpenCell(cells, from)
      if (to === null) return

      // Measured before the dispatch, while both cells are still on screen.
      const origin = cellCenter(from)
      const destination = cellCenter(to)
      dispatch(spawnItem({ from, to }))

      if (!origin || !destination) return
      const flight = { dx: origin.x - destination.x, dy: origin.y - destination.y }
      setSpawns((current) => ({ ...current, [to]: flight }))

      const timeout = setTimeout(() => {
        spawnTimeouts.current.delete(timeout)
        setSpawns((current) => {
          // Leave it alone if a newer spawn has already claimed this cell.
          if (current[to] !== flight) return current
          const next = { ...current }
          delete next[to]
          return next
        })
      }, SPAWN_MS + SPAWN_SETTLE_MS)
      spawnTimeouts.current.add(timeout)
    },
    [dispatch, spendEnergy],
  )

  const handlePointerDown = useCallback(
    (index) => (event) => {
      if (
        dragSession.current ||
        cells[index].hidden ||
        !cells[index].item ||
        cells[index].locked ||
        event.button !== 0
      ) {
        return
      }
      event.preventDefault()
      const pressedSelectedTile =
        dropTarget?.index === index && cells[index].item.kind !== 'generator'
      const session = {
        index,
        startX: event.clientX,
        startY: event.clientY,
        x: 0,
        y: 0,
        pointerX: event.clientX,
        pointerY: event.clientY,
        pointerId: event.pointerId,
        pressedSelectedTile,
        samples: [{ x: event.clientX, y: event.clientY, time: event.timeStamp }],
        element: event.currentTarget,
      }
      dragSession.current = session
      event.currentTarget.style.transform = 'translate3d(0, 0, 0) scale(1.06)'
      setDropTarget(pressedSelectedTile ? null : { index, outcome: 'return' })
      setDrag({ index })
    },
    [cells, dropTarget],
  )

  useEffect(() => {
    const onMove = (event) => {
      const session = dragSession.current
      if (!session || event.pointerId !== session.pointerId) return
      const events = event.getCoalescedEvents?.() ?? [event]
      for (const pointerEvent of events) {
        session.pointerX = pointerEvent.clientX
        session.pointerY = pointerEvent.clientY
        session.x = pointerEvent.clientX - session.startX
        session.y = pointerEvent.clientY - session.startY
        session.samples.push({
          x: pointerEvent.clientX,
          y: pointerEvent.clientY,
          time: pointerEvent.timeStamp,
        })
      }
      if (session.samples.length > 12) session.samples.splice(0, session.samples.length - 12)

      if (dragFrame.current !== null) return
      dragFrame.current = requestAnimationFrame(() => {
        dragFrame.current = null
        const current = dragSession.current
        if (!current) return
        current.element.style.transform =
          `translate3d(${current.x}px, ${current.y}px, 0) scale(1.06)`
        const target = intendedDrop(
          cellsRef.current,
          current.index,
          current.pointerX,
          current.pointerY,
          Math.hypot(current.x, current.y),
          dragVelocity(current.samples),
        )
        setDropTarget((previous) =>
          previous?.index === target?.index && previous?.outcome === target?.outcome
            ? previous
            : target,
        )
      })
    }

    const onUp = (event) => {
      const session = dragSession.current
      if (!session || event.pointerId !== session.pointerId) return
      if (dragFrame.current !== null) {
        cancelAnimationFrame(dragFrame.current)
        dragFrame.current = null
      }
      session.pointerX = event.clientX
      session.pointerY = event.clientY
      session.x = event.clientX - session.startX
      session.y = event.clientY - session.startY
      session.samples.push({ x: event.clientX, y: event.clientY, time: event.timeStamp })
      const currentCells = cellsRef.current

      // A press that barely moved is a tap. Tapping a generator spawns from it;
      // every other item gives the same pulse feedback.
      if (Math.hypot(session.x, session.y) <= TAP_SLOP) {
        session.element.style.transform = ''
        pulseItem(session.index)
        if (currentCells[session.index].item.kind === 'generator') {
          spawnFrom(session.index, currentCells)
        }
        dragSession.current = null
        setDropTarget(
          session.pressedSelectedTile
            ? null
            : { index: session.index, outcome: 'return' },
        )
        setDrag(null)
        return
      }

      const target =
        event.type === 'pointercancel'
          ? null
          : intendedDrop(
              currentCells,
              session.index,
              event.clientX,
              event.clientY,
              Math.hypot(session.x, session.y),
              dragVelocity(session.samples),
            )
      const to = target?.index ?? null
      const outcome = target?.outcome ?? null
      const source = cellCenter(session.index)
      const destination = to === null ? null : cellCenter(to)

      if (outcome === 'move') {
        if (source && destination) {
          const flight = {
            dx: source.x + session.x - destination.x,
            dy: source.y + session.y - destination.y,
            kind: 'drop',
          }
          setSwaps((current) => ({ ...current, [to]: flight }))
          const timeout = setTimeout(() => {
            swapTimeouts.current.delete(timeout)
            setSwaps((current) => {
              if (current[to] !== flight) return current
              const next = { ...current }
              delete next[to]
              return next
            })
          }, SWAP_MS)
          swapTimeouts.current.add(timeout)
        }
        dispatch(moveItem({ from: session.index, to }))
      } else if (outcome === 'swap') {
        if (source && destination) {
          const draggedFlight = {
            dx: source.x + session.x - destination.x,
            dy: source.y + session.y - destination.y,
            kind: 'drop',
          }
          const displacedFlight = {
            dx: destination.x - source.x,
            dy: destination.y - source.y,
            kind: 'tween',
          }
          setSwaps((current) => ({
            ...current,
            [to]: draggedFlight,
            [session.index]: displacedFlight,
          }))

          const timeout = setTimeout(() => {
            swapTimeouts.current.delete(timeout)
            setSwaps((current) => {
              if (
                current[to] !== draggedFlight ||
                current[session.index] !== displacedFlight
              ) {
                return current
              }
              const next = { ...current }
              delete next[to]
              delete next[session.index]
              return next
            })
          }, SWAP_MS)
          swapTimeouts.current.add(timeout)
        }
        dispatch(swapItems({ from: session.index, to }))
      } else if (outcome === 'merge') {
        dispatch(mergeItems({ from: session.index, to }))
        pulseItem(to)
      } else {
        session.element.animate(
          [
            {
              transform: `translate3d(${session.x}px, ${session.y}px, 0) scale(1.06)`,
            },
            { transform: 'translate3d(0, 0, 0) scale(1)' },
          ],
          { duration: 180, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
        )
      }
      session.element.style.transform = ''
      dragSession.current = null
      setDropTarget({
        index: to ?? session.index,
        outcome: outcome ?? 'return',
      })
      setDrag(null)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [dispatch, pulseItem, spawnFrom])

  useEffect(
    () => () => {
      if (dragFrame.current !== null) cancelAnimationFrame(dragFrame.current)
      spawnTimeouts.current.forEach(clearTimeout)
      spawnTimeouts.current.clear()
      swapTimeouts.current.forEach(clearTimeout)
      swapTimeouts.current.clear()
    },
    [],
  )

  return (
    <section
      className={`screen game-board-screen${active ? '' : ' offscreen'}`}
      aria-hidden={!active}
      inert={!active}
    >
      <button className="back-button" type="button" onClick={onBack} aria-label="Back to world">
        <img src={`${import.meta.env.BASE_URL}sphere.png`} alt="" />
      </button>

      <div
        className="board"
        style={{
          gridTemplateColumns: `repeat(${cols}, var(--cell))`,
          gridTemplateRows: `repeat(${rows}, var(--cell))`,
        }}
      >
        <BoardDitherCanvas columns={cols} rows={rows} />
        {cells.map((cell, index) => {
          const hiddenNeighbors = hiddenNeighborsAt(cells, index, cols, rows)
          return (
            <Cell
              key={index}
              index={index}
              hidden={cell.hidden}
              checkerDark={(Math.floor(index / cols) + (index % cols)) % 2 === 1}
              locked={cell.locked}
              item={cell.item}
              dragging={drag?.index === index}
              dropTarget={dropTarget?.index === index ? dropTarget.outcome : null}
              pulse={pulse?.index === index ? pulse.id : null}
              spawn={spawns[index] ?? null}
              spawnMs={SPAWN_MS}
              swap={swaps[index] ?? null}
              swapMs={SWAP_MS}
              onItemPointerDown={handlePointerDown(index)}
              {...hiddenNeighbors}
            />
          )
        })}
        <div className="energy-status" aria-label={`${energy} of ${MAX_ENERGY} energy`}>
          {secondsToNext !== null && (
            <span className="energy-timer">{formatTimer(secondsToNext)}</span>
          )}
          <EnergyCounter energy={energy} />
        </div>
      </div>
      <DebugMenu />
    </section>
  )
}

function World({ onOpenBoard }) {
  return (
    <main className="screen world-screen">
      <AsciiSphere onClick={onOpenBoard} />
    </main>
  )
}

function App() {
  const [screen, setScreen] = useState('gameBoard')

  return (
    <div className="app">
      <World onOpenBoard={() => setScreen('gameBoard')} />
      <GameBoard active={screen === 'gameBoard'} onBack={() => setScreen('world')} />
      <div className="goal-container">
        <div className="marquee-track">
          <span className="marquee-text">{(TITLE + ' \u00A0 ').repeat(20)}</span>
          <span className="marquee-text">{(TITLE + ' \u00A0 ').repeat(20)}</span>
        </div>
      </div>
    </div>
  )
}

export default App
