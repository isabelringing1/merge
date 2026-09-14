function DebugMenu() {
  const reset = () => {
    localStorage.clear()
    window.location.reload()
  }

  return (
    <div className="debug-menu">
      <button type="button" onClick={reset}>
        reset
      </button>
    </div>
  )
}

export default DebugMenu
