import { hapticTrigger } from 'ios-haptics'

const SWITCH_SELECTOR = 'input[type="checkbox"][switch]'

// ios-haptics appends a transparent native switch to the target. Guarding the
// setup keeps React callback refs and Strict Mode from adding duplicate switches.
export function attachHaptic(element) {
  if (!element) return null

  let switchElement = element.querySelector(SWITCH_SELECTOR)
  if (!switchElement) {
    const position = element.style.position
    hapticTrigger(element)
    // ios-haptics sets an inline relative position; restore the app's existing
    // class-driven positioning after its overlay has been inserted.
    element.style.position = position
    switchElement = element.querySelector(SWITCH_SELECTOR)
  }
  return switchElement
}
