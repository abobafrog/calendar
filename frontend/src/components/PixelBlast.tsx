import { Effect, EffectComposer, EffectPass, RenderPass } from 'postprocessing'
import { useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import * as THREE from 'three'
import './PixelBlast.css'

type PixelVariant = 'square' | 'circle' | 'triangle' | 'diamond'

interface PixelBlastProps {
  variant?: PixelVariant
  pixelSize?: number
  color?: string
  className?: string
  style?: CSSProperties
  antialias?: boolean
  patternScale?: number
  patternDensity?: number
  liquid?: boolean
  liquidStrength?: number
  liquidRadius?: number
  pixelSizeJitter?: number
  enableRipples?: boolean
  rippleIntensityScale?: number
  rippleThickness?: number
  rippleSpeed?: number
  liquidWobbleSpeed?: number
  autoPauseOffscreen?: boolean
  speed?: number
  transparent?: boolean
  edgeFade?: number
  noiseAmount?: number
}

interface TouchPoint {
  x: number
  y: number
  age: number
  force: number
  vx: number
  vy: number
}

interface TouchTexture {
  texture: THREE.Texture
  addTouch: (norm: { x: number; y: number }) => void
  update: () => void
  radiusScale: number
}

interface PixelBlastState {
  renderer: THREE.WebGLRenderer
  material: THREE.ShaderMaterial
  clock: THREE.Clock
  clickIx: number
  uniforms: PixelUniforms
  resizeObserver: ResizeObserver
  raf: number
  quad: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>
  composer?: EffectComposer
  touch?: TouchTexture
  liquidEffect?: Effect
  cleanupEvents: () => void
}

interface PixelUniforms {
  [uniform: string]: THREE.IUniform
  uResolution: { value: THREE.Vector2 }
  uTime: { value: number }
  uColor: { value: THREE.Color }
  uClickPos: { value: THREE.Vector2[] }
  uClickTimes: { value: Float32Array }
  uShapeType: { value: number }
  uPixelSize: { value: number }
  uScale: { value: number }
  uDensity: { value: number }
  uPixelJitter: { value: number }
  uEnableRipples: { value: number }
  uRippleSpeed: { value: number }
  uRippleThickness: { value: number }
  uRippleIntensity: { value: number }
  uEdgeFade: { value: number }
}

const SHAPE_MAP: Record<PixelVariant, number> = {
  square: 0,
  circle: 1,
  triangle: 2,
  diamond: 3,
}

const MAX_CLICKS = 10

const VERTEX_SRC = `
void main() {
  gl_Position = vec4(position, 1.0);
}
`

const FRAGMENT_SRC = `
precision highp float;

uniform vec3  uColor;
uniform vec2  uResolution;
uniform float uTime;
uniform float uPixelSize;
uniform float uScale;
uniform float uDensity;
uniform float uPixelJitter;
uniform int   uEnableRipples;
uniform float uRippleSpeed;
uniform float uRippleThickness;
uniform float uRippleIntensity;
uniform float uEdgeFade;
uniform int   uShapeType;

const int SHAPE_CIRCLE   = 1;
const int SHAPE_TRIANGLE = 2;
const int SHAPE_DIAMOND  = 3;
const int MAX_CLICKS = 10;

uniform vec2  uClickPos[MAX_CLICKS];
uniform float uClickTimes[MAX_CLICKS];

out vec4 fragColor;

float Bayer2(vec2 a) {
  a = floor(a);
  return fract(a.x / 2. + a.y * a.y * .75);
}

#define Bayer4(a) (Bayer2(.5*(a))*0.25 + Bayer2(a))
#define Bayer8(a) (Bayer4(.5*(a))*0.25 + Bayer2(a))

float hash11(float n){ return fract(sin(n)*43758.5453); }

float vnoise(vec3 p){
  vec3 ip = floor(p);
  vec3 fp = fract(p);
  float n000 = hash11(dot(ip + vec3(0.0,0.0,0.0), vec3(1.0,57.0,113.0)));
  float n100 = hash11(dot(ip + vec3(1.0,0.0,0.0), vec3(1.0,57.0,113.0)));
  float n010 = hash11(dot(ip + vec3(0.0,1.0,0.0), vec3(1.0,57.0,113.0)));
  float n110 = hash11(dot(ip + vec3(1.0,1.0,0.0), vec3(1.0,57.0,113.0)));
  float n001 = hash11(dot(ip + vec3(0.0,0.0,1.0), vec3(1.0,57.0,113.0)));
  float n101 = hash11(dot(ip + vec3(1.0,0.0,1.0), vec3(1.0,57.0,113.0)));
  float n011 = hash11(dot(ip + vec3(0.0,1.0,1.0), vec3(1.0,57.0,113.0)));
  float n111 = hash11(dot(ip + vec3(1.0,1.0,1.0), vec3(1.0,57.0,113.0)));
  vec3 w = fp*fp*fp*(fp*(fp*6.0-15.0)+10.0);
  float x00 = mix(n000, n100, w.x);
  float x10 = mix(n010, n110, w.x);
  float x01 = mix(n001, n101, w.x);
  float x11 = mix(n011, n111, w.x);
  float y0  = mix(x00, x10, w.y);
  float y1  = mix(x01, x11, w.y);
  return mix(y0, y1, w.z) * 2.0 - 1.0;
}

float fbm2(vec2 uv, float t){
  vec3 p = vec3(uv * uScale, t);
  float amp = 1.0;
  float freq = 1.0;
  float sum = 1.0;
  for (int i = 0; i < 5; ++i){
    sum  += amp * vnoise(p * freq);
    freq *= 1.25;
    amp  *= 1.0;
  }
  return sum * 0.5 + 0.5;
}

float maskCircle(vec2 p, float cov){
  float r = sqrt(cov) * .25;
  float d = length(p - 0.5) - r;
  float aa = 0.5 * fwidth(d);
  return cov * (1.0 - smoothstep(-aa, aa, d * 2.0));
}

float maskTriangle(vec2 p, vec2 id, float cov){
  bool flip = mod(id.x + id.y, 2.0) > 0.5;
  if (flip) p.x = 1.0 - p.x;
  float r = sqrt(cov);
  float d  = p.y - r*(1.0 - p.x);
  float aa = fwidth(d);
  return cov * clamp(0.5 - d/aa, 0.0, 1.0);
}

float maskDiamond(vec2 p, float cov){
  float r = sqrt(cov) * 0.564;
  return step(abs(p.x - 0.49) + abs(p.y - 0.49), r);
}

void main(){
  float pixelSize = uPixelSize;
  vec2 fragCoord = gl_FragCoord.xy - uResolution * .5;
  float aspectRatio = uResolution.x / uResolution.y;
  vec2 pixelId = floor(fragCoord / pixelSize);
  vec2 pixelUV = fract(fragCoord / pixelSize);
  float cellPixelSize = 8.0 * pixelSize;
  vec2 cellId = floor(fragCoord / cellPixelSize);
  vec2 cellCoord = cellId * cellPixelSize;
  vec2 uv = cellCoord / uResolution * vec2(aspectRatio, 1.0);
  float base = fbm2(uv, uTime * 0.05);
  base = base * 0.5 - 0.65;
  float feed = base + (uDensity - 0.5) * 0.3;

  if (uEnableRipples == 1) {
    for (int i = 0; i < MAX_CLICKS; ++i){
      vec2 pos = uClickPos[i];
      if (pos.x < 0.0) continue;
      vec2 cuv = (((pos - uResolution * .5 - cellPixelSize * .5) / uResolution)) * vec2(aspectRatio, 1.0);
      float t = max(uTime - uClickTimes[i], 0.0);
      float r = distance(uv, cuv);
      float ring = exp(-pow((r - uRippleSpeed * t) / uRippleThickness, 2.0));
      float atten = exp(-1.0 * t) * exp(-10.0 * r);
      feed = max(feed, ring * atten * uRippleIntensity);
    }
  }

  float bayer = Bayer8(fragCoord / uPixelSize) - 0.5;
  float bw = step(0.5, feed + bayer);
  float h = fract(sin(dot(floor(fragCoord / uPixelSize), vec2(127.1, 311.7))) * 43758.5453);
  float coverage = bw * (1.0 + (h - 0.5) * uPixelJitter);
  float M;
  if      (uShapeType == SHAPE_CIRCLE)   M = maskCircle(pixelUV, coverage);
  else if (uShapeType == SHAPE_TRIANGLE) M = maskTriangle(pixelUV, pixelId, coverage);
  else if (uShapeType == SHAPE_DIAMOND)  M = maskDiamond(pixelUV, coverage);
  else                                   M = coverage;

  if (uEdgeFade > 0.0) {
    vec2 norm = gl_FragCoord.xy / uResolution;
    float edge = min(min(norm.x, norm.y), min(1.0 - norm.x, 1.0 - norm.y));
    M *= smoothstep(0.0, uEdgeFade, edge);
  }

  vec3 srgbColor = mix(
    uColor * 12.92,
    1.055 * pow(uColor, vec3(1.0 / 2.4)) - 0.055,
    step(0.0031308, uColor)
  );
  fragColor = vec4(srgbColor, M);
}
`

function createTouchTexture(): TouchTexture {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D context not available')
  const texture = new THREE.Texture(canvas)
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.generateMipmaps = false
  const trail: TouchPoint[] = []
  let last: { x: number; y: number } | null = null
  let radius = 0.1 * size

  const clear = () => {
    ctx.fillStyle = 'black'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  const drawPoint = (point: TouchPoint) => {
    const pos = { x: point.x * size, y: (1 - point.y) * size }
    const early = point.age < 19
    const t = early ? point.age / 19 : 1 - (point.age - 19) / 45
    const intensity = Math.max(0, (early ? Math.sin((t * Math.PI) / 2) : -t * (t - 2)) * point.force)
    const color = `${((point.vx + 1) / 2) * 255}, ${((point.vy + 1) / 2) * 255}, ${intensity * 255}`
    const offset = size * 5
    ctx.shadowOffsetX = offset
    ctx.shadowOffsetY = offset
    ctx.shadowBlur = radius
    ctx.shadowColor = `rgba(${color},${0.22 * intensity})`
    ctx.beginPath()
    ctx.fillStyle = 'rgba(255,0,0,1)'
    ctx.arc(pos.x - offset, pos.y - offset, radius, 0, Math.PI * 2)
    ctx.fill()
  }

  clear()

  return {
    texture,
    addTouch(norm) {
      let force = 0
      let vx = 0
      let vy = 0
      if (last) {
        const dx = norm.x - last.x
        const dy = norm.y - last.y
        if (dx === 0 && dy === 0) return
        const d = Math.sqrt(dx * dx + dy * dy)
        vx = dx / (d || 1)
        vy = dy / (d || 1)
        force = Math.min((dx * dx + dy * dy) * 10000, 1)
      }
      last = { x: norm.x, y: norm.y }
      trail.push({ x: norm.x, y: norm.y, age: 0, force, vx, vy })
    },
    update() {
      clear()
      for (let i = trail.length - 1; i >= 0; i -= 1) {
        const point = trail[i]
        const f = point.force * (1 / 64) * (1 - point.age / 64)
        point.x += point.vx * f
        point.y += point.vy * f
        point.age += 1
        if (point.age > 64) trail.splice(i, 1)
      }
      trail.forEach(drawPoint)
      texture.needsUpdate = true
    },
    set radiusScale(value: number) {
      radius = 0.1 * size * value
    },
    get radiusScale() {
      return radius / (0.1 * size)
    },
  }
}

function createLiquidEffect(texture: THREE.Texture, opts: { strength: number; freq: number }) {
  return new Effect(
    'LiquidEffect',
    `
      uniform sampler2D uTexture;
      uniform float uStrength;
      uniform float uTime;
      uniform float uFreq;

      void mainUv(inout vec2 uv) {
        vec4 tex = texture2D(uTexture, uv);
        float intensity = tex.b;
        float wave = 0.5 + 0.5 * sin(uTime * uFreq + intensity * 6.2831853);
        uv += vec2(tex.r * 2.0 - 1.0, tex.g * 2.0 - 1.0) * uStrength * intensity * wave;
      }
    `,
    {
      uniforms: new Map<string, THREE.Uniform<unknown>>([
        ['uTexture', new THREE.Uniform(texture)],
        ['uStrength', new THREE.Uniform(opts.strength)],
        ['uTime', new THREE.Uniform(0)],
        ['uFreq', new THREE.Uniform(opts.freq)],
      ]),
    },
  )
}

function randomFloat() {
  if (window.crypto?.getRandomValues) {
    const u32 = new Uint32Array(1)
    window.crypto.getRandomValues(u32)
    return u32[0] / 0xffffffff
  }
  return Math.random()
}

export function PixelBlast({
  variant = 'square',
  pixelSize = 3,
  color = '#B497CF',
  className,
  style,
  antialias = true,
  patternScale = 2,
  patternDensity = 1,
  liquid = false,
  liquidStrength = 0.1,
  liquidRadius = 1,
  pixelSizeJitter = 0,
  enableRipples = true,
  rippleIntensityScale = 1,
  rippleThickness = 0.1,
  rippleSpeed = 0.3,
  liquidWobbleSpeed = 4.5,
  autoPauseOffscreen = true,
  speed = 0.5,
  transparent = true,
  edgeFade = 0.5,
  noiseAmount = 0,
}: PixelBlastProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const stateRef = useRef<PixelBlastState | null>(null)
  const visibleRef = useRef(true)
  const speedRef = useRef(speed)
  const previousConfigRef = useRef<{ antialias: boolean; liquid: boolean; noiseAmount: number } | null>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      visibleRef.current = entry?.isIntersecting ?? true
    })
    const container = containerRef.current
    if (container) observer.observe(container)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    speedRef.current = speed
    const nextConfig = { antialias, liquid, noiseAmount }
    const shouldReinit =
      !stateRef.current ||
      !previousConfigRef.current ||
      previousConfigRef.current.antialias !== nextConfig.antialias ||
      previousConfigRef.current.liquid !== nextConfig.liquid ||
      previousConfigRef.current.noiseAmount !== nextConfig.noiseAmount

    const disposeState = () => {
      const state = stateRef.current
      if (!state) return
      state.cleanupEvents()
      state.resizeObserver.disconnect()
      cancelAnimationFrame(state.raf)
      state.quad.geometry.dispose()
      state.material.dispose()
      state.composer?.dispose()
      state.renderer.dispose()
      state.renderer.forceContextLoss()
      if (state.renderer.domElement.parentElement === container) {
        container.removeChild(state.renderer.domElement)
      }
      stateRef.current = null
    }

    if (shouldReinit) {
      disposeState()
      const renderer = new THREE.WebGLRenderer({
        antialias,
        alpha: true,
        powerPreference: 'high-performance',
      })
      renderer.domElement.style.width = '100%'
      renderer.domElement.style.height = '100%'
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
      if (transparent) renderer.setClearAlpha(0)
      else renderer.setClearColor(0x000000, 1)
      container.appendChild(renderer.domElement)

      const uniforms: PixelUniforms = {
        uResolution: { value: new THREE.Vector2(0, 0) },
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(color) },
        uClickPos: { value: Array.from({ length: MAX_CLICKS }, () => new THREE.Vector2(-1, -1)) },
        uClickTimes: { value: new Float32Array(MAX_CLICKS) },
        uShapeType: { value: SHAPE_MAP[variant] },
        uPixelSize: { value: pixelSize * renderer.getPixelRatio() },
        uScale: { value: patternScale },
        uDensity: { value: patternDensity },
        uPixelJitter: { value: pixelSizeJitter },
        uEnableRipples: { value: enableRipples ? 1 : 0 },
        uRippleSpeed: { value: rippleSpeed },
        uRippleThickness: { value: rippleThickness },
        uRippleIntensity: { value: rippleIntensityScale },
        uEdgeFade: { value: edgeFade },
      }
      const scene = new THREE.Scene()
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
      const material = new THREE.ShaderMaterial({
        vertexShader: VERTEX_SRC,
        fragmentShader: FRAGMENT_SRC,
        uniforms,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        glslVersion: THREE.GLSL3,
      })
      const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material)
      scene.add(quad)
      const clock = new THREE.Clock()
      const resize = () => {
        const width = container.clientWidth || 1
        const height = container.clientHeight || 1
        renderer.setSize(width, height, false)
        uniforms.uResolution.value.set(renderer.domElement.width, renderer.domElement.height)
        uniforms.uPixelSize.value = pixelSize * renderer.getPixelRatio()
        stateRef.current?.composer?.setSize(renderer.domElement.width, renderer.domElement.height)
      }
      resize()
      const resizeObserver = new ResizeObserver(resize)
      resizeObserver.observe(container)

      let composer: EffectComposer | undefined
      let touch: TouchTexture | undefined
      let liquidEffect: Effect | undefined
      if (liquid) {
        touch = createTouchTexture()
        touch.radiusScale = liquidRadius
        composer = new EffectComposer(renderer)
        liquidEffect = createLiquidEffect(touch.texture, {
          strength: liquidStrength,
          freq: liquidWobbleSpeed,
        })
        const effectPass = new EffectPass(camera, liquidEffect)
        effectPass.renderToScreen = true
        composer.addPass(new RenderPass(scene, camera))
        composer.addPass(effectPass)
      }
      if (noiseAmount > 0) {
        composer ??= new EffectComposer(renderer)
        if (composer.passes.length === 0) composer.addPass(new RenderPass(scene, camera))
        const noiseEffect = new Effect(
          'NoiseEffect',
          `uniform float uTime; uniform float uAmount; float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453);} void mainUv(inout vec2 uv){} void mainImage(const in vec4 inputColor,const in vec2 uv,out vec4 outputColor){ float n=hash(floor(uv*vec2(1920.0,1080.0))+floor(uTime*60.0)); outputColor=inputColor+vec4(vec3((n-0.5)*uAmount),0.0);} `,
          {
            uniforms: new Map([
              ['uTime', new THREE.Uniform(0)],
              ['uAmount', new THREE.Uniform(noiseAmount)],
            ]),
          },
        )
        composer.passes.forEach((pass) => {
          pass.renderToScreen = false
        })
        const noisePass = new EffectPass(camera, noiseEffect)
        noisePass.renderToScreen = true
        composer.addPass(noisePass)
      }
      composer?.setSize(renderer.domElement.width, renderer.domElement.height)

      const mapToPixels = (event: PointerEvent) => {
        const rect = renderer.domElement.getBoundingClientRect()
        const scaleX = renderer.domElement.width / rect.width
        const scaleY = renderer.domElement.height / rect.height
        return {
          fx: (event.clientX - rect.left) * scaleX,
          fy: (rect.height - (event.clientY - rect.top)) * scaleY,
          width: renderer.domElement.width,
          height: renderer.domElement.height,
        }
      }
      const onPointerDown = (event: PointerEvent) => {
        const state = stateRef.current
        if (!state) return
        const { fx, fy } = mapToPixels(event)
        state.uniforms.uClickPos.value[state.clickIx].set(fx, fy)
        state.uniforms.uClickTimes.value[state.clickIx] = state.uniforms.uTime.value
        state.clickIx = (state.clickIx + 1) % MAX_CLICKS
      }
      const onPointerMove = (event: PointerEvent) => {
        const state = stateRef.current
        if (!state?.touch) return
        const { fx, fy, width, height } = mapToPixels(event)
        state.touch.addTouch({ x: fx / width, y: fy / height })
      }
      renderer.domElement.addEventListener('pointerdown', onPointerDown, { passive: true })
      renderer.domElement.addEventListener('pointermove', onPointerMove, { passive: true })

      const timeOffset = randomFloat() * 1000
      const animate = () => {
        const state = stateRef.current
        if (!state) return
        if (!autoPauseOffscreen || visibleRef.current) {
          state.uniforms.uTime.value = timeOffset + state.clock.getElapsedTime() * speedRef.current
          const liquidTime = state.liquidEffect?.uniforms.get('uTime')
          if (liquidTime) liquidTime.value = state.uniforms.uTime.value
          state.composer?.passes.forEach((pass) => {
            const effects = (pass as unknown as { effects?: Effect[] }).effects
            effects?.forEach((effect) => {
              const uniform = effect.uniforms?.get('uTime')
              if (uniform) uniform.value = state.uniforms.uTime.value
            })
          })
          state.touch?.update()
          if (state.composer) state.composer.render()
          else renderer.render(scene, camera)
        }
        state.raf = requestAnimationFrame(animate)
      }

      stateRef.current = {
        renderer,
        material,
        clock,
        clickIx: 0,
        uniforms,
        resizeObserver,
        raf: requestAnimationFrame(animate),
        quad,
        composer,
        touch,
        liquidEffect,
        cleanupEvents: () => {
          renderer.domElement.removeEventListener('pointerdown', onPointerDown)
          renderer.domElement.removeEventListener('pointermove', onPointerMove)
        },
      }
    } else {
      const state = stateRef.current
      if (state) {
        state.uniforms.uShapeType.value = SHAPE_MAP[variant]
        state.uniforms.uPixelSize.value = pixelSize * state.renderer.getPixelRatio()
        state.uniforms.uColor.value.set(color)
        state.uniforms.uScale.value = patternScale
        state.uniforms.uDensity.value = patternDensity
        state.uniforms.uPixelJitter.value = pixelSizeJitter
        state.uniforms.uEnableRipples.value = enableRipples ? 1 : 0
        state.uniforms.uRippleIntensity.value = rippleIntensityScale
        state.uniforms.uRippleThickness.value = rippleThickness
        state.uniforms.uRippleSpeed.value = rippleSpeed
        state.uniforms.uEdgeFade.value = edgeFade
        if (transparent) state.renderer.setClearAlpha(0)
        else state.renderer.setClearColor(0x000000, 1)
        const strength = state.liquidEffect?.uniforms.get('uStrength')
        if (strength) strength.value = liquidStrength
        const wobble = state.liquidEffect?.uniforms.get('uFreq')
        if (wobble) wobble.value = liquidWobbleSpeed
        if (state.touch) state.touch.radiusScale = liquidRadius
      }
    }
    previousConfigRef.current = nextConfig
    return () => {
      if (!shouldReinit) return
      disposeState()
    }
  }, [
    antialias,
    autoPauseOffscreen,
    color,
    edgeFade,
    enableRipples,
    liquid,
    liquidRadius,
    liquidStrength,
    liquidWobbleSpeed,
    noiseAmount,
    patternDensity,
    patternScale,
    pixelSize,
    pixelSizeJitter,
    rippleIntensityScale,
    rippleSpeed,
    rippleThickness,
    transparent,
    variant,
    speed,
  ])

  return (
    <div
      ref={containerRef}
      className={`pixel-blast-container ${className ?? ''}`}
      style={style}
      aria-hidden="true"
    />
  )
}
