import { DEFAULT_DURATION } from './constants'
import type { ToastData, ToastOptions, ToastState } from './types'

let counter = 0
const genId = () => `toast-${++counter}`

let state: ToastState = {
  toasts: [],
  expanded: false,
}

const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) {
    listener()
  }
}

function setState(updater: (prev: ToastState) => ToastState) {
  state = updater(state)
  emit()
}

// --- Public API ---

export function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getSnapshot(): ToastState {
  return state
}

function addToast(options: ToastOptions | string, defaultDuration: number = DEFAULT_DURATION): string {
  const opts: ToastOptions = typeof options === 'string' ? { title: options } : options
  const id = opts.id ?? genId()

  const data: ToastData = {
    id,
    title: opts.title,
    description: opts.description,
    icon: opts.icon,
    duration: opts.duration ?? defaultDuration,
    createdAt: Date.now(),
    onDismiss: opts.onDismiss,
  }

  setState((prev) => ({
    ...prev,
    toasts: [data, ...prev.toasts],
  }))

  return id
}

export function dismissToast(id?: string) {
  if (id === undefined) {
    // dismiss all
    setState((prev) => ({
      ...prev,
      toasts: [],
      expanded: false,
    }))
  } else {
    setState((prev) => ({
      ...prev,
      toasts: prev.toasts.filter((t) => t.id !== id),
      expanded: prev.toasts.filter((t) => t.id !== id).length <= 1 ? false : prev.expanded,
    }))
  }
}

export function setExpanded(expanded: boolean) {
  setState((prev) => ({ ...prev, expanded }))
}

// --- toast() function ---

type ToastFn = {
  (options: ToastOptions | string): string
  dismiss: (id?: string) => void
}

export const toast: ToastFn = Object.assign(
  (options: ToastOptions | string) => addToast(options),
  { dismiss: dismissToast },
)

