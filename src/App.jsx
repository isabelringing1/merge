import { useCallback, useEffect, useRef, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { dropOutcome, mergeItems, moveItem, nearestOpenCell, spawnItem } from './store.js'
import Cell from './Cell.jsx'
import DebugMenu from './DebugMenu.jsx'
import './App.css'

const TITLE = 'NUMBER SEQUEL'
const SNAP_MS = 150
const SPAWN_MS = 280
// Small buffer so an item becomes grabbable strictly after it has landed.
const SPAWN_SETTLE_MS = 60
// Pointer movement (px) allowed before a press counts as a drag instead of a tap.
const TAP_SLOP = 8

function cellIndexAt(x, y) {
  const el = document.elementFromPoint(x, y)?.closest('[data-index]')
  return el ? Number(el.dataset.index) : null
}

function cellCenter(index) {
  const rect = document.querySelector(`[data-index="${index}"]`)?.getBoundingClientRect()
  return rect && { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
}

function App() {
  const { cols, rows, cells } = useSelector((state) => state.grid)
  const dispatch = useDispatch()

  // Index of the item being dragged plus its offset from where the drag started.
  const [drag, setDrag] = useState(null)
  // Index of an item animating back after an invalid drop.
  const [snapping, setSnapping] = useState(null)
  // Which cell's item is pulsing, and an id that changes on every pulse so the
  // same cell can pulse repeatedly.
  const [pulse, setPulse] = useState(null)
  // Items currently flying out of a generator, keyed by destination cell. They
  // are inert until they land, and several can be in the air at once.
  const [spawns, setSpawns] = useState({})
  const snapTimeout = useRef(null)
  const spawnTimeouts = useRef(new Set())
  const pulseId = useRef(0)

  const pulseItem = useCallback((index) => {
    pulseId.current += 1
    setPulse({ index, id: pulseId.current })
  }, [])

  // Spawns a value-1 item into the nearest open cell and tweens it out of the
  // generator. Generators with nowhere to spawn still pulse.
  const spawnFrom = useCallback(
    (from, cells) => {
      pulseItem(from)

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
    [dispatch, pulseItem],
  )

  const handlePointerDown = useCallback(
    (index) => (event) => {
      if (
        cells[index].hidden ||
        !cells[index].item ||
        cells[index].locked ||
        event.button !== 0
      ) {
        return
      }
      event.preventDefault()
      setDrag({ index, startX: event.clientX, startY: event.clientY, x: 0, y: 0 })
    },
    [cells],
  )

  useEffect(() => {
    if (!drag) return

    const onMove = (event) => {
      setDrag((current) =>
        current && {
          ...current,
          x: event.clientX - current.startX,
          y: event.clientY - current.startY,
        },
      )
    }

    const onUp = (event) => {
      // A press that barely moved is a tap. Tapping a generator spawns from it;
      // tapping anything else does nothing.
      if (Math.hypot(drag.x, drag.y) <= TAP_SLOP) {
        if (cells[drag.index].item.kind === 'generator') spawnFrom(drag.index, cells)
        setDrag(null)
        return
      }

      const to = cellIndexAt(event.clientX, event.clientY)
      const outcome = to === null ? null : dropOutcome(cells, drag.index, to)

      if (outcome === 'move') {
        dispatch(moveItem({ from: drag.index, to }))
      } else if (outcome === 'merge') {
        dispatch(mergeItems({ from: drag.index, to }))
        pulseItem(to)
      } else {
        setSnapping(drag.index)
        clearTimeout(snapTimeout.current)
        snapTimeout.current = setTimeout(() => setSnapping(null), SNAP_MS)
      }
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
  }, [drag, cells, dispatch, pulseItem, spawnFrom])

  useEffect(
    () => () => {
      clearTimeout(snapTimeout.current)
      spawnTimeouts.current.forEach(clearTimeout)
      spawnTimeouts.current.clear()
    },
    [],
  )

  return (
    <>
      <div className="goal-container">
        <div className="marquee-track">
          <span className="marquee-text">{(TITLE + ' \u00A0 ').repeat(20)}</span>
          <span className="marquee-text">{(TITLE + ' \u00A0 ').repeat(20)}</span>
        </div>
      </div>

      <div
        className="board"
        style={{
          gridTemplateColumns: `repeat(${cols}, var(--cell))`,
          gridTemplateRows: `repeat(${rows}, var(--cell))`,
        }}
      >
        {cells.map((cell, index) => (
          <Cell
            key={index}
            index={index}
            hidden={cell.hidden}
            locked={cell.locked}
            item={cell.item}
            dragging={drag?.index === index}
            snapping={snapping === index}
            pulse={pulse?.index === index ? pulse.id : null}
            spawn={spawns[index] ?? null}
            spawnMs={SPAWN_MS}
            offset={drag?.index === index ? { x: drag.x, y: drag.y } : null}
            onItemPointerDown={handlePointerDown(index)}
          />
        ))}
      </div>
      <DebugMenu />
    </>
  )
}

export default App
