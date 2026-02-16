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
        <span className="drag-overlay-icon">􀈑</span>
        <div className="drag-overlay-text">
          <span className="drag-overlay-title">Drag further to discard</span>
          <span className="drag-overlay-subtitle">The task will be saved in the archive</span>
        </div>
      </div>
    </div>,
    document.body
  )
}
