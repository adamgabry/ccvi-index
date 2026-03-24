import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react'
import type maplibregl from 'maplibre-gl'

type BrushRectangle = {
  left: number
  top: number
  width: number
  height: number
}

type UseBrushZoomOptions = {
  mapRef: RefObject<maplibregl.Map | null>
  enabled: boolean
  minBrushSize?: number
  onComplete?: () => void
}

type DragPoint = {
  x: number
  y: number
}

function toBrushRectangle(start: DragPoint, end: DragPoint): BrushRectangle {
  const left = Math.min(start.x, end.x)
  const top = Math.min(start.y, end.y)
  const width = Math.abs(end.x - start.x)
  const height = Math.abs(end.y - start.y)

  return { left, top, width, height }
}

export function useBrushZoom({
  mapRef,
  enabled,
  minBrushSize = 12,
  onComplete,
}: UseBrushZoomOptions) {
  const [brushRectangle, setBrushRectangle] = useState<BrushRectangle | null>(null)
  const dragStartRef = useRef<DragPoint | null>(null)

  useEffect(() => {
    if (!enabled) {
      dragStartRef.current = null
      mapRef.current?.dragPan.enable()
    }
  }, [enabled, mapRef])

  function getRelativePoint(
    event: ReactPointerEvent<HTMLDivElement>,
    element: HTMLDivElement,
  ): DragPoint {
    const bounds = element.getBoundingClientRect()

    return {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    }
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    const map = mapRef.current

    if (!enabled || !map) {
      return
    }

    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    map.dragPan.disable()

    const nextPoint = getRelativePoint(event, event.currentTarget)
    dragStartRef.current = nextPoint
    setBrushRectangle({
      left: nextPoint.x,
      top: nextPoint.y,
      width: 0,
      height: 0,
    })
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!enabled || !dragStartRef.current) {
      return
    }

    const nextPoint = getRelativePoint(event, event.currentTarget)
    setBrushRectangle(toBrushRectangle(dragStartRef.current, nextPoint))
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const map = mapRef.current

    if (!enabled || !map || !dragStartRef.current) {
      return
    }

    const endPoint = getRelativePoint(event, event.currentTarget)
    const nextRectangle = toBrushRectangle(dragStartRef.current, endPoint)

    dragStartRef.current = null
    setBrushRectangle(null)
    map.dragPan.enable()
    event.currentTarget.releasePointerCapture(event.pointerId)

    if (nextRectangle.width < minBrushSize || nextRectangle.height < minBrushSize) {
      return
    }

    const southWest = map.unproject([
      nextRectangle.left,
      nextRectangle.top + nextRectangle.height,
    ])
    const northEast = map.unproject([
      nextRectangle.left + nextRectangle.width,
      nextRectangle.top,
    ])

    map.fitBounds(
      [
        [southWest.lng, southWest.lat],
        [northEast.lng, northEast.lat],
      ],
      {
        padding: 24,
        duration: 500,
      },
    )

    onComplete?.()
  }

  return {
    brushRectangle,
    overlayProps: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
    },
  }
}
