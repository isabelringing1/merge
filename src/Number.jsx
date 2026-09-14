function Number({ type, value }) {
  const digitClass = `dig${String(Math.abs(value)).length}`

  return <span className={`number ${type} ${digitClass}`}>{value}</span>
}

export default Number
