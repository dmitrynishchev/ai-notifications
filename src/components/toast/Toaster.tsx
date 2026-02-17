import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { subscribe, getSnapshot, setExpanded, dismissToast } from './state'
import { ToastCard } from './ToastCard'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { DEFAULT_VISIBLE_TOASTS, DEFAULT_GAP, DEFAULT_OFFSET, DEFAULT_CONTAINER_HEIGHT, CARD_WIDTH, HEADER_HEIGHT, HEADER_GAP, SPRING_DURATION, SPRING_EASING } from './constants'
import type { ToasterProps, ToastPosition } from './types'

export function Toaster({
  position = 'top-center',
  visibleToasts = DEFAULT_VISIBLE_TOASTS,
  gap = DEFAULT_GAP,
  offset = DEFAULT_OFFSET,
  title = 'Heavyweight Systems',
}: ToasterProps) {
  const { toasts, expanded } = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const reducedMotion = useReducedMotion()
  const containerRef = useRef<HTMLDivElement>(null)
  const [cardHeight, setCardHeight] = useState(0)

  // Click outside to collapse
  useEffect(() => {
    if (!expanded) return

    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setExpanded(false)
      }
    }

    // Use setTimeout to avoid the same click that expanded from immediately collapsing
    const timer = setTimeout(() => {
      document.addEventListener('click', handler)
    }, 0)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('click', handler)
    }
  }, [expanded])

  const handleExpandClick = useCallback(() => {
    if (toasts.length > 1) {
      setExpanded(true)
    }
  }, [toasts.length])

  const handleDismiss = useCallback((id: string) => {
    const t = getSnapshot().toasts.find((t) => t.id === id)
    t?.onDismiss?.(id)
    dismissToast(id)
  }, [])

  // Position styles
  const positionStyle = getPositionStyle(position, offset)

  // Header visibility
  const showHeader = expanded && toasts.length > 1
  const headerOffset = showHeader ? HEADER_HEIGHT + HEADER_GAP : 0

  // Container height for expanded state
  const containerHeight = expanded && cardHeight > 0
    ? headerOffset + toasts.length * cardHeight + (toasts.length - 1) * gap
    : cardHeight || DEFAULT_CONTAINER_HEIGHT

  if (toasts.length === 0) return null

  return (
    <div
      ref={containerRef}
      className="fixed z-[9999] pointer-events-none"
      style={{
        ...positionStyle,
        width: CARD_WIDTH,
      }}
    >
      <div
        className="relative pointer-events-auto"
        style={{
          height: containerHeight,
          transition: reducedMotion ? 'none' : `height ${SPRING_DURATION}ms ${SPRING_EASING}`,
        }}
      >
        {/* Header row */}
        <div
          className="absolute top-0 left-0 right-0 flex items-center gap-3 px-3.5"
          style={{
            height: HEADER_HEIGHT,
            opacity: showHeader ? 1 : 0,
            transition: reducedMotion ? 'none' : `opacity ${SPRING_DURATION}ms ${SPRING_EASING}`,
            pointerEvents: showHeader ? 'auto' : 'none',
            zIndex: 0,
          }}
        >
          <span
            className="flex-1 min-w-0 font-bold text-[13px] leading-[16px] truncate text-black/80"
          >
            {title}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="cursor-pointer bg-black/5 hover:bg-black/10 active:scale-[0.97] transition-[background-color,transform] rounded-full px-2 py-1 border-none text-[11px] font-medium leading-[15px] text-black/60"
            >
              Show less
            </button>
            <button
              type="button"
              onClick={() => dismissToast()}
              className="cursor-pointer flex items-center justify-center bg-black/5 hover:bg-black/10 active:scale-[0.97] transition-[background-color,transform] rounded-full p-2 border-none"
            >
              <svg width="8" height="8" viewBox="0 0 7 7" fill="none">
                <path
                  d="M1 1L6 6M6 1L1 6"
                  stroke="rgba(0, 0, 0, 0.6)"
                  strokeWidth="1"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>

        {toasts.map((t, index) => (
          <ToastCard
            key={t.id}
            toast={t}
            index={index}
            expanded={expanded}
            onDismiss={handleDismiss}
            onExpandClick={handleExpandClick}
            visibleToasts={visibleToasts}
            gap={gap}
            cardHeight={cardHeight}
            setCardHeight={setCardHeight}
            headerOffset={headerOffset}
          />
        ))}
      </div>
    </div>
  )
}

function getPositionStyle(
  position: ToastPosition,
  offset: number | string,
): React.CSSProperties {
  const off = typeof offset === 'number' ? `${offset}px` : offset

  const base: React.CSSProperties = {}

  if (position.startsWith('top')) {
    base.top = off
  } else {
    base.bottom = off
  }

  if (position.endsWith('center')) {
    base.left = '50%'
    base.transform = 'translateX(-50%)'
  } else if (position.endsWith('left')) {
    base.left = off
  } else {
    base.right = off
  }

  return base
}
