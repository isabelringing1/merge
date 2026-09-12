import { useCallback, useEffect, useRef, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { moveItem } from './store.js'
import Cell from './Cell.jsx'
import './App.css'

const TITLE = 'NUMBER SEQUEL'

function cellIndexAt(x, y) {
  const el = document.elementFromPoint(x, y)?.closest('[data-index]')
  return el ? Number(el.dataset.index) : null
}

function App() {
  const { cols, rows, cells } = useSelector((state) => state.grid)
  const dispatch = useDispatch()

  // Index of the item being dragged plus its offset from where the drag started.
  const [drag, setDrag] = useState(null)
  // Index of an item animating back after an invalid drop.
  const [snapping, setSnapping] = useState(null)
  const snapTimeout = useRef(null)

  const handlePointerDown = useCallback(
    (index) => (event) => {
      if (!cells[index].item || event.button !== 0) return
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
      const to = cellIndexAt(event.clientX, event.clientY)
      const valid = to !== null && to !== drag.index && cells[to].enabled && !cells[to].item

      if (valid) {
        dispatch(moveItem({ from: drag.index, to }))
      } else {
        setSnapping(drag.index)
        clearTimeout(snapTimeout.current)
        snapTimeout.current = setTimeout(() => setSnapping(null), 150)
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
  }, [drag, cells, dispatch])

  useEffect(() => () => clearTimeout(snapTimeout.current), [])

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
            enabled={cell.enabled}
            item={cell.item}
            dragging={drag?.index === index}
            snapping={snapping === index}
            offset={drag?.index === index ? { x: drag.x, y: drag.y } : null}
            onItemPointerDown={handlePointerDown(index)}
          />
        ))}
      </div>
    </>
  )
}

export default App
