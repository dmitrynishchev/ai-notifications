import { useState, useRef, useCallback, useEffect } from 'react'

const DRAG_THRESHOLD = 5 // px before drag activates

export interface DragState {
  isDragging: boolean
  taskId: string | null
  cursorX: number
  cursorY: number
  /** offset from cursor to card top-left corner */
  offsetX: number
  offsetY: number
  /** original card rect for placeholder sizing */
  cardRect: DOMRect | null
  /** snap-back animation: target position = original card rect */
  isSnappingBack: boolean
  /** cursor is outside the panel boundary (delete zone) */
  isOutside: boolean
}

const INITIAL_STATE: DragState = {
  isDragging: false,
  taskId: null,
  cursorX: 0,
  cursorY: 0,
  offsetX: 0,
  offsetY: 0,
  cardRect: null,
  isSnappingBack: false,
  isOutside: false,
}

interface UseDragToDeleteOptions {
  panelRef: React.RefObject<HTMLElement | null>
  isExecuting: boolean
  onGlitchStart: (id: string, rect: DOMRect) => void
}

export function useDragToDelete({
  panelRef,
  isExecuting,
  onGlitchStart,
}: UseDragToDeleteOptions) {
  const [dragState, setDragState] = useState<DragState>(INITIAL_STATE)

  // refs to avoid stale closures in window listeners
  const pendingRef = useRef<{
    taskId: string
    startX: number
    startY: number
    offsetX: number
    offsetY: number
    cardRect: DOMRect
  } | null>(null)
  const activeRef = useRef(false)
  const taskIdRef = useRef<string | null>(null)

  const handlePointerDown = useCallback(
    (taskId: string, e: React.PointerEvent) => {
      if (isExecuting) return
      if (activeRef.current) return // already dragging

      // don't start drag from inputs
      const target = e.target as HTMLElement
      const tag = target.tagName.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'button') return

      // find card element (closest .task-card)
      const card = target.closest('.task-card') as HTMLElement | null
      if (!card) return

      const rect = card.getBoundingClientRect()

      pendingRef.current = {
        taskId,
        startX: e.clientX,
        startY: e.clientY,
        offsetX: e.clientX - rect.left,
        offsetY: e.clientY - rect.top,
        cardRect: rect,
      }
    },
    [isExecuting]
  )

  useEffect(() => {
    function onMove(e: PointerEvent) {
      const pending = pendingRef.current
      if (!pending && !activeRef.current) return

      if (pending && !activeRef.current) {
        // check threshold
        const dx = e.clientX - pending.startX
        const dy = e.clientY - pending.startY
        if (Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD) return

        // activate drag
        activeRef.current = true
        taskIdRef.current = pending.taskId
        setDragState({
          isDragging: true,
          taskId: pending.taskId,
          cursorX: e.clientX,
          cursorY: e.clientY,
          offsetX: pending.offsetX,
          offsetY: pending.offsetY,
          cardRect: pending.cardRect,
          isSnappingBack: false,
          isOutside: false,
        })
        pendingRef.current = null
        return
      }

      // update cursor position + outside check
      if (activeRef.current) {
        const panelEl = panelRef.current
        let isOutside = false
        if (panelEl) {
          const pr = panelEl.getBoundingClientRect()
          isOutside =
            e.clientX < pr.left ||
            e.clientX > pr.right ||
            e.clientY < pr.top ||
            e.clientY > pr.bottom
        }
        setDragState((prev) => ({
          ...prev,
          cursorX: e.clientX,
          cursorY: e.clientY,
          isOutside,
        }))
      }
    }

    function onUp(e: PointerEvent) {
      pendingRef.current = null
      if (!activeRef.current || !taskIdRef.current) return

      const taskId = taskIdRef.current

      // check if cursor is outside the panel
      const panelEl = panelRef.current
      if (!panelEl) {
        resetDrag()
        return
      }

      const panelRect = panelEl.getBoundingClientRect()
      const outside =
        e.clientX < panelRect.left ||
        e.clientX > panelRect.right ||
        e.clientY < panelRect.top ||
        e.clientY > panelRect.bottom

      if (outside) {
        // get floating card position for glitch effect
        setDragState((prev) => {
          if (!prev.cardRect) return INITIAL_STATE
          const floatingLeft = prev.cursorX - prev.offsetX
          const floatingTop = prev.cursorY - prev.offsetY
          const rect = new DOMRect(
            floatingLeft,
            floatingTop,
            prev.cardRect.width,
            prev.cardRect.height
          )
          // trigger glitch at floating card position
          onGlitchStart(taskId, rect)
          return INITIAL_STATE
        })
        activeRef.current = false
        taskIdRef.current = null
      } else {
        // snap back
        setDragState((prev) => ({ ...prev, isSnappingBack: true }))
        setTimeout(() => {
          resetDrag()
        }, 200) // matches CSS transition duration
      }
    }

    function resetDrag() {
      activeRef.current = false
      taskIdRef.current = null
      pendingRef.current = null
      setDragState(INITIAL_STATE)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [panelRef, onGlitchStart])

  // expose reset for external abort (e.g. app reset)
  const cancelDrag = useCallback(() => {
    activeRef.current = false
    taskIdRef.current = null
    pendingRef.current = null
    setDragState(INITIAL_STATE)
  }, [])

  return { dragState, handlePointerDown, cancelDrag }
}
