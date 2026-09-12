// Item type config. Every item on the board must reference one of these by id.
//
//   fontOverride  font-family applied to the item's value
export const ITEM_TYPES = {
  t: {
    id: 't',
    fontOverride: "'Times New Roman', Times, serif",
  },
  c: {
    id: 'c',
    fontOverride: "'Comic Sans MS', 'Comic Sans', cursive",
  },
}

export function getItemType(id) {
  if (id === undefined || id === null || id === '') {
    throw new Error('Item is missing a type')
  }
  const itemType = ITEM_TYPES[id]
  if (!itemType) {
    throw new Error(`Unknown item type "${id}"`)
  }
  return itemType
}
