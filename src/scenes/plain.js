// 纯色渐变：最省电的场景，背景只是一层很淡、跟着心情慢慢变的渐变。
// 也是自己写场景的最小例子。
import { registerScene, fitCanvas, easeMood, TONES } from '../desire-skin.js'

registerScene('plain', (canvas, { night = false } = {}) => {
  const ctx = canvas.getContext('2d')
  const base = night ? [20, 26, 30] : [244, 246, 244]
  const state = { pa: 0, na: 0, rgb: [...base] }
  let target = { pa: 0, na: 0, rgb: base }
  let raf = 0

  function draw() {
    easeMood(state, target, 0.05)
    const { w, h } = fitCanvas(canvas)
    const g = ctx.createLinearGradient(0, 0, w, h)
    g.addColorStop(0, `rgb(${base.join(',')})`)
    g.addColorStop(1, `rgb(${state.rgb.map(Math.round).join(',')})`)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
    const done = state.rgb.every((c, i) => Math.abs(c - target.rgb[i]) < 0.5)
    raf = done ? 0 : requestAnimationFrame(draw)
  }

  return {
    setMood(mood, tone) {
      const rgb = TONES[tone]?.rgb
      target = { ...mood, rgb: rgb ? base.map((c, i) => c + (rgb[i] - c) * (night ? 0.25 : 0.35)) : base }
      if (!raf) raf = requestAnimationFrame(draw)
    },
    resize() {
      if (!raf) raf = requestAnimationFrame(draw)
    },
    destroy() {
      cancelAnimationFrame(raf)
    },
  }
})
