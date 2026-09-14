import Item from './Item.jsx'
import DitherShader from './DitherShader.jsx'

function Cell({
  index,
  hidden,
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
      className={`cell ${hidden ? 'hidden' : 'revealed'}${locked ? ' locked' : ''}`}
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
          <DitherShader
            src={`${import.meta.env.BASE_URL}cover.png`}
            gridSize={2}
            ditherMode="bayer"
          />
        </div>
      )}
    </div>
  )
}

export default Cell
