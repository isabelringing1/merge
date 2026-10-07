// Item type config. Every item on the board must reference one of these by id.
//
//   fontOverride  font-family applied to the item's value
//   fontWeight    optional font-weight applied to the item's value
//   textColor     color filling the item's characters
export const ITEM_TYPES = {
  t: {
    id: 't',
    fontOverride: "'Helvetica', sans-serif",
    textColor: '#4F7396',
  },
  c: {
    id: 'c',
    fontOverride: "'Snell Roundhand', cursive",
    textColor: '#625F99',
  },
  h: {
    id: 'h',
    fontOverride: "'Bungee', sans-serif",
    textColor: '#815F8C',
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
