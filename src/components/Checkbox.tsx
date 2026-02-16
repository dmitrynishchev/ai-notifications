import { motion, AnimatePresence } from 'framer-motion'
import type { Task } from '../types'
import { EASE_OUT } from '../animation'
import './Checkbox.css'

interface CheckboxProps {
  status: Task['status']
  onClick?: () => void
}

const BLUR_TRANSITION = {
  duration: 0.2,
  ease: EASE_OUT,
}

export function Checkbox({ status, onClick }: CheckboxProps) {
  const isClickable = status === 'idle' || status === 'selected'

  // When selected exits toward queued → blur-fade; toward idle → instant
  const blurOnExit = status !== 'idle'

  return (
    <motion.button
      className={`checkbox checkbox--${status}`}
      onClick={isClickable ? onClick : undefined}
      style={{ cursor: isClickable ? 'pointer' : 'default' }}
      whileTap={isClickable ? { scale: 0.92 } : undefined}
      transition={{ duration: 0.15, ease: EASE_OUT }}
    >
      {status === 'idle' && (
        <span className="checkbox-sf checkbox-sf--idle">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </span>
      )}

      <AnimatePresence custom={blurOnExit}>
        {status === 'selected' && (
          <motion.span
            key="selected"
            className="checkbox-icon"
            variants={{
              show: { opacity: 1 },
              exit: (blur: boolean) =>
                blur
                  ? { opacity: 0, transition: BLUR_TRANSITION }
                  : { opacity: 0, transition: { duration: 0 } },
            }}
            initial="show"
            animate="show"
            exit="exit"
          >
            <span className="checkbox-sf">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="8" fill="currentColor" />
                <path d="M4.5 8.5L7 11L11.5 5.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </motion.span>
        )}
        {status === 'queued' && (
          <motion.span
            key="queued"
            className="checkbox-icon"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={BLUR_TRANSITION}
          >
            <span className="checkbox-queued">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8H12.5M9 4.5L12.5 8L9 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </motion.span>
        )}
      </AnimatePresence>

      {status === 'running' && (
        <div className="checkbox-spinner">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="8.5" stroke="rgba(0,0,0,0.1)" strokeWidth="2" />
            <path
              d="M10 1.5A8.5 8.5 0 0 1 18.5 10"
              stroke="rgba(0,0,0,0.5)"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
      )}
      {status === 'done' && (
        <span className="checkbox-sf checkbox-sf--done">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="8" fill="currentColor" />
            <path d="M4.5 8.5L7 11L11.5 5.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      )}
    </motion.button>
  )
}
