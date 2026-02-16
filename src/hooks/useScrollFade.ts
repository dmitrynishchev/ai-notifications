import { useState, useEffect, useCallback, useRef } from 'react'

interface ScrollFadeState {
  canScrollUp: boolean
  canScrollDown: boolean
}

export function useScrollFade(scrollRef: React.RefObject<HTMLElement | null>): ScrollFadeState {
  const [state, setState] = useState<ScrollFadeState>({
    canScrollUp: false,
    canScrollDown: false,
  })

  const rafRef = useRef(0)

  const update = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      const el = scrollRef.current
      if (!el) return

      const { scrollTop, scrollHeight, clientHeight } = el
      const canScrollUp = scrollTop > 1
      const canScrollDown = scrollTop + clientHeight < scrollHeight - 1

      setState(prev => {
        if (prev.canScrollUp === canScrollUp && prev.canScrollDown === canScrollDown) return prev
        return { canScrollUp, canScrollDown }
      })
    })
  }, [scrollRef])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    // Initial check
    update()

    // Scroll events
    el.addEventListener('scroll', update, { passive: true })

    // Content size changes (tasks added/removed, animations)
    const ro = new ResizeObserver(update)
    ro.observe(el)
    // Also observe scroll content for height changes
    for (const child of el.children) {
      ro.observe(child)
    }

    return () => {
      cancelAnimationFrame(rafRef.current)
      el.removeEventListener('scroll', update)
      ro.disconnect()
    }
  }, [scrollRef, update])

  return state
}
