const RADIUS = 7.6
const SIZE = 21

function makeBubble(tail) {
  const rows = []
  const directionX = tail.includes('right') ? 1 : -1
  const directionY = tail.includes('bottom') ? 1 : -1

  for (let y = 0; y < SIZE; y += 1) {
    let row = ''
    for (let x = 0; x < SIZE; x += 1) {
      const nx = x - (SIZE - 1) / 2
      const ny = y - (SIZE - 1) / 2
      const inCircle = nx * nx + ny * ny <= RADIUS * RADIUS
      const progress = (nx * directionX + ny * directionY) / Math.SQRT2
      const perpendicular =
        Math.abs(nx * directionY - ny * directionX) / Math.SQRT2
      const inTail =
        progress >= RADIUS - 2 &&
        progress <= RADIUS + 4 &&
        perpendicular <= Math.max(1.25, (RADIUS + 4 - progress) * 0.5)

      row += inCircle || inTail ? ((x + y) % 3 === 0 ? ':' : '.') : ' '
    }
    rows.push(row)
  }

  return rows.join('\n')
}

function AsciiBoardButton({ boardId, position, onClick }) {
  const tail = position
    .replace('top', 'TEMP')
    .replace('bottom', 'top')
    .replace('TEMP', 'bottom')
    .replace('left', 'TEMP')
    .replace('right', 'left')
    .replace('TEMP', 'right')

  return (
    <button
      className={`ascii-board-button board-${position}`}
      type="button"
      onClick={() => onClick(boardId)}
      aria-label={`Open board ${boardId}`}
    >
      <pre aria-hidden="true">{makeBubble(tail)}</pre>
      <span>{boardId}</span>
    </button>
  )
}

export default AsciiBoardButton
