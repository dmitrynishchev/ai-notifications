import { motion } from 'framer-motion'
import type { Task } from '../types'
import { EASE_IN_OUT } from '../animation'
import { Checkbox } from './Checkbox'
import './TaskCard.css'

interface TaskCardProps {
  task: Task
  onToggle: (id: string) => void
  onPointerDown?: (e: React.PointerEvent) => void
}

export function TaskCard({ task, onToggle, onPointerDown }: TaskCardProps) {
  const isDraggable = task.status === 'idle' || task.status === 'selected'
  const isDone = task.status === 'done'
  return (
    <motion.div
      className={`task-card ${isDone ? 'task-card--done' : ''} ${isDraggable ? 'task-card--draggable' : ''}`}
      transition={{ duration: 0.25, ease: EASE_IN_OUT }}
      onPointerDown={isDraggable ? onPointerDown : undefined}
    >
      <Checkbox status={task.status} onClick={() => onToggle(task.id)} />
      <div className="task-card-content">
        <p className={`task-card-title ${isDone ? 'task-card-title--done' : ''}`}>
          {task.title}
        </p>
        <p className={`task-card-description ${isDone ? 'task-card-description--done' : ''}`}>
          {task.description}
        </p>
      </div>
    </motion.div>
  )
}
