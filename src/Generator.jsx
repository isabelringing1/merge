function Generator() {
  return (
    <span className="generator">
      G
      <img
        className="generator-shovel"
        src={`${import.meta.env.BASE_URL}shovel.png`}
        alt=""
      />
    </span>
  )
}

export default Generator
