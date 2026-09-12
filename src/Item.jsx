import Generator from './Generator.jsx'
import Number from './Number.jsx'
import { getItemType } from './itemTypes.js'

function Item({ item, dragging, snapping, offset, onPointerDown }) {
  const { fontOverride } = getItemType(item.type)

  const className = ['item', dragging && 'dragging', snapping && 'snapping']
    .filter(Boolean)
    .join(' ')

  const style = { fontFamily: fontOverride }
  if (dragging) style.transform = `translate(${offset.x}px, ${offset.y}px)`

  return (
    <div className={className} style={style} onPointerDown={onPointerDown}>
      {item.kind === 'generator' ? <Generator /> : <Number value={item.value} />}
    </div>
  )
}

export default Item
