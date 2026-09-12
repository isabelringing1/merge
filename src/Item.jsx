import Generator from './Generator.jsx'
import Number from './Number.jsx'

function Item({ item, dragging, snapping, offset, onPointerDown }) {
  const className = ['item', dragging && 'dragging', snapping && 'snapping']
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={className}
      style={dragging ? { transform: `translate(${offset.x}px, ${offset.y}px)` } : undefined}
      onPointerDown={onPointerDown}
    >
      {item.type === 'generator' ? <Generator /> : <Number value={item.value} />}
    </div>
  )
}

export default Item
