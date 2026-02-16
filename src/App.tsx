import { useState, useCallback, useEffect, useRef } from 'react'
import { AnimatePresence, MotionConfig } from 'framer-motion'
import type { Task } from './types'
import { INITIAL_TASKS, TASK_PRESETS } from './data'
import { NotificationPanel } from './components/NotificationPanel'
import './App.css'

let nextId = 5

function App() {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const [isExecuting, setIsExecuting] = useState(false)
  const executionRef = useRef(false)

  const handleToggle = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t
        if (t.status === 'selected') return { ...t, status: 'idle' }
        if (t.status === 'idle') return { ...t, status: 'selected' }
        return t
      })
    )
  }, [])

  const handleEditTitle = useCallback((id: string, value: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, title: value } : t)))
  }, [])

  const handleEditDescription = useCallback((id: string, value: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, description: value } : t)))
  }, [])

  const handleDelegate = useCallback(async () => {
    if (isExecuting) return
    setIsExecuting(true)
    executionRef.current = true

    const selectedIds = tasks.filter((t) => t.status === 'selected').map((t) => t.id)

    // Move all selected to queued immediately
    setTasks((prev) =>
      prev.map((t) => (t.status === 'selected' ? { ...t, status: 'queued' as const } : t))
    )

    for (const id of selectedIds) {
      if (!executionRef.current) break

      // Set current to running
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: 'running' as const } : t))
      )

      // Simulate work (1.5-3s per task)
      await new Promise((r) => setTimeout(r, 1500 + Math.random() * 1500))

      if (!executionRef.current) break

      // Set to done
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: 'done' as const } : t))
      )
    }

    setIsExecuting(false)
    executionRef.current = false
  }, [tasks, isExecuting])

  const handleDeleteTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const handleClose = useCallback(() => {
    setIsVisible(false)
    executionRef.current = false
    setIsExecuting(false)
    setTimeout(() => {
      nextId = 5
      setTasks(INITIAL_TASKS.map((t) => ({ ...t })))
      setIsExpanded(false)
      setIsVisible(true)
    }, 1000)
  }, [])

  const handleCollapse = useCallback(() => {
    setIsExpanded(false)
  }, [])

  const handleAddTask = useCallback(() => {
    const preset = TASK_PRESETS[Math.floor(Math.random() * TASK_PRESETS.length)]
    const newTask: Task = {
      id: String(nextId++),
      title: preset.title,
      description: preset.description,
      status: 'selected',
    }
    setTasks((prev) => [...prev, newTask])
    if (!isVisible) setIsVisible(true)
  }, [isVisible])

  const handleReset = useCallback(() => {
    executionRef.current = false
    setIsExecuting(false)
    nextId = 5
    setTasks(INITIAL_TASKS.map((t) => ({ ...t })))
    setIsExpanded(false)
    setIsVisible(true)
  }, [])

  // ⌘+Enter hotkey
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey && e.key === 'Enter' && isExpanded && !isExecuting) {
        const selectedCount = tasks.filter((t) => t.status === 'selected').length
        if (selectedCount > 0) {
          e.preventDefault()
          handleDelegate()
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isExpanded, isExecuting, tasks, handleDelegate])

  return (
    <MotionConfig reducedMotion="user">
      <div className="app">
        <div className="notification-container">
          <AnimatePresence>
            {isVisible && (
              <NotificationPanel
                key="panel"
                tasks={tasks}
                isExpanded={isExpanded}
                isExecuting={isExecuting}
                onExpand={() => setIsExpanded(true)}
                onCollapse={handleCollapse}
                onClose={handleClose}
                onToggle={handleToggle}
                onEditTitle={handleEditTitle}
                onEditDescription={handleEditDescription}
                onDelegate={handleDelegate}
                onDeleteTask={handleDeleteTask}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Demo control panel */}
        <div className="control-panel">
          <button className="control-btn" onClick={handleAddTask}>
            Add notification
          </button>
          <button className="control-btn" onClick={handleReset}>
            Reset
          </button>
        </div>
      </div>
    </MotionConfig>
  )
}

export default App
