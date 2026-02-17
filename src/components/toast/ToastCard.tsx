import { useCallback, useEffect, useRef, useState } from 'react'
import { useSwipeGesture } from '../../hooks/useSwipeGesture'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import {
  SCALE_FACTORS,
  TRANSLATE_Y,
  CARD_WIDTH,
  CARD_BORDER_RADIUS,
  SPRING_DURATION,
  SPRING_EASING,
  EXIT_DURATION,
  EXIT_EASING,
  SWIPE_EXIT_DISTANCE,
  ICON_BORDER_RADIUS,
  DEFAULT_CARD_HEIGHT,
} from './constants'
import type { ToastData } from './types'

interface ToastCardProps {
  toast: ToastData
  index: number
  expanded: boolean
  onDismiss: (id: string) => void
  onExpandClick: () => void
  visibleToasts: number
  gap: number
  cardHeight: number
  setCardHeight: (h: number) => void
  headerOffset: number
}

export function ToastCard({
  toast: t,
  index,
  expanded,
  onDismiss,
  onExpandClick,
  visibleToasts,
  gap,
  cardHeight,
  setCardHeight,
  headerOffset,
}: ToastCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const reducedMotion = useReducedMotion()
  const [mounted, setMounted] = useState(false)
  const [exiting, setExiting] = useState<'swipe-left' | 'swipe-right' | 'auto' | null>(null)
  const [swipeX, setSwipeX] = useState(0)

  // Measure card height on mount
  useEffect(() => {
    if (ref.current && cardHeight === 0) {
      setCardHeight(ref.current.offsetHeight)
    }
  }, [cardHeight, setCardHeight])

  // Enter animation: mount → next frame → visible
  useEffect(() => {
    if (reducedMotion) {
      setMounted(true)
      return
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setMounted(true)
      })
    })
  }, [reducedMotion])

  // Auto-dismiss timer
  useEffect(() => {
    if (expanded || exiting) return

    const timer = setTimeout(() => {
      setExiting('auto')
      setTimeout(() => onDismiss(t.id), EXIT_DURATION)
    }, t.duration)

    return () => clearTimeout(timer)
  }, [expanded, exiting, t.duration, t.id, onDismiss])

  const handleSwipeDismiss = useCallback(
    (direction: 1 | -1) => {
      setExiting(direction > 0 ? 'swipe-right' : 'swipe-left')
      setTimeout(() => onDismiss(t.id), EXIT_DURATION)
    },
    [onDismiss, t.id],
  )

  const handleSwipeMove = useCallback((deltaX: number) => {
    setSwipeX(deltaX)
  }, [])

  const handleSwipeEnd = useCallback(() => {
    setSwipeX(0)
  }, [])

  const swipeEnabled = index === 0 || expanded
  const { onPointerDown, onPointerMove, onPointerUp, isSwiping } = useSwipeGesture({
    onSwipeDismiss: handleSwipeDismiss,
    onSwipeMove: handleSwipeMove,
    onSwipeEnd: handleSwipeEnd,
    enabled: swipeEnabled,
  })

  const handleClick = () => {
    if (isSwiping()) return
    if (!expanded) {
      onExpandClick()
    }
  }

  // --- Compute transform ---
  const clampedIndex = Math.min(index, visibleToasts - 1)
  const isHidden = index >= visibleToasts && !expanded

  let transform: string
  let opacity: number
  let borderRadius: number

  if (exiting === 'swipe-left') {
    transform = `translateX(-${SWIPE_EXIT_DISTANCE}px)`
    opacity = 0
  } else if (exiting === 'swipe-right') {
    transform = `translateX(${SWIPE_EXIT_DISTANCE}px)`
    opacity = 0
  } else if (exiting === 'auto') {
    transform = 'translateY(100%)'
    opacity = 0
  } else if (!mounted) {
    // Enter: start from above
    transform = 'translateY(100%) scale(1)'
    opacity = 0
  } else if (swipeX !== 0) {
    // During swipe drag
    transform = expanded
      ? `translateX(${swipeX}px) translateY(${headerOffset + index * (cardHeight + gap)}px) scale(1)`
      : `translateX(${swipeX}px) translateY(${TRANSLATE_Y[clampedIndex]}px) scale(${SCALE_FACTORS[clampedIndex]})`
    opacity = Math.max(0, 1 - Math.abs(swipeX) / SWIPE_EXIT_DISTANCE)
  } else if (expanded) {
    const h = cardHeight || DEFAULT_CARD_HEIGHT
    transform = `translateY(${headerOffset + index * (h + gap)}px) scale(1)`
    opacity = 1
  } else {
    transform = `translateY(${TRANSLATE_Y[clampedIndex]}px) scale(${SCALE_FACTORS[clampedIndex]})`
    opacity = isHidden ? 0 : 1
  }

  borderRadius = expanded ? 20 : (CARD_BORDER_RADIUS[clampedIndex] ?? 20)

  const makeTransition = (d: number, e: string) =>
    `transform ${d}ms ${e}, opacity ${d}ms ${e}, border-radius ${d}ms ${e}`

  const transition =
    reducedMotion || swipeX !== 0
      ? 'none'
      : exiting
        ? makeTransition(EXIT_DURATION, EXIT_EASING)
        : makeTransition(SPRING_DURATION, SPRING_EASING)

  const zIndex = 100 - index

  const timeAgo = getTimeAgo(t.createdAt)

  return (
    <div
      ref={ref}
      role="status"
      aria-live="polite"
      onClick={handleClick}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      className="absolute top-0 left-0 right-0 select-none touch-none"
      style={{
        transform,
        opacity,
        borderRadius,
        transition,
        zIndex,
        pointerEvents: isHidden ? 'none' : undefined,
        transformOrigin: 'bottom center',
        willChange: 'transform, opacity',
      }}
    >
      <div
        className="mx-auto px-3.5 py-3 backdrop-blur-xl cursor-pointer bg-white"
        style={{
          width: CARD_WIDTH,
          borderRadius: 'inherit',
          boxShadow: expanded
            ? '0px 1px 2px rgba(0, 0, 0, 0.06), 0px 4px 12px rgba(0, 0, 0, 0.08)'
            : `
              inset 0px -2px 1px rgba(255, 255, 255, 0.4),
              0px 1px 3px rgba(0, 0, 0, 0.08),
              0px 8px 24px rgba(0, 0, 0, 0.12)
            `,
          transition: reducedMotion ? 'none' : `box-shadow ${SPRING_DURATION}ms ${SPRING_EASING}`,
        }}
      >
        <div className="flex items-start gap-2.5">
          {t.icon && (
            <img
              src={t.icon}
              alt=""
              className="w-8 h-8 shrink-0"
              style={{ borderRadius: ICON_BORDER_RADIUS }}
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span
                className="font-bold text-[13px] leading-[16px] truncate text-black/80"
              >
                {t.title}
              </span>
              <span
                className="text-[11px] leading-[13px] font-medium flex-shrink-0 ml-2 text-black/20"
              >
                {timeAgo}
              </span>
            </div>
            {t.description && (
              <p
                className="text-[13px] leading-[16px] mt-0.5 text-black/60"
              >
                {t.description}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function getTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp
  const seconds = Math.floor(diff / 1000)
  if (seconds < 5) return 'now'
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  return `${Math.floor(minutes / 60)}h ago`
}
