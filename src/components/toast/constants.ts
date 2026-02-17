// Stacking transforms (collapsed)
export const SCALE_FACTORS = [1, 0.88, 0.77] as const
export const TRANSLATE_Y = [0, 8, 14] as const

// Card dimensions
export const CARD_WIDTH = 308
export const CARD_BORDER_RADIUS = [20, 17.6, 15.5] as const

// Animation timing
export const SPRING_DURATION = 350
export const EXIT_DURATION = 200
export const SPRING_EASING = 'cubic-bezier(0.2, 0, 0, 1)'
export const EXIT_EASING = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'

// Swipe thresholds
export const SWIPE_THRESHOLD = 100 // px
export const VELOCITY_THRESHOLD = 0.5 // px/ms
export const CLICK_THRESHOLD = 5 // px — below this, treat as click not swipe

// Header
export const HEADER_HEIGHT = 23
export const HEADER_GAP = 8

// Swipe exit
export const SWIPE_EXIT_DISTANCE = 400 // px

// Icon
export const ICON_BORDER_RADIUS = 8

// Defaults
export const DEFAULT_DURATION = 5000
export const DEFAULT_VISIBLE_TOASTS = 3
export const DEFAULT_GAP = 6
export const DEFAULT_OFFSET = 16
export const DEFAULT_CARD_HEIGHT = 72
export const DEFAULT_CONTAINER_HEIGHT = 80
