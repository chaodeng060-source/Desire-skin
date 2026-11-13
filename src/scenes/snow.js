// 雪：冷色天空，雪花慢慢落。
// 心情好 → 天更亮、雪花带一点心情色的光；激动 → 落得快、雪更密；低落 → 天色发暗、雪下得沉。
import { registerScene, fitCanvas, easeMood, TONES } from '../desire-skin.js'

const DAY = { top: [184, 204, 230], bottom: [240, 228, 232], flake: [255, 255, 255] }
const NIGHT = { top: [14, 22, 44], bottom: [44, 48, 78], flake: [236, 240, 255] }

registerScene('snow', (canvas, { night = false, reducedMotion = false, count = 140, palette } = {}) => {
  const pal = palette || (night ? NIGHT : DAY)
  const ctx = canvas.getContext('2d')
  const state = { pa: 0, na: 0.3, rgb: [...pal.flake] }
  let target = { pa: 0, na: 0.3, rgb: pal.flake }
  let flakes = []
  let raf = 0
  let last = performance.now()
  let size = { w: 1, h: 1, dpr: 1 }

  function seed() {
    flakes = Array.from({ length: count }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.6 + Math.random() * 2.4,
      sway: Math.random() * Math.PI * 2,
      depth: 0.3 + Math.random() * 0.7,
    }))
  }

  function resize() {
    size = fitCanvas(canvas)
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    easeMood(state, target)
    const { w, h, dpr } = size
    const dim = 1 - Math.max(0, -state.pa) * 0.35 + Math.max(0, state.pa) * 0.05
    const g = ctx.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, `rgb(${pal.top.map(c => c * dim).join(',')})`)
    g.addColorStop(1, `rgb(${pal.bottom.map(c => c * dim).join(',')})`)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)

    const visible = Math.round(flakes.length * (0.45 + state.na * 0.55))
    const fall = 0.035 + state.na * 0.07
    const glow = 2 + Math.max(0, state.pa) * 6
    for (let i = 0; i < visible; i++) {
      const f = flakes[i]
      f.y += fall * f.depth * dt * (1 + f.r * 0.15)
      f.sway += dt * (0.6 + state.na)
      if (f.y > 1.02) {
        f.y = -0.02
        f.x = Math.random()
      }
      const x = (f.x + Math.sin(f.sway) * 0.01) * w
      const y = f.y * h
      ctx.beginPath()
      ctx.arc(x, y, f.r * dpr * (0.6 + f.depth), 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${state.rgb.map(Math.round).join(',')},${0.45 + f.depth * 0.5})`
      ctx.shadowColor = `rgba(${state.rgb.map(Math.round).join(',')},0.9)`
      ctx.shadowBlur = glow * dpr
      ctx.fill()
    }
    ctx.shadowBlur = 0
    if (!reducedMotion) raf = requestAnimationFrame(frame)
  }

  seed()
  resize()
  raf = requestAnimationFrame(frame)

  return {
    setMood(mood, tone) {
      const rgb = TONES[tone]?.rgb
      const mix = (c, i) => pal.flake[i] + ((rgb?.[i] ?? pal.flake[i]) - pal.flake[i]) * 0.5
      target = { pa: mood.pa ?? 0, na: mood.na ?? 0, rgb: pal.flake.map(mix) }
      if (reducedMotion) frame(performance.now())
    },
    resize,
    destroy() {
      cancelAnimationFrame(raf)
    },
  }
})
