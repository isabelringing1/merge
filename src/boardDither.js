const BAYER_8X8 = [
  [0, 32, 8, 40, 2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44, 4, 36, 14, 46, 6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
]

function randomAt(x, y, seed) {
  const value = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453
  return value - Math.floor(value)
}

function smoothstep(value) {
  return value * value * (3 - 2 * value)
}

function valueNoise(x, y, seed) {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const tx = smoothstep(x - x0)
  const ty = smoothstep(y - y0)
  const top =
    randomAt(x0, y0, seed) * (1 - tx) + randomAt(x0 + 1, y0, seed) * tx
  const bottom =
    randomAt(x0, y0 + 1, seed) * (1 - tx) +
    randomAt(x0 + 1, y0 + 1, seed) * tx
  return top * (1 - ty) + bottom * ty
}

function cellTone(column, row, columns, rows, seed) {
  const safeColumn = Math.max(0, Math.min(columns - 1, column))
  const safeRow = Math.max(0, Math.min(rows - 1, row))
  const tone = randomAt(safeColumn, safeRow, seed + 101)
  return 0.12 + (Math.round(tone * 5) / 5) * 0.8
}

function cellDensity(x, y, width, height, columns, rows, seed) {
  const cellWidth = width / columns
  const cellHeight = height / rows
  const cellX = x / cellWidth - 0.5
  const cellY = y / cellHeight - 0.5
  const column = Math.floor(cellX)
  const row = Math.floor(cellY)
  const tx = smoothstep(cellX - column)
  const ty = smoothstep(cellY - row)
  const top =
    cellTone(column, row, columns, rows, seed) * (1 - tx) +
    cellTone(column + 1, row, columns, rows, seed) * tx
  const bottom =
    cellTone(column, row + 1, columns, rows, seed) * (1 - tx) +
    cellTone(column + 1, row + 1, columns, rows, seed) * tx
  return top * (1 - ty) + bottom * ty
}

function patchDensity(x, y, width, height, columns, rows, seed) {
  const squareField = cellDensity(x, y, width, height, columns, rows, seed)
  const medium = valueNoise(x / 58, y / 58, seed + 19)
  const detail = valueNoise(x / 26, y / 26, seed + 47)
  const organicField = medium * 0.68 + detail * 0.32
  const field = squareField * 0.76 + organicField * 0.24

  return Math.max(0.06, Math.min(0.94, field))
}

export function drawBoardDither(
  context,
  width,
  height,
  {
    seed = 208, //good seeds - 208, 370661
    pitch = 5,
    markSize = 5,
    foreground = '#444444',
    background = '#EFEFEF',
    boardColumns = 6,
    boardRows = 8,
  } = {},
) {
  context.clearRect(0, 0, width, height)
  context.fillStyle = background
  context.fillRect(0, 0, width, height)
  context.fillStyle = foreground

  const inset = (pitch - markSize) / 2
  const patternColumns = Math.ceil(width / pitch)
  const patternRows = Math.ceil(height / pitch)

  for (let row = 0; row < patternRows; row += 1) {
    for (let column = 0; column < patternColumns; column += 1) {
      const x = column * pitch
      const y = row * pitch
      const density = patchDensity(
        x,
        y,
        width,
        height,
        boardColumns,
        boardRows,
        seed,
      )
      const threshold = (BAYER_8X8[row % 8][column % 8] + 0.5) / 64

      if (density > threshold) {
        context.fillRect(x + inset, y + inset, markSize, markSize)
      }
    }
  }
}
