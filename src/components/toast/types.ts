export type ToastPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'

export interface ToastOptions {
  title: string
  description?: string
  icon?: string
  duration?: number
  id?: string
  onDismiss?: (id: string) => void
}

export interface ToastData {
  id: string
  title: string
  description?: string
  icon?: string
  duration: number
  createdAt: number
  onDismiss?: (id: string) => void
}

export interface ToasterProps {
  position?: ToastPosition
  visibleToasts?: number
  gap?: number
  offset?: number | string
  duration?: number
  title?: string
}

export interface ToastState {
  toasts: ToastData[]
  expanded: boolean
}
