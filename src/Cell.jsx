import Item from './Item.jsx'
import LockedDitherCanvas from './LockedDitherCanvas.jsx'

function Cell({
  index,
  hidden,
  checkerDark,
  locked,
  item,
  dragging,
  dropTarget,
  pulse,
  spawn,
  spawnMs,
  swap,
  swapMs,
  gravity,
  gravityMs,
  onItemPointerDown,
  hiddenNeighborMask,
  hiddenNeighborCount,
  neighborCount,
}) {
  return (
    <div
      className={`cell ${hidden ? 'hidden' : 'revealed'}${checkerDark ? ' checker-dark' : ''}${locked ? ' locked' : ''}${dragging ? ' dragging' : ''}${dropTarget ? ` drop-target drop-${dropTarget}` : ''}${spawn ? ' spawning' : ''}${swap ? ' swapping' : ''}`}
      data-index={index}
    >
      {!hidden && item && (
        <Item
          item={item}
          dragging={dragging}
          pulse={pulse}
          spawn={spawn}
          spawnMs={spawnMs}
          swap={swap}
          swapMs={swapMs}
          gravity={gravity}
          gravityMs={gravityMs}
          onPointerDown={onItemPointerDown}
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
