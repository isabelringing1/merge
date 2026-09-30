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
export const DEFAULT_BOARD_STATE = [
  ['{h16}', 0, 0, 0, 'cG', '{c32}'],
  ['{{c32}}', '{t8}', 'hG', 0, '{t16}', '{{h8}}'],
  ['{{h64}}', '{{h64}}', '{t2}', 'tG', '{{t64}}', '{{h32}}'],
  ['{{c32}}', '{{t64}}', '{{h64}}', '{{t64}}', '{{c64}}', '{{c256}}'],
  ['{{t256}}', '{{h256}}', '{{c128}}', '{{h128}}', '{{t128}}', '{{c512}}'],
  ['{{t256}}', '{{h256}}', '{{c128}}', '{{h128}}', '{{t128}}', '{{c512}}'],
  ['{{t256}}', '{{h256}}', '{{c128}}', '{{h128}}', '{{t128}}', '{{c512}}'],
  ['{{t256}}', '{{h256}}', '{{c128}}', '{{h128}}', '{{t128}}', '{{c512}}'],
]

export const DEBUG_GRID = null
