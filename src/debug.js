// Debug board override. When DEBUG_GRID is set it replaces the saved/default
// board. Set it to null for normal loading.
//
// 8 rows of 6 columns:
//   null              hidden + empty
//   '{{<type><int>}}' hidden + Number, e.g. '{{t4}}', '{{c12}}'
//   0                 revealed + empty
//   '<type>G'         revealed + Generator of that item type, e.g. 'tG', 'cG'
//   '<type><int>'     revealed + unlocked Number, e.g. 't1', 'c12'
//   '{<type><int>}'   revealed + locked Number, e.g. '{t4}', '{c12}'
//
// Item types come from itemTypes.js. The type prefix is required - a bare 1 or
// 'G' throws, since every item must have a type. Hidden-item and locked
// shorthand must be strings and can only contain Numbers, not Generators.
const board1 = [
  ['{h2}', 0, 0, 0, 0, '{t2}'],
  ['{{h8}}', '{t8}', 'hG', 'tG', '{t8}', '{{h8}}'],
  ['{{h32}}', '{{t32}}', '{t16}', '{h32}', '{{t64}}', '{{h32}}'],
  ['{{t32}}', '{{h32}}', '{{h64}}', '{{t32}}', '{{h64}}', '{{t256}}'],
  ['{{t256}}', '{{h256}}', '{{t128}}', '{{h128}}', '{{t128}}', '{{h512}}'],
  ['{{t256}}', '{{h256}}', '{{t128}}', '{{h128}}', '{{t128}}', '{{h512}}'],
  ['{{t256}}', '{{h256}}', '{{t128}}', '{{h128}}', '{{t128}}', '{{h512}}'],
  ['{{t256}}', '{{h256}}', '{{t128}}', '{{h128}}', '{{t128}}', '{{h512}}'],
]

const cloneBoard = (board) => board.map((row) => [...row])

const board2 = board1.map((row) =>
  row.map((cell) => (typeof cell === 'string' ? cell.replaceAll('h', 'c') : cell)),
)

const board3 = cloneBoard(board1)
board3[0][0] = '{t2}'
board3[0][5] = '{h2}'
board3[1][2] = 'tG'
board3[1][3] = 'hG'

const board4 = cloneBoard(board1)
board4[0][0] = '{h4}'
board4[0][5] = '{t4}'
board4[1][1] = '{h8}'
board4[1][4] = '{t8}'

export const DEFAULT_BOARD_STATE = {
  1: board1,
  2: board2,
  3: board3,
  4: board4,
}

export const DEBUG_GRID = null
