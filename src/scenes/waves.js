// 水波光纹：玉色的水，水底一层慢慢流动的光纹（焦散）。
// 心情好 → 水更亮、光纹更清楚；激动 → 流得快一点；低落 → 发灰、偏冷、慢。
// 光纹会带一点当前心情的颜色，水本身的颜色不变。
import { registerScene, fitCanvas, easeMood, TONES } from '../desire-skin.js'

const DAY = { deep: [150, 198, 178], shallow: [226, 242, 234], light: [255, 255, 246] }
const NIGHT = { deep: [8, 26, 22], shallow: [26, 64, 54], light: [210, 236, 220] }

registerScene('waves', (canvas, { night = false, reducedMotion = false, resolution = 0.3, palette } = {}) => {
  const pal = palette || (night ? NIGHT : DAY)
  const ctx = canvas.getContext('2d')
  const off = document.createElement('canvas')
  const octx = off.getContext('2d')
  const state = { pa: 0, na: 0.3, rgb: [...pal.light] }
  let target = { pa: 0, na: 0.3, rgb: pal.light }
  let t = Math.random() * 100
  let raf = 0
  let last = performance.now()
  let img = null

  function resize() {
    fitCanvas(canvas)
    off.width = Math.max(32, Math.round(canvas.clientWidth * resolution))
    off.height = Math.max(32, Math.round(canvas.clientHeight * resolution))
    img = octx.createImageData(off.width, off.height)
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    easeMood(state, target)
    const speed = 0.25 + state.na * 0.55 + Math.max(0, state.pa) * 0.1
    t += dt * speed

    const W = off.width
    const H = off.height
    const d = img.data
    const bright = 0.9 + state.pa * 0.1
    const gray = Math.max(0, -state.pa) * 0.9
    const sharp = 10 + Math.max(0, state.pa) * 8
    const glow = 0.28 + Math.max(0, state.pa) * 0.22
    for (let y = 0; y < H; y++) {
      const v = y / H
      for (let x = 0; x < W; x++) {
        const u = x / W
        // 几层斜向正弦叠在一起，取接近 0 的地方当成亮线，就是水底的光纹。
        const a = Math.sin(u * 15.0 + v * 7.0 + t * 1.3) + Math.sin(u * -9.0 + v * 17.0 - t * 1.1)
        const b = Math.sin((u + v) * 12.0 + t * 0.7 + a * 0.9)
        let c = 1 - Math.min(1, Math.abs(a * 0.5 + b * 0.6))
        c = Math.pow(c, sharp)
        const i = (y * W + x) * 4
        for (let k = 0; k < 3; k++) {
          const base = pal.deep[k] + (pal.shallow[k] - pal.deep[k]) * (1 - v * 0.75)
          let col = base * bright + (state.rgb[k] - base * bright) * c * glow
          const g = (base + state.rgb[k] * c * 0.3) * 0.5 + 60
          col = col + (g - col) * gray * 0.5
          d[i + k] = col
        }
        d[i + 3] = 255
      }
    }
    octx.putImageData(img, 0, 0)
    ctx.imageSmoothingEnabled = true
    ctx.drawImage(off, 0, 0, canvas.width, canvas.height)
    if (!reducedMotion) raf = requestAnimationFrame(frame)
  }

  resize()
  raf = requestAnimationFrame(frame)

  return {
    setMood(mood, tone) {
      const rgb = TONES[tone]?.rgb
      // 光纹只带一点心情色，粉色不直接染进水里（粉压在玉色上会发灰发褐）。
      const mix = (c, i) => pal.light[i] + ((rgb?.[i] ?? pal.light[i]) - pal.light[i]) * 0.45
      target = { pa: mood.pa ?? 0, na: mood.na ?? 0, rgb: pal.light.map(mix) }
      if (reducedMotion) frame(performance.now())
    },
    resize,
    destroy() {
      cancelAnimationFrame(raf)
    },
  }
})
