import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Task } from '../types'
import { EASE_OUT, EASE_IN_OUT } from '../animation'
import { AppIcon } from './AppIcon'
import { TaskCard } from './TaskCard'
import { DragOverlay } from './DragOverlay'
import { useDragToDelete } from '../hooks/useDragToDelete'
import { useScrollFade } from '../hooks/useScrollFade'
import { runGlitchEffect } from '../effects/glitchEffect'
import './NotificationPanel.css'

interface NotificationPanelProps {
  tasks: Task[]
  isExpanded: boolean
  isExecuting: boolean
  onExpand: () => void
  onCollapse: () => void
  onClose: () => void
  onToggle: (id: string) => void
  onDelegate: () => void
  onDeleteTask: (id: string) => void
}


function getStaggerDelay(index: number, total: number, isOpening: boolean) {
  if (!isOpening) return (total - 1 - index) * 0.02
  const perItem = Math.min(0.04, 0.3 / Math.max(total, 1))
  return 0.05 + index * perItem
}

function useMeasure<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T | null>(null)
  const [height, setHeight] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      if (ref.current) setHeight(ref.current.offsetHeight)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return [ref, height]
}

function useMeasureWidth<T extends HTMLElement>(): [(el: T | null) => void, number | undefined] {
  const [width, setWidth] = useState<number | undefined>(undefined)
  const roRef = useRef<ResizeObserver | null>(null)

  const callbackRef = useCallback((el: T | null) => {
    roRef.current?.disconnect()
    if (!el) return
    roRef.current = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width)
    })
    roRef.current.observe(el)
  }, [])

  useEffect(() => () => roRef.current?.disconnect(), [])

  return [callbackRef, width]
}

function getTaskCountText(count: number): string {
  if (count === 1) return 'One task is extracted'
  if (count === 2) return 'Two tasks are extracted'
  if (count === 3) return 'Three tasks are extracted'
  if (count === 4) return 'Four tasks are extracted'
  return `${count} tasks are extracted`
}

const FRONT_CARD_OVERLAP = 52
const PEEK_PER_CARD = 8
const STACK_SCALES = [0.94, 0.88] as const
const STACK_OPACITIES = [1, 0.85] as const

function getCollapsedStyle(
  index: number,
  total: number,
  offsets: number[],
  heights: number[]
): { y: number; scale: number; opacity: number; zIndex: number } {
  const naturalY = offsets[index] ?? 0
  const maxStacked = Math.min(2, total - 1)

  // Hidden cards (not in the visible stack)
  if (index < total - maxStacked) {
    return { y: -naturalY, scale: 1, opacity: 0, zIndex: total - index }
  }

  // Stacked card: k=0 (upper/closer to front), k=1 (lower/further back)
  const k = index - (total - maxStacked)
  const scale = STACK_SCALES[k] ?? 0.88
  const opacity = STACK_OPACITIES[k] ?? 0.85
  const H = heights[index] ?? 72
  const targetY = FRONT_CARD_OVERLAP + (k + 1) * PEEK_PER_CARD - H * scale

  return {
    y: targetY - naturalY,
    scale,
    opacity,
    zIndex: maxStacked - k,
  }
}

export function NotificationPanel({
  tasks,
  isExpanded,
  isExecuting,
  onExpand,
  onCollapse,
  onClose,
  onToggle,
  onDelegate,
  onDeleteTask,
}: NotificationPanelProps) {
  const [tasksRef, measuredHeight] = useMeasure<HTMLDivElement>()
  const [headerRef, headerHeight] = useMeasure<HTMLDivElement>()
  const [btnSizerRef, btnContentWidth] = useMeasureWidth<HTMLSpanElement>()
  const panelRef = useRef<HTMLDivElement | null>(null)
  const glitchCleanupRef = useRef<(() => void) | null>(null)
  const [dissolvingIds, setDissolvingIds] = useState<Set<string>>(new Set())

  // Card slot refs + measured offsets for FLIP animation
  const cardSlotsRef = useRef<Map<string, HTMLDivElement>>(new Map())
  const [cardOffsets, setCardOffsets] = useState<number[]>([])
  const skipAnimationRef = useRef(true)

  // Track "just expanded" vs "already expanded" for stagger logic
  const wasExpandedRef = useRef(false)
  const [wasJustExpanded, setWasJustExpanded] = useState(false)

  useEffect(() => {
    if (isExpanded && !wasExpandedRef.current) {
      setWasJustExpanded(true)
      const timer = setTimeout(() => setWasJustExpanded(false), 500)
      wasExpandedRef.current = true
      return () => clearTimeout(timer)
    }
    if (!isExpanded) {
      wasExpandedRef.current = false
      setWasJustExpanded(false)
    }
  }, [isExpanded])

  // Track newly added tasks for entrance animation
  const prevTaskIdsRef = useRef<Set<string>>(new Set(tasks.map(t => t.id)))
  const [newTaskIds, setNewTaskIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const currentIds = new Set(tasks.map(t => t.id))
    const prevIds = prevTaskIdsRef.current
    if (isExpanded && prevIds.size > 0) {
      const added = new Set<string>()
      for (const id of currentIds) {
        if (!prevIds.has(id)) added.add(id)
      }
      if (added.size > 0) setNewTaskIds(prev => new Set([...prev, ...added]))
    }
    prevTaskIdsRef.current = currentIds
  }, [tasks, isExpanded])

  // Scroll ref + scroll fade
  const tasksListRef = useRef<HTMLDivElement>(null)
  const { canScrollUp, canScrollDown } = useScrollFade(tasksListRef)

  // Auto-scroll to new tasks
  useEffect(() => {
    if (newTaskIds.size > 0 && isExpanded && tasksListRef.current) {
      requestAnimationFrame(() => {
        tasksListRef.current?.scrollTo({
          top: tasksListRef.current.scrollHeight,
          behavior: 'smooth',
        })
      })
    }
  }, [newTaskIds, isExpanded])

  const handleGlitchStart = useCallback(
    (taskId: string, rect: DOMRect) => {
      setDissolvingIds(prev => new Set(prev).add(taskId))
      glitchCleanupRef.current = runGlitchEffect({
        rect,
        duration: 700,
        onComplete: () => {
          glitchCleanupRef.current = null
          onDeleteTask(taskId)
          setDissolvingIds(prev => {
            const next = new Set(prev)
            next.delete(taskId)
            return next
          })
        },
      })
    },
    [onDeleteTask]
  )

  const { dragState, handlePointerDown, cancelDrag } = useDragToDelete({
    panelRef,
    isExecuting,
    onGlitchStart: handleGlitchStart,
  })

  // cleanup glitch + drag on collapse/reset + scroll reset
  useEffect(() => {
    if (!isExpanded) {
      glitchCleanupRef.current?.()
      glitchCleanupRef.current = null
      cancelDrag()
      setDissolvingIds(new Set())
      if (tasksListRef.current) tasksListRef.current.scrollTop = 0
    }
  }, [isExpanded, cancelDrag])

  // cleanup glitch on unmount
  useEffect(() => {
    return () => {
      glitchCleanupRef.current?.()
    }
  }, [])

  const visibleTasks = tasks.filter(t => !dissolvingIds.has(t.id))
  const selectedCount = visibleTasks.filter((t) => t.status === 'selected').length
  const nonDoneCount = visibleTasks.filter((t) => t.status !== 'done').length
  const allDone = nonDoneCount === 0

  // Measure card slot positions for FLIP animation (sync before paint)
  useLayoutEffect(() => {
    const offsets = visibleTasks.map(t => {
      const el = cardSlotsRef.current.get(t.id)
      return el ? el.offsetTop : 0
    })
    setCardOffsets(offsets)
  }, [visibleTasks.length])

  // Clear skip flag after initial measurement is painted
  useEffect(() => {
    if (skipAnimationRef.current && cardOffsets.length > 0) {
      skipAnimationRef.current = false
    }
  }, [cardOffsets])

  // Estimate offsets for newly added cards that haven't been measured yet.
  // Without this, new cards mount at y ≈ 16 (naturalY fallback 0) instead of
  // y ≈ 16 − realOffset, causing them to fly in from way below during 0.35s.
  let effectiveOffsets = cardOffsets
  if (cardOffsets.length < visibleTasks.length && !isExpanded) {
    effectiveOffsets = [...cardOffsets]
    for (let i = effectiveOffsets.length; i < visibleTasks.length; i++) {
      const prevTask = visibleTasks[i - 1]
      const prevEl = prevTask ? cardSlotsRef.current.get(prevTask.id) : null
      const prevOffset = effectiveOffsets[i - 1] ?? 0
      const prevHeight = prevEl?.offsetHeight ?? 72
      effectiveOffsets.push(prevOffset + prevHeight + 6) // 6 = flex gap
    }
  }

  // Measured heights for each visible task card (used by getCollapsedStyle)
  const effectiveHeights: number[] = visibleTasks.map(t => {
    const el = cardSlotsRef.current.get(t.id)
    return el?.offsetHeight ?? 72
  })

  // PEEK_HEIGHT: how much layout space the stacked cards region occupies when collapsed
  const maxStacked = Math.min(2, visibleTasks.length - 1)
  const PEEK_HEIGHT = maxStacked > 0 ? maxStacked * PEEK_PER_CARD + 2 : 0

  const showDelegate = !allDone && selectedCount > 0
  const prevCountRef = useRef(selectedCount)
  const countDirection = selectedCount > prevCountRef.current ? 1 : -1
  useEffect(() => { prevCountRef.current = selectedCount }, [selectedCount])

  const handleMainCardClick = useCallback(() => {
    if (!isExpanded) onExpand()
  }, [isExpanded, onExpand])

  return (
    <motion.div
      ref={panelRef}
      className="notification-panel"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2, ease: EASE_OUT } }}
      transition={{ duration: 0.3, ease: EASE_OUT }}
    >
      {/* Header reveal — separate element that grows from height:0 */}
      <motion.div
        className="panel-header-reveal"
        initial={false}
        animate={{
          height: isExpanded ? headerHeight : 0,
          opacity: isExpanded ? 1 : 0,
        }}
        transition={{
          height: { duration: isExpanded ? 0.3 : 0.25, ease: EASE_IN_OUT },
          opacity: { duration: 0.2, ease: EASE_OUT, delay: isExpanded ? 0.08 : 0 },
        }}
      >
        <div ref={headerRef} className="panel-header">
          <span className="panel-header-title">Heavyweight Systems</span>
          <div className="panel-header-actions">
            <button className="panel-header-btn" onClick={onCollapse}>
              <span>Show less</span>
            </button>
            <button className="panel-header-btn panel-header-btn--icon" onClick={onClose}>
              <CloseIcon />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Main card — always visible, acts as anchor for FLIP animation */}
      <motion.div
        className={`panel-main-card${!isExpanded ? ' panel-main-card--clickable' : ''}`}
        onClick={handleMainCardClick}
        initial={false}
        animate={{
          height: isExpanded ? 0 : 'auto',
          opacity: isExpanded ? 0 : 1,
          filter: isExpanded ? 'blur(8px)' : 'blur(0px)',
        }}
        transition={{
          height: { duration: 0.3, ease: EASE_IN_OUT },
          opacity: { duration: 0.2, ease: EASE_OUT, delay: isExpanded ? 0 : 0.1 },
          filter: { duration: 0.2, ease: EASE_OUT, delay: isExpanded ? 0 : 0.1 },
        }}
        style={{ pointerEvents: isExpanded ? 'none' : 'auto' }}
      >
        <div className="panel-main-card-bg" />
        <div className="panel-collapsed-content">
          <AppIcon size={32} />
          <div className="panel-collapsed-text">
            <div className="panel-collapsed-header">
              <span className="panel-collapsed-title">{getTaskCountText(tasks.length)}</span>
              <span className="panel-collapsed-time">now</span>
            </div>
            <p className="panel-collapsed-subtitle">
              Looks like they can be delegated to an agent
            </p>
          </div>
        </div>
      </motion.div>

      {/* Cards region — height animates, contains all task cards with FLIP transforms */}
      <motion.div
        className={`panel-cards-region${!isExpanded ? ' panel-cards-region--collapsed' : ''}`}
        initial={false}
        animate={{
          height: isExpanded ? measuredHeight : PEEK_HEIGHT,
          y: isExpanded ? 0 : (visibleTasks.length > 0 ? -52 : 0),
        }}
        transition={{ duration: 0.3, ease: EASE_IN_OUT }}
      >
        <div ref={tasksRef} className="panel-cards-inner">
          <div className="panel-cards-scroll-container">
            <div
              ref={tasksListRef}
              className={`panel-cards-list${isExpanded ? ' panel-cards-list--scrollable' : ''}`}
            >
              <AnimatePresence>
                {visibleTasks.map((task, index) => {
                  const isNew = newTaskIds.has(task.id)
                  const collapsed = getCollapsedStyle(index, visibleTasks.length, effectiveOffsets, effectiveHeights)

                  return (
                    <motion.div
                      key={task.id}
                      ref={el => {
                        if (el) cardSlotsRef.current.set(task.id, el)
                        else cardSlotsRef.current.delete(task.id)
                      }}
                      className="panel-card-slot"
                      initial={isNew ? { opacity: 0 } : false}
                      animate={isExpanded
                        ? { y: 0, scale: 1, opacity: 1 }
                        : collapsed
                      }
                      exit={{
                        opacity: 0,
                        height: 0,
                        y: -10,
                        overflow: 'hidden',
                        transition: { duration: 0.25, ease: EASE_OUT },
                      }}
                      transition={{
                        duration: skipAnimationRef.current ? 0 : 0.3,
                        ease: EASE_IN_OUT,
                        delay: wasJustExpanded
                          ? getStaggerDelay(index, visibleTasks.length, isExpanded)
                          : 0,
                      }}
                      style={{
                        zIndex: collapsed.zIndex,
                        pointerEvents: isExpanded ? 'auto' : 'none',
                      }}
                      onAnimationComplete={() => {
                        if (isNew) {
                          setNewTaskIds(prev => {
                            const next = new Set(prev)
                            next.delete(task.id)
                            return next
                          })
                        }
                      }}
                    >
                      {dragState.isDragging && dragState.taskId === task.id ? (
                        <div
                          className="drag-placeholder"
                          style={{ height: dragState.cardRect?.height ?? 0 }}
                        />
                      ) : (
                        <TaskCard
                          task={task}
                          onToggle={onToggle}
                          onPointerDown={(e) => handlePointerDown(task.id, e)}
                        />
                      )}
                    </motion.div>
                  )
                })}
              </AnimatePresence>

              {allDone && (
                <motion.div
                  className="panel-empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.25, duration: 0.2, ease: EASE_OUT }}
                >
                  All tasks done
                </motion.div>
              )}
            </div>
            <div className={`scroll-fade scroll-fade--top${canScrollUp ? ' scroll-fade--visible' : ''}`} />
            <div className={`scroll-fade scroll-fade--bottom${canScrollDown ? ' scroll-fade--visible' : ''}`} />
          </div>

          {/* Footer inside measured area so its height is part of the animation */}
          {!allDone && (
            <motion.div
              className="panel-footer-wrapper"
              initial={false}
              animate={{
                opacity: isExpanded ? 1 : 0,
                y: isExpanded ? 0 : -20,
              }}
              transition={{
                opacity: {
                  duration: 0.15,
                  ease: EASE_OUT,
                  delay: isExpanded && wasJustExpanded ? 0.15 : 0,
                },
                y: {
                  duration: 0.3,
                  ease: EASE_OUT,
                  delay: isExpanded && wasJustExpanded ? 0.15 : 0,
                },
              }}
              style={{ pointerEvents: isExpanded ? 'auto' : 'none' }}
            >
            <div className="panel-footer">
              <motion.button
                className={`delegate-btn${isExecuting ? ' delegate-btn--executing' : !showDelegate ? ' delegate-btn--disabled' : ''}`}
                disabled={!showDelegate || isExecuting}
                onClick={onDelegate}
                animate={btnContentWidth !== undefined ? { width: btnContentWidth + 25 } : undefined}
                transition={{ duration: 0.25, ease: EASE_IN_OUT }}
              >
                <span className="delegate-btn-shine" />
                <span ref={btnSizerRef} className="delegate-btn-sizer">
                  <span className={`delegate-btn-label${isExecuting ? ' delegate-btn-label--shimmer' : ''}`}>
                    {isExecuting ? (
                      'Execute'
                    ) : selectedCount === 0 ? (
                      'Select task'
                    ) : (
                      <>
                        Delegate{' '}
                        <motion.span
                          className="delegate-btn-ticker"
                          initial={false}
                          animate={{ width: `${String(selectedCount).length}ch` }}
                          transition={{ duration: 0.25, ease: EASE_IN_OUT }}
                        >
                          <AnimatePresence initial={false}>
                            <motion.span
                              key={selectedCount}
                              className="delegate-btn-ticker-digit"
                              initial={{ y: countDirection > 0 ? '-100%' : '100%' }}
                              animate={{ y: 0 }}
                              exit={{ y: countDirection > 0 ? '100%' : '-100%' }}
                              transition={{ duration: 0.25, ease: EASE_OUT }}
                            >
                              {selectedCount}
                            </motion.span>
                          </AnimatePresence>
                        </motion.span>
                        {' '}task{selectedCount > 1 ? 's' : ''}
                      </>
                    )}
                  </span>
                  {!isExecuting && <span className="delegate-btn-hotkey">⌘↵</span>}
                </span>
              </motion.button>
            </div>
            </motion.div>
          )}
        </div>
      </motion.div>

      <DragOverlay dragState={dragState} />
    </motion.div>
  )
}

function CloseIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path
        d="M2.5 2.5L7.5 7.5M7.5 2.5L2.5 7.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  )
}
