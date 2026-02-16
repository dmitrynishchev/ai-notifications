import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Task } from '../types'
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
  onEditTitle: (id: string, value: string) => void
  onEditDescription: (id: string, value: string) => void
  onDelegate: () => void
  onDeleteTask: (id: string) => void
}

// Enter/exit animations (ease-out-cubic): fast start, gentle landing
const EASE_OUT = [0.215, 0.61, 0.355, 1] as const

// Morphing/movement of on-screen elements (ease-in-out-quad): smooth acceleration + deceleration
const EASE_IN_OUT = [0.455, 0.03, 0.515, 0.955] as const

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
    const ro = new ResizeObserver(([entry]) => {
      setHeight(entry.contentRect.height)
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

export function NotificationPanel({
  tasks,
  isExpanded,
  isExecuting,
  onExpand,
  onCollapse,
  onClose,
  onToggle,
  onEditTitle,
  onEditDescription,
  onDelegate,
  onDeleteTask,
}: NotificationPanelProps) {
  const [tasksRef, measuredHeight] = useMeasure<HTMLDivElement>()
  const [btnSizerRef, btnContentWidth] = useMeasureWidth<HTMLSpanElement>()
  const panelRef = useRef<HTMLDivElement | null>(null)
  const glitchCleanupRef = useRef<(() => void) | null>(null)
  const [dissolvingIds, setDissolvingIds] = useState<Set<string>>(new Set())

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

  // cleanup glitch + drag on collapse/reset
  useEffect(() => {
    if (!isExpanded) {
      glitchCleanupRef.current?.()
      glitchCleanupRef.current = null
      cancelDrag()
      setDissolvingIds(new Set())
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
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      transition={{ duration: 0.3, ease: EASE_OUT }}
    >
      {/* Stack cards (back, middle) — fade out on expand */}
      {tasks.length > 2 && (
        <motion.div
          className="panel-stack-card panel-stack-card--back"
          initial={false}
          animate={{
            opacity: isExpanded ? 0 : 0.7,
            y: isExpanded ? -8 : 0,
          }}
          transition={{ duration: 0.25, ease: EASE_OUT, delay: isExpanded ? 0 : 0.1 }}
        />
      )}
      {tasks.length > 1 && (
        <motion.div
          className="panel-stack-card panel-stack-card--middle"
          initial={false}
          animate={{
            opacity: isExpanded ? 0 : 0.85,
            y: isExpanded ? -8 : 0,
          }}
          transition={{ duration: 0.25, ease: EASE_OUT, delay: isExpanded ? 0 : 0.1 }}
        />
      )}

      {/* Main card — blur crossfade between collapsed and expanded content */}
      <motion.div
        className={`panel-main-card ${!isExpanded ? 'panel-main-card--clickable' : ''}`}
        onClick={handleMainCardClick}
        initial={false}
        animate={{ marginBottom: isExpanded ? -10 : 0 }}
        transition={{ duration: 0.3, ease: EASE_IN_OUT }}
      >
        {/* Background layer — visible only in collapsed state */}
        <motion.div
          className="panel-main-card-bg"
          initial={false}
          animate={{ opacity: isExpanded ? 0 : 1 }}
          transition={{ duration: 0.3, ease: EASE_OUT, delay: isExpanded ? 0 : 0.05 }}
        />

        {/* Collapsed content */}
        <motion.div
          className="panel-collapsed-content"
          initial={false}
          animate={{ opacity: isExpanded ? 0 : 1 }}
          transition={{ duration: 0.25, ease: EASE_OUT }}
        >
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
        </motion.div>

        {/* Expanded content (header) */}
        <motion.div
          className="panel-expanded-content"
          initial={false}
          animate={{ opacity: isExpanded ? 1 : 0 }}
          transition={{ duration: 0.25, ease: EASE_OUT, delay: isExpanded ? 0.05 : 0 }}
        >
          <span className="panel-header-title">Heavyweight Systems</span>
          <div className="panel-header-actions">
            <button className="panel-header-btn" onClick={onCollapse}>
              <ChevronDown />
              <span>Show less</span>
            </button>
            <button className="panel-header-btn panel-header-btn--icon" onClick={onClose}>
              <CloseIcon />
            </button>
          </div>
        </motion.div>
      </motion.div>

      {/* Tasks wrapper — height animates from 0 to measured */}
      <motion.div
        className="panel-tasks-wrapper"
        initial={false}
        animate={{ height: isExpanded ? measuredHeight : 0 }}
        transition={{
          duration: wasJustExpanded ? 0.3 : 0.25,
          ease: EASE_IN_OUT,
        }}
      >
        <div ref={tasksRef} className="panel-tasks-inner">
          <div className="panel-tasks-scroll-container">
            <div ref={tasksListRef} className="panel-tasks-list">
              <AnimatePresence>
                {visibleTasks.map((task, index) => {
                  const isNew = newTaskIds.has(task.id)
                  return (
                  <motion.div
                    key={task.id}
                    className="panel-task-stagger"
                    initial={isNew
                      ? { opacity: 0 }
                      : false
                    }
                    animate={{
                      y: isExpanded ? 0 : -20 - index * 5,
                      opacity: isExpanded ? 1 : 0,
                    }}
                    exit={{
                      opacity: 0,
                      height: 0,
                      y: -10,
                      overflow: 'hidden',
                      transition: { duration: 0.25, ease: EASE_OUT },
                    }}
                    transition={{
                      duration: 0.3,
                      ease: EASE_OUT,
                      delay: wasJustExpanded
                        ? getStaggerDelay(index, visibleTasks.length, isExpanded)
                        : 0,
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
                        onEditTitle={onEditTitle}
                        onEditDescription={onEditDescription}
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
                  transition={{ delay: 0.3, duration: 0.3 }}
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
                  {!isExecuting && <span className="delegate-btn-hotkey">􀆔􀅇</span>}
                </span>
              </motion.button>
            </div>
          )}
        </div>
      </motion.div>

      <DragOverlay dragState={dragState} />
    </motion.div>
  )
}

function ChevronDown() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path
        d="M2.5 3.75L5 6.25L7.5 3.75"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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
