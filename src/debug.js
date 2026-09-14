// Debug board override. When DEBUG_GRID is set it replaces the saved/default
// board. Set it to null for normal loading.
//
// 9 rows of 6 columns:
//   null            disabled cell
//   0               enabled + empty
//   '<type>G'       enabled + Generator of that item type, e.g. 'tG', 'cG'
//   '<type><int>'   enabled + Number of that item type, e.g. 't1', 'c12'
//   '{<type><int>}' enabled + locked Number, e.g. '{t4}', '{c12}'
//
// Item types come from itemTypes.js. The type prefix is required - a bare 1 or
// 'G' throws, since every item must have a type. Locked shorthand must be a
// string and can only contain a Number, not a Generator.
export const DEFAULT_BOARD_STATE = [
  [null, null, null, null, null, null],
  [null, null, null, null, null, null],
  [null, '{h64}', 'tG', 't1', '{t64}', null],
  ['{c32}', 't1', 't1', 't1', '{t16}', '{h8}'],
  [0, 0, 't2', 'hG', 0, 0],
  [0, 'cG', 'c1', 0, 0, 0],
  [0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0],
]

export const DEBUG_GRID = null
