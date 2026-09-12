// Debug board override. When DEBUG_GRID is set it replaces whatever board was
// saved to local storage. Set it to null to load the saved board instead.
//
// 9 rows of 6 columns:
//   null          disabled cell
//   0             enabled + empty
//   'G'           enabled + Generator
//   any number    enabled + Number of that value
export const DEBUG_GRID = [
  [null, null, null, null, null, null],
  [null, null, null, null, null, null],
  [null, null, 'G', 1, null, null],
  [null, 1, 1, 1, null, null],
  [0, 0, 2, 0, 0, 0],
  [0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0],
]
