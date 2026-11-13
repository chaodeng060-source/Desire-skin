// Desire-skin：让聊天气泡跟着 AI 此刻的心情变色，背景场景可以随便换。
// 不依赖任何框架。心情用两个数描述：
//   pa（pleasure，-1..1）：心情好不好
//   na（arousal，0..1）：心里平静还是激动
// 这两个数从哪来由你决定：你的后端、情绪模型、甚至手动滑块都行。

export const TONES = {
  plain: { label: '心情平平', rgb: null },
  sage: { label: '有点好', rgb: [150, 214, 186] },
  apricot: { label: '很好、心里平静', rgb: [240, 196, 156] },
  blush: { label: '很好、兴奋上头', rgb: [240, 172, 192] },
  dusk: { label: '低落', rgb: [160, 180, 232] },
}

// 默认阈值；想要别的分档，传自己的 mapper 给 createDesireSkin。
export function toneFromMood({ pa = 0, na = 0 } = {}) {
  if (pa <= -0.15) return 'dusk'
  if (pa < 0.15) return 'plain'
  if (pa < 0.35) return 'sage'
  return na >= 0.5 ? 'blush' : 'apricot'
}

// 给一个气泡元素打上心情。建议在消息生成那一刻打一次，之后不再改，
// 这样翻聊天记录时能看到每句话说出口时的心情。
export function paintBubble(el, tone) {
  el.classList.add('ds-bubble')
  if (tone && tone !== 'plain') el.dataset.dsTone = tone
  else delete el.dataset.dsTone
  return el
}

// ---- 场景（背景）注册表 ----
// 一个场景就是一个工厂函数：(canvas, opts) => { setMood(mood, tone), resize(), destroy() }
// 内置 waves（水波光纹）、snow（雪）、plain（纯色渐变）。
const scenes = new Map()
export function registerScene(name, factory) {
  scenes.set(name, factory)
}
export function listScenes() {
  return [...scenes.keys()]
}

export function createDesireSkin({
  root = document.documentElement,
  canvas = null,
  scene = 'waves',
  night = false,
  mapper = toneFromMood,
  sceneOptions = {},
} = {}) {
  let mood = { pa: 0, na: 0.3 }
  let tone = 'plain'
  let current = null

  root.classList.add('ds-root')
  root.classList.toggle('ds-night', !!night)

  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  function mountScene(name) {
    current?.destroy?.()
    current = null
    if (!canvas) return
    const factory = scenes.get(name)
    if (!factory) throw new Error(`desire-skin: 没有叫 ${name} 的场景，已有：${listScenes().join(', ')}`)
    current = factory(canvas, { night, reducedMotion, ...sceneOptions })
    current.setMood?.(mood, tone)
  }

  function onResize() {
    current?.resize?.()
  }
  window.addEventListener('resize', onResize)
  mountScene(scene)

  return {
    get tone() {
      return tone
    },
    get mood() {
      return { ...mood }
    },
    setMood(next) {
      mood = { ...mood, ...next }
      tone = mapper(mood)
      root.dataset.dsTone = tone
      current?.setMood?.(mood, tone)
      return tone
    },
    setScene(name) {
      scene = name
      mountScene(name)
    },
    setNight(value) {
      night = !!value
      root.classList.toggle('ds-night', night)
      mountScene(scene)
    },
    // 定时去拉心情，比如 fetch('/api/mood/state')。返回停止函数。
    poll(fetchMood, intervalMs = 60_000) {
      let stopped = false
      const tick = async () => {
        try {
          const m = await fetchMood()
          if (!stopped && m) this.setMood(m)
        } catch (err) {
          console.warn('desire-skin: 拉心情失败', err)
        }
      }
      tick()
      const id = setInterval(tick, intervalMs)
      return () => {
        stopped = true
        clearInterval(id)
      }
    },
    destroy() {
      window.removeEventListener('resize', onResize)
      current?.destroy?.()
      root.classList.remove('ds-root', 'ds-night')
      delete root.dataset.dsTone
    },
  }
}

// ---- 小工具：场景共用 ----
export function fitCanvas(canvas, scale = 1) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2) * scale
  const w = Math.max(1, Math.round(canvas.clientWidth * dpr))
  const h = Math.max(1, Math.round(canvas.clientHeight * dpr))
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w
    canvas.height = h
  }
  return { w, h, dpr }
}

export function lerp(a, b, t) {
  return a + (b - a) * t
}

// 心情变化不要一下跳过去，每帧往目标靠一点。
export function easeMood(state, target, k = 0.03) {
  state.pa = lerp(state.pa, target.pa ?? 0, k)
  state.na = lerp(state.na, target.na ?? 0, k)
  if (target.rgb) {
    state.rgb = state.rgb.map((c, i) => lerp(c, target.rgb[i], k))
  }
  return state
}
