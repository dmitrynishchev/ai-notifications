import { createPortal } from 'react-dom'
import type { DragState } from '../hooks/useDragToDelete'
import './DragOverlay.css'

interface DragOverlayProps {
  dragState: DragState
}

export function DragOverlay({ dragState }: DragOverlayProps) {
  if (!dragState.isDragging || !dragState.cardRect) return null

  const x = dragState.isSnappingBack
    ? dragState.cardRect.left
    : dragState.cursorX - dragState.offsetX
  const y = dragState.isSnappingBack
    ? dragState.cardRect.top
    : dragState.cursorY - dragState.offsetY

  return createPortal(
    <div
      className={`drag-overlay${dragState.isSnappingBack ? ' drag-overlay--snapping' : ''}${dragState.isOutside ? ' drag-overlay--outside' : ''}`}
      style={{
        width: dragState.cardRect.width,
        height: dragState.cardRect.height,
        transform: `translate3d(${x}px, ${y}px, 0)`,
      }}
    >
      <div className="drag-overlay-content">
        <span className="drag-overlay-icon">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M4 5.5H14" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M6.5 5.5V4A1.5 1.5 0 018 2.5H10A1.5 1.5 0 0111.5 4V5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M13 5.5V14A1.5 1.5 0 0111.5 15.5H6.5A1.5 1.5 0 015 14V5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <div className="drag-overlay-text">
          <span className="drag-overlay-title">Drag further to discard</span>
          <span className="drag-overlay-subtitle">The task will be saved in the archive</span>
        </div>
      </div>
    </div>,
    document.body
  )
}
