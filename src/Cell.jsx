import Item from './Item.jsx'

function Cell({ index, enabled, item, dragging, snapping, offset, onItemPointerDown }) {
  return (
    <div className={`cell ${enabled ? 'enabled' : 'disabled'}`} data-index={index}>
      {enabled && item && (
        <Item
          item={item}
          dragging={dragging}
          snapping={snapping}
          offset={offset}
          onPointerDown={onItemPointerDown}
        />
      )}
    </div>
  )
}

export default Cell
