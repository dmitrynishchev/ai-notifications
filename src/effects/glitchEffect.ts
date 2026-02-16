/**
 * Particle dissolution effect.
 * Creates a <canvas> overlay, spawns a grid of particles
 * that detach bottom-to-top in a wave, burst outward, and fall under gravity.
 */

export interface GlitchEffectOptions {
  rect: DOMRect
  duration?: number
  onComplete: () => void
}

interface Particle {
  /** current position (canvas-local, includes padding offset) */
  x: number
  y: number
  /** velocity */
  vx: number
  vy: number
  /** particle side length (px) */
  size: number
  /** current opacity */
  alpha: number
  /** fill colour */
  color: string
  /** normalised row position 0..1 (bottom=0, top=1) — wave delay */
  rowNorm: number
  /** has this particle "detached" yet? */
  free: boolean
}

const GRAVITY = 600
const CELL = 2
const BASE_DURATION = 1200

export function runGlitchEffect({
  rect,
  duration = BASE_DURATION,
  onComplete,
}: GlitchEffectOptions): () => void {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (prefersReduced) {
    setTimeout(onComplete, 50)
    return () => {}
  }

  const dpr = window.devicePixelRatio || 1

  // full-viewport canvas — particles visible regardless of drag direction
  const canvasLogicalW = window.innerWidth
  const canvasLogicalH = window.innerHeight

  const canvas = document.createElement('canvas')
  canvas.width = canvasLogicalW * dpr
  canvas.height = canvasLogicalH * dpr
  canvas.style.cssText = `
    position: fixed;
    left: 0;
    top: 0;
    width: ${canvasLogicalW}px;
    height: ${canvasLogicalH}px;
    z-index: 10001;
    pointer-events: none;
  `
  document.body.appendChild(canvas)

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    setTimeout(() => { canvas.remove(); onComplete() }, duration)
    return () => { canvas.remove() }
  }

  ctx.scale(dpr, dpr)

  // particle grid offset = card's absolute viewport position
  const offsetX = rect.left
  const offsetY = rect.top

  // --- build particle grid ---
  const cols = Math.ceil(rect.width / CELL)
  const rows = Math.ceil(rect.height / CELL)
  const particles: Particle[] = []

  for (let r = 0; r < rows; r++) {
    // inverted: bottom rows = 0 (free first), top rows = 1 (free last)
    const rowNorm = 1 - r / (rows - 1 || 1)
    for (let c = 0; c < cols; c++) {
      const x = offsetX + c * CELL + CELL / 2
      const y = offsetY + r * CELL + CELL / 2

      const base = 230 + Math.random() * 20
      const color = `rgb(${base}, ${base}, ${base})`

      particles.push({
        x,
        y,
        vx: 0,
        vy: 0,
        size: 0.5 + Math.random() * 1.0,
        alpha: 0, // invisible until freed
        rowNorm,
        color,
        free: false,
      })
    }
  }

  // --- animation ---
  let cancelled = false
  let rafId = 0
  const start = performance.now()
  let prevTime = start

  function frame(now: number) {
    if (cancelled) return
    const elapsed = now - start
    const dt = Math.min((now - prevTime) / 1000, 0.05)
    prevTime = now
    const progress = Math.min(elapsed / duration, 1)

    // wave front sweeps bottom→top over first 50% of duration
    const waveFront = Math.min(progress / 0.5, 1)

    ctx!.clearRect(0, 0, canvasLogicalW, canvasLogicalH)

    let allInvisible = true

    for (const p of particles) {
      if (!p.free && p.rowNorm <= waveFront) {
        p.free = true
        p.alpha = 1
        // instant positional jitter — breaks grid alignment on first visible frame
        p.x += (Math.random() - 0.5) * 6
        p.y += (Math.random() - 0.5) * 6
        // burst velocity
        p.vx = (Math.random() - 0.5) * 200
        p.vy = -(60 + Math.random() * 120) // strong upward kick
        if (Math.random() < 0.15) {
          p.vy += 80 + Math.random() * 60 // some fly down for variety
        }
      }

      // only draw freed particles — no rectangular card ghost
      if (!p.free) continue

      // physics
      p.vy += GRAVITY * dt
      p.vx *= 0.993
      p.x += p.vx * dt
      p.y += p.vy * dt

      // fade in last 20% of duration
      const timeFade = progress > 0.8 ? 1 - (progress - 0.8) / 0.2 : 1
      p.alpha = Math.max(timeFade, 0)

      if (p.alpha > 0.01) {
        allInvisible = false
        ctx!.globalAlpha = p.alpha
        ctx!.fillStyle = p.color
        ctx!.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size)
      }
    }

    if (progress < 1 && !allInvisible) {
      rafId = requestAnimationFrame(frame)
    } else {
      cleanup()
      onComplete()
    }
  }

  rafId = requestAnimationFrame(frame)

  function cleanup() {
    cancelled = true
    cancelAnimationFrame(rafId)
    canvas.remove()
  }

  return () => {
    if (!cancelled) cleanup()
  }
}
