import { useRef, useCallback, type PointerEvent as ReactPointerEvent } from 'react'
import { SWIPE_THRESHOLD, VELOCITY_THRESHOLD, CLICK_THRESHOLD } from '../components/toast/constants'

interface SwipeCallbacks {
  onSwipeDismiss: (direction: 1 | -1) => void
  onSwipeMove: (deltaX: number) => void
  onSwipeEnd: () => void
  enabled: boolean
}

export function useSwipeGesture({ onSwipeDismiss, onSwipeMove, onSwipeEnd, enabled }: SwipeCallbacks) {
  const startX = useRef(0)
  const startTime = useRef(0)
  const swiping = useRef(false)

  const onPointerDown = useCallback(
    (e: ReactPointerEvent) => {
      if (!enabled) return
      startX.current = e.clientX
      startTime.current = Date.now()
      swiping.current = false
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    },
    [enabled],
  )

  const onPointerMove = useCallback(
    (e: ReactPointerEvent) => {
      if (!enabled || startTime.current === 0) return
      const deltaX = e.clientX - startX.current
      if (Math.abs(deltaX) > CLICK_THRESHOLD) {
        swiping.current = true
        onSwipeMove(deltaX)
      }
    },
    [enabled, onSwipeMove],
  )

  const onPointerUp = useCallback(
    (e: ReactPointerEvent) => {
      if (!enabled || startTime.current === 0) return

      const deltaX = e.clientX - startX.current
      const elapsed = Date.now() - startTime.current
      const velocity = Math.abs(deltaX) / Math.max(elapsed, 1)

      startTime.current = 0

      if (!swiping.current) {
        // Was a click, not a swipe — do nothing
        return
      }

      if (Math.abs(deltaX) > SWIPE_THRESHOLD || velocity > VELOCITY_THRESHOLD) {
        onSwipeDismiss(deltaX > 0 ? 1 : -1)
      } else {
        onSwipeEnd()
      }
    },
    [enabled, onSwipeDismiss, onSwipeEnd],
  )

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    isSwiping: () => swiping.current,
  }
}
