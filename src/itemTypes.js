// Item type config. Every item on the board must reference one of these by id.
//
//   fontOverride  font-family applied to the item's value
//   fontWeight    optional font-weight applied to the item's value
//   outlineColor  color outlining the item's characters
export const ITEM_TYPES = {
  t: {
    id: 't',
    fontOverride: "'Helvetica', sans-serif",
    fontWeight: '200',
    outlineColor: '#bdffbf',
  },
  c: {
    id: 'c',
    fontOverride: "'Snell Roundhand', cursive",
    outlineColor: '#ffbdcc',
  },
  h: {
    id: 'h',
    fontOverride: "'Bungee', sans-serif",
    outlineColor: '#d7d6ff',
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
