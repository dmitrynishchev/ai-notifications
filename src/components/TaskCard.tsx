import { useRef, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import type { Task } from '../types'
import { Checkbox } from './Checkbox'
import './TaskCard.css'

interface TaskCardProps {
  task: Task
  onToggle: (id: string) => void
  onEditTitle: (id: string, value: string) => void
  onEditDescription: (id: string, value: string) => void
  onPointerDown?: (e: React.PointerEvent) => void
}

function AutoTextarea({
  className,
  value,
  onChange,
}: {
  className: string
  value: string
  onChange: (value: string) => void
}) {
  const ref = useRef<HTMLTextAreaElement>(null)

  const resize = useCallback(() => {
    const el = ref.current
    if (!el) return
    el.style.height = '0'
    el.style.height = `${el.scrollHeight}px`
  }, [])

  useEffect(resize, [value, resize])

  return (
    <textarea
      ref={ref}
      className={className}
      value={value}
      rows={1}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

export function TaskCard({ task, onToggle, onEditTitle, onEditDescription, onPointerDown }: TaskCardProps) {
  const isEditable = task.status === 'idle' || task.status === 'selected'
  const isDone = task.status === 'done'
  return (
    <motion.div
      className={`task-card ${isDone ? 'task-card--done' : ''} ${isEditable ? 'task-card--draggable' : ''}`}
      exit={{ opacity: 0, y: -10, transition: { duration: 0.2 } }}
      transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
      onPointerDown={isEditable ? onPointerDown : undefined}
    >
      <Checkbox status={task.status} onClick={() => onToggle(task.id)} />
      <div className="task-card-content">
        {isEditable ? (
          <>
            <AutoTextarea
              className="task-card-title task-card-input task-card-textarea"
              value={task.title}
              onChange={(val) => onEditTitle(task.id, val)}
            />
            <AutoTextarea
              className="task-card-description task-card-input task-card-textarea"
              value={task.description}
              onChange={(val) => onEditDescription(task.id, val)}
            />
          </>
        ) : (
          <>
            <p className={`task-card-title ${isDone ? 'task-card-title--done' : ''}`}>
              {task.title}
            </p>
            <p className={`task-card-description ${isDone ? 'task-card-description--done' : ''}`}>
              {task.description}
            </p>
          </>
        )}
      </div>
    </motion.div>
  )
}
