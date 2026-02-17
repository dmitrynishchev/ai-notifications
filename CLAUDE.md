# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

iOS-style toast notification system built as a standalone React component. Custom state management (pub-sub with `useSyncExternalStore`), spring animations, swipe-to-dismiss gestures. Zero UI library dependencies.

## Commands

```bash
npm run dev      # Start Vite dev server
npm run build    # TypeScript check + Vite production build
npm run preview  # Preview production build
```

No tests, linters, or formatters configured.

## Architecture

### State Management (`src/components/toast/state.ts`)
Custom pub-sub store — global `state` object with listener subscriptions, exposed via `useSyncExternalStore`. No external state library.

### Public API (`src/components/toast/index.ts`)
```typescript
toast(options | string)  // Add toast, returns ID
toast.dismiss(id?)       // Dismiss by ID or all
```

### Component Hierarchy
- `Toaster` — positioned container, renders toast stack. Accepts `position` prop (6 variants: top/bottom × left/center/right)
- `ToastCard` — individual card with inline spring animations (not CSS keyframes), auto-dismiss timer
- `useSwipeGesture` hook — touch/mouse swipe handling with velocity detection

### Animation System (`src/components/toast/constants.ts`)
All animation values are constants: spring duration (350ms), exit duration (200ms), scale factors, translate offsets, swipe thresholds, swipe exit distance, icon border radius, default card/container heights. Stacked cards use calculated transforms for depth effect. `CARD_WIDTH` used in both `Toaster` and `ToastCard`.

### Interactions
- Click stack → expand; click outside → collapse
- Swipe left/right → dismiss with directional animation
- Auto-dismiss pauses while expanded

## Tech Stack

- React 19 + TypeScript 5.9 (strict mode)
- Vite 7 with `@vitejs/plugin-react`
- Tailwind CSS 4 (v4 architecture, via `@tailwindcss/vite` plugin)
- Inline styles for complex animations (boxShadow, transforms), Tailwind for layout/utilities/colors

## Deploy

Vercel — auto-detects Vite. Push to GitHub, connect repo in Vercel dashboard. No special config needed (`base` defaults to `/`).
