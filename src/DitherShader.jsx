import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const BAYER_MATRIX_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
]

const BAYER_MATRIX_8X8 = [
  [0, 32, 8, 40, 2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44, 4, 36, 14, 46, 6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
]

const DEFAULT_PALETTE = ['#000000', '#ffffff']
const HALFTONE_COS = Math.cos(Math.PI / 4)
const HALFTONE_SIN = Math.sin(Math.PI / 4)
const QUANT_STEP = 255 / 4

function parseColor(color) {
  if (color.startsWith('#')) {
    const hex = color.slice(1)
    if (hex.length === 3) {
      return [
        parseInt(hex[0] + hex[0], 16),
        parseInt(hex[1] + hex[1], 16),
        parseInt(hex[2] + hex[2], 16),
      ]
    }
    return [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
    ]
  }

  const match = color.match(/rgb\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)\)/i)
  return match
    ? [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])]
    : [0, 0, 0]
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

export function DitherShader({
  src,
  gridSize = 4,
  ditherMode = 'bayer',
  colorMode = 'original',
  invert = false,
  pixelRatio = 1,
  primaryColor = '#000000',
  secondaryColor = '#ffffff',
  customPalette = DEFAULT_PALETTE,
  brightness = 0,
  contrast = 1,
  backgroundColor = 'transparent',
  objectFit = 'cover',
  threshold = 0.5,
  animated = false,
  animationSpeed = 0.02,
  outlineColor,
  outlineWidth = 3,
  className,
  style,
  children,
  opacity = 1,
}) {
  const containerRef = useRef(null)
  const canvasRef = useRef(null)
  const animationRef = useRef(null)
  const timeRef = useRef(0)
  const imageRef = useRef(null)
  const imageDataRef = useRef(null)
  const offscreenRef = useRef(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

  const parsedPrimaryColor = useMemo(() => parseColor(primaryColor), [primaryColor])
  const parsedSecondaryColor = useMemo(() => parseColor(secondaryColor), [secondaryColor])
  const paletteKey = customPalette.join('|')
  // The joined key keeps an inline palette from invalidating the render callback.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const parsedCustomPalette = useMemo(() => customPalette.map(parseColor), [paletteKey])

  const outlineFilter = useMemo(() => {
    if (!outlineColor) return undefined
    return Array.from({ length: 8 }, (_, index) => {
      const angle = (index * Math.PI) / 4
      const x = Math.round(Math.cos(angle) * outlineWidth)
      const y = Math.round(Math.sin(angle) * outlineWidth)
      return `drop-shadow(${x}px ${y}px 0 ${outlineColor})`
    }).join(' ')
  }, [outlineColor, outlineWidth])

  const applyDithering = useCallback(
    (context, displayWidth, displayHeight, time = 0) => {
      if (!imageDataRef.current) return

      const source = imageDataRef.current
      const sourceData = source.data
      const output = context.createImageData(displayWidth, displayHeight)
      const outputData = output.data
      const pixelSize = Math.max(1, Math.floor(gridSize * pixelRatio))
      const matrixSize = gridSize <= 4 ? 4 : 8
      const matrix = gridSize <= 4 ? BAYER_MATRIX_4X4 : BAYER_MATRIX_8X8
      const matrixScale = matrixSize * matrixSize
      const widthRatio = source.width / displayWidth
      const heightRatio = source.height / displayHeight
      const background =
        backgroundColor === 'transparent' ? null : parseColor(backgroundColor)

      if (background) {
        for (let index = 0; index < outputData.length; index += 4) {
          outputData[index] = background[0]
          outputData[index + 1] = background[1]
          outputData[index + 2] = background[2]
          outputData[index + 3] = 255
        }
      }

      for (let y = 0; y < displayHeight; y += pixelSize) {
        const sourceY = Math.floor(y * heightRatio)
        for (let x = 0; x < displayWidth; x += pixelSize) {
          const sourceX = Math.floor(x * widthRatio)
          const sourceIndex = (sourceY * source.width + sourceX) * 4
          if (sourceData[sourceIndex + 3] < 10) continue

          let red = clamp(
            (sourceData[sourceIndex] - 128) * contrast + 128 + brightness * 255,
            0,
            255,
          )
          let green = clamp(
            (sourceData[sourceIndex + 1] - 128) * contrast + 128 + brightness * 255,
            0,
            255,
          )
          let blue = clamp(
            (sourceData[sourceIndex + 2] - 128) * contrast + 128 + brightness * 255,
            0,
            255,
          )
          const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255

          let ditherThreshold
          if (ditherMode === 'halftone') {
            const rotatedX = x * HALFTONE_COS + y * HALFTONE_SIN
            const rotatedY = -x * HALFTONE_SIN + y * HALFTONE_COS
            ditherThreshold =
              (Math.sin(rotatedX / (gridSize * 2)) +
                Math.sin(rotatedY / (gridSize * 2)) +
                2) /
              4
          } else if (ditherMode === 'noise') {
            const noise =
              Math.sin(x * 12.9898 + y * 78.233 + time * 100) * 43758.5453
            ditherThreshold = noise - Math.floor(noise)
          } else if (ditherMode === 'crosshatch') {
            const period = gridSize * 2
            const lineOne = (x + y) % period < gridSize ? 1 : 0
            const lineTwo = (x - y + gridSize * 4) % period < gridSize ? 1 : 0
            ditherThreshold = (lineOne + lineTwo) / 2
          } else {
            ditherThreshold =
              matrix[Math.floor(y / gridSize) % matrixSize][
                Math.floor(x / gridSize) % matrixSize
              ] / matrixScale
          }

          ditherThreshold =
            ditherThreshold * (1 - threshold) + threshold * 0.5

          if (colorMode === 'grayscale') {
            red = green = blue = luminance < ditherThreshold ? 0 : 255
          } else if (colorMode === 'duotone') {
            ;[red, green, blue] =
              luminance < ditherThreshold
                ? parsedPrimaryColor
                : parsedSecondaryColor
          } else if (colorMode === 'custom') {
            if (parsedCustomPalette.length === 2) {
              ;[red, green, blue] =
                luminance < ditherThreshold
                  ? parsedCustomPalette[0]
                  : parsedCustomPalette[1]
            } else {
              const adjusted = clamp(
                luminance + (ditherThreshold - 0.5) * 0.5,
                0,
                1,
              )
              const paletteIndex = Math.floor(
                adjusted * (parsedCustomPalette.length - 1),
              )
              ;[red, green, blue] = parsedCustomPalette[paletteIndex]
            }
          } else {
            const amount = (ditherThreshold - 0.5) * 64
            red = Math.round(clamp(red + amount, 0, 255) / QUANT_STEP) * QUANT_STEP
            green =
              Math.round(clamp(green + amount, 0, 255) / QUANT_STEP) * QUANT_STEP
            blue =
              Math.round(clamp(blue + amount, 0, 255) / QUANT_STEP) * QUANT_STEP
          }

          if (invert) {
            red = 255 - red
            green = 255 - green
            blue = 255 - blue
          }

          const blockWidth = Math.min(pixelSize, displayWidth - x)
          const blockHeight = Math.min(pixelSize, displayHeight - y)
          for (let blockY = 0; blockY < blockHeight; blockY += 1) {
            let outputIndex = ((y + blockY) * displayWidth + x) * 4
            for (let blockX = 0; blockX < blockWidth; blockX += 1) {
              outputData[outputIndex] = red
              outputData[outputIndex + 1] = green
              outputData[outputIndex + 2] = blue
              outputData[outputIndex + 3] = 255
              outputIndex += 4
            }
          }
        }
      }

      context.putImageData(output, 0, 0)
    },
    [
      backgroundColor,
      brightness,
      colorMode,
      contrast,
      ditherMode,
      gridSize,
      invert,
      parsedCustomPalette,
      parsedPrimaryColor,
      parsedSecondaryColor,
      pixelRatio,
      threshold,
    ],
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container) return undefined

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      if (width > 0 && height > 0) setDimensions({ width, height })
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || dimensions.width === 0 || dimensions.height === 0) return undefined

    let cancelled = false

    const processImage = (image) => {
      if (cancelled) return

      const width = Math.floor(dimensions.width)
      const height = Math.floor(dimensions.height)
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext('2d')
      if (!context) return

      offscreenRef.current ||= document.createElement('canvas')
      const offscreen = offscreenRef.current
      offscreen.width = width
      offscreen.height = height
      const offscreenContext = offscreen.getContext('2d')
      if (!offscreenContext) return

      let drawWidth = image.naturalWidth
      let drawHeight = image.naturalHeight
      if (objectFit === 'cover' || objectFit === 'contain') {
        const scale =
          objectFit === 'cover'
            ? Math.max(width / drawWidth, height / drawHeight)
            : Math.min(width / drawWidth, height / drawHeight)
        drawWidth *= scale
        drawHeight *= scale
      } else if (objectFit === 'fill') {
        drawWidth = width
        drawHeight = height
      }

      const drawX = (width - drawWidth) / 2
      const drawY = (height - drawHeight) / 2
      offscreenContext.clearRect(0, 0, width, height)
      offscreenContext.drawImage(image, drawX, drawY, drawWidth, drawHeight)

      try {
        imageDataRef.current = offscreenContext.getImageData(0, 0, width, height)
      } catch {
        console.error('Could not get image data. CORS issue?')
        return
      }

      applyDithering(context, width, height)
      if (animated) {
        const animate = () => {
          if (cancelled) return
          timeRef.current += animationSpeed
          applyDithering(context, width, height, timeRef.current)
          animationRef.current = requestAnimationFrame(animate)
        }
        animationRef.current = requestAnimationFrame(animate)
      }
    }

    if (imageRef.current?.complete && imageRef.current.src === src) {
      processImage(imageRef.current)
    } else {
      const image = new Image()
      image.crossOrigin = 'anonymous'
      image.src = src
      image.onload = () => {
        imageRef.current = image
        processImage(image)
      }
      image.onerror = () => console.error('Failed to load image for DitherShader:', src)
    }

    return () => {
      cancelled = true
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [
    animated,
    animationSpeed,
    applyDithering,
    dimensions,
    objectFit,
    src,
  ])

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ position: 'relative', width: '100%', height: '100%', ...style }}
    >
      {children}
      <canvas
        ref={canvasRef}
        aria-label="Dithered image"
        role="img"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          imageRendering: 'pixelated',
          filter: outlineFilter,
          opacity,
        }}
      />
    </div>
  )
}

export default DitherShader
