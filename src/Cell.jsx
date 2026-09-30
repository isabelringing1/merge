import Item from './Item.jsx'
import LockedDitherCanvas from './LockedDitherCanvas.jsx'

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
  swap,
  swapMs,
  offset,
  onItemPointerDown,
  generatorHapticsEnabled,
  hiddenNeighborMask,
  hiddenNeighborCount,
  neighborCount,
}) {
  return (
    <div
      className={`cell ${hidden ? 'hidden' : 'revealed'}${checkerDark ? ' checker-dark' : ''}${locked ? ' locked' : ''}${dragging ? ' dragging' : ''}${spawn ? ' spawning' : ''}${swap ? ' swapping' : ''}`}
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
          swap={swap}
          swapMs={swapMs}
          offset={offset}
          onPointerDown={onItemPointerDown}
          generatorHapticsEnabled={generatorHapticsEnabled}
        />
      )}
      {!hidden && locked && (
        <div className="locked-cover" role="img" aria-label="locked">
          <LockedDitherCanvas
            tileIndex={index}
            hiddenNeighborMask={hiddenNeighborMask}
            hiddenNeighborCount={hiddenNeighborCount}
            neighborCount={neighborCount}
          />
        </div>
      )}
    </div>
  )
}

export default Cell
