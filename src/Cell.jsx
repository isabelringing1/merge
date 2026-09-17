import Item from './Item.jsx'

function Cell({
  index,
  hidden,
  checkerDark,
  locked,
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
    <div
      className={`cell ${hidden ? 'hidden' : 'revealed'}${checkerDark ? ' checker-dark' : ''}${locked ? ' locked' : ''}`}
      data-index={index}
    >
      {!hidden && item && (
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
      {!hidden && locked && (
        <div className="locked-cover">
          <img src={`${import.meta.env.BASE_URL}cover.png`} alt="locked" />
        </div>
      )}
    </div>
  )
}

export default Cell
