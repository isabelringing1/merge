import Item from './Item.jsx'

function Cell({
  index,
  enabled,
  item,
  dragging,
  snapping,
  pulse,
  spawn,
  spawnMs,
  offset,
  onItemPointerDown,
}) {
  return (
    <div className={`cell ${enabled ? 'enabled' : 'disabled'}`} data-index={index}>
      {enabled && item && (
        <Item
          item={item}
          dragging={dragging}
          snapping={snapping}
          pulse={pulse}
          spawn={spawn}
          spawnMs={spawnMs}
          offset={offset}
          onPointerDown={onItemPointerDown}
        />
      )}
    </div>
  )
}

export default Cell
