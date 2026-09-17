import { useCallback, useEffect, useRef, useState } from 'react'

export const MAX_ENERGY = 100
export const ENERGY_RECHARGE_MS = 2 * 60 * 1000

const STORAGE_KEY = 'merge.energy.v1'

function freshEnergy(now) {
  return { value: MAX_ENERGY, updatedAt: now }
}

function restoreEnergy(now) {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (
      !Number.isInteger(saved?.value) ||
      saved.value < 0 ||
      saved.value > MAX_ENERGY ||
      !Number.isFinite(saved.updatedAt)
    ) {
      return freshEnergy(now)
    }
    return {
      value: saved.value,
      // If the device clock moved backwards, restart the partial recharge
      // instead of making the player wait for the old future timestamp.
      updatedAt: Math.min(saved.updatedAt, now),
    }
  } catch {
    return freshEnergy(now)
  }
}

function rechargeEnergy(current, now) {
  if (current.value >= MAX_ENERGY) return current

  const gained = Math.floor((now - current.updatedAt) / ENERGY_RECHARGE_MS)
  if (gained <= 0) return current

  return {
    value: Math.min(MAX_ENERGY, current.value + gained),
    updatedAt: current.updatedAt + gained * ENERGY_RECHARGE_MS,
  }
}

function saveEnergy(energy) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(energy))
  } catch {
    // Storage can be unavailable in private mode or when its quota is full.
  }
}

function createInitialState() {
  const now = Date.now()
  return { energy: rechargeEnergy(restoreEnergy(now), now), now }
}

export function useEnergy() {
  const [initial] = useState(createInitialState)
  const [energy, setEnergy] = useState(initial.energy)
  const [now, setNow] = useState(initial.now)
  const energyRef = useRef(energy)

  const commit = useCallback((next) => {
    energyRef.current = next
    setEnergy(next)
    saveEnergy(next)
  }, [])

  const sync = useCallback(() => {
    const currentTime = Date.now()
    const next = rechargeEnergy(energyRef.current, currentTime)
    setNow(currentTime)
    if (next !== energyRef.current) commit(next)
  }, [commit])

  useEffect(() => {
    saveEnergy(energyRef.current)
    const interval = window.setInterval(sync, 1000)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') sync()
    }
    window.addEventListener('focus', sync)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', sync)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [sync])

  const spendEnergy = useCallback(() => {
    const currentTime = Date.now()
    const current = rechargeEnergy(energyRef.current, currentTime)
    setNow(currentTime)

    if (current.value <= 0) {
      if (current !== energyRef.current) commit(current)
      return false
    }

    commit({
      value: current.value - 1,
      // Recharge starts when leaving max energy. Otherwise preserve progress
      // toward the next point when spending another point.
      updatedAt: current.value === MAX_ENERGY ? currentTime : current.updatedAt,
    })
    return true
  }, [commit])

  const secondsToNext =
    energy.value < MAX_ENERGY
      ? Math.max(0, Math.ceil((energy.updatedAt + ENERGY_RECHARGE_MS - now) / 1000))
      : null

  return { energy: energy.value, secondsToNext, spendEnergy }
}
