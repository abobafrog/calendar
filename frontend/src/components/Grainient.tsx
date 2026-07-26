import { Mesh, Program, Renderer, Triangle } from 'ogl'
import { useEffect, useRef } from 'react'
import './Grainient.css'

interface GrainientProps {
  timeSpeed?: number
  colorBalance?: number
  warpStrength?: number
  warpFrequency?: number
  warpSpeed?: number
  warpAmplitude?: number
  blendAngle?: number
  blendSoftness?: number
  rotationAmount?: number
  noiseScale?: number
  grainAmount?: number
  grainScale?: number
  grainAnimated?: boolean
  contrast?: number
  gamma?: number
  saturation?: number
  centerX?: number
  centerY?: number
  zoom?: number
  color1?: string
  color2?: string
  color3?: string
  className?: string
}

interface Uniform<T> {
  value: T
}

interface GrainientUniforms {
  iTime: Uniform<number>
  iResolution: Uniform<Float32Array>
  uTimeSpeed: Uniform<number>
  uColorBalance: Uniform<number>
  uWarpStrength: Uniform<number>
  uWarpFrequency: Uniform<number>
  uWarpSpeed: Uniform<number>
  uWarpAmplitude: Uniform<number>
  uBlendAngle: Uniform<number>
  uBlendSoftness: Uniform<number>
  uRotationAmount: Uniform<number>
  uNoiseScale: Uniform<number>
  uGrainAmount: Uniform<number>
  uGrainScale: Uniform<number>
  uGrainAnimated: Uniform<number>
  uContrast: Uniform<number>
  uGamma: Uniform<number>
  uSaturation: Uniform<number>
  uCenterOffset: Uniform<Float32Array>
  uZoom: Uniform<number>
  uColor1: Uniform<Float32Array>
  uColor2: Uniform<Float32Array>
  uColor3: Uniform<Float32Array>
}

interface GrainientContext {
  program: Program
  uniforms: GrainientUniforms
}

const contexts = new WeakMap<HTMLDivElement, GrainientContext>()

function hexToRgb(hex: string): Float32Array {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return new Float32Array([1, 1, 1])
  return new Float32Array([
    Number.parseInt(result[1], 16) / 255,
    Number.parseInt(result[2], 16) / 255,
    Number.parseInt(result[3], 16) / 255,
  ])
}

const vertex = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`

const fragment = `#version 300 es
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform float uTimeSpeed;
uniform float uColorBalance;
uniform float uWarpStrength;
uniform float uWarpFrequency;
uniform float uWarpSpeed;
uniform float uWarpAmplitude;
uniform float uBlendAngle;
uniform float uBlendSoftness;
uniform float uRotationAmount;
uniform float uNoiseScale;
uniform float uGrainAmount;
uniform float uGrainScale;
uniform float uGrainAnimated;
uniform float uContrast;
uniform float uGamma;
uniform float uSaturation;
uniform vec2 uCenterOffset;
uniform float uZoom;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
out vec4 fragColor;
#define S(a,b,t) smoothstep(a,b,t)
mat2 Rot(float a){float s=sin(a),c=cos(a);return mat2(c,-s,s,c);}
vec2 hash(vec2 p){p=vec2(dot(p,vec2(2127.1,81.17)),dot(p,vec2(1269.5,283.37)));return fract(sin(p)*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.0-2.0*f);float n=mix(mix(dot(-1.0+2.0*hash(i+vec2(0.0,0.0)),f-vec2(0.0,0.0)),dot(-1.0+2.0*hash(i+vec2(1.0,0.0)),f-vec2(1.0,0.0)),u.x),mix(dot(-1.0+2.0*hash(i+vec2(0.0,1.0)),f-vec2(0.0,1.0)),dot(-1.0+2.0*hash(i+vec2(1.0,1.0)),f-vec2(1.0,1.0)),u.x),u.y);return 0.5+0.5*n;}
void mainImage(out vec4 o, vec2 C){
  float t=iTime*uTimeSpeed;
  vec2 uv=C/iResolution.xy;
  float ratio=iResolution.x/iResolution.y;
  vec2 tuv=uv-0.5+uCenterOffset;
  tuv/=max(uZoom,0.001);

  float degree=noise(vec2(t*0.1,tuv.x*tuv.y)*uNoiseScale);
  tuv.y*=1.0/ratio;
  tuv*=Rot(radians((degree-0.5)*uRotationAmount+180.0));
  tuv.y*=ratio;

  float frequency=uWarpFrequency;
  float ws=max(uWarpStrength,0.001);
  float amplitude=uWarpAmplitude/ws;
  float warpTime=t*uWarpSpeed;
  tuv.x+=sin(tuv.y*frequency+warpTime)/amplitude;
  tuv.y+=sin(tuv.x*(frequency*1.5)+warpTime)/(amplitude*0.5);

  vec3 colLav=uColor1;
  vec3 colOrg=uColor2;
  vec3 colDark=uColor3;
  float b=uColorBalance;
  float s=max(uBlendSoftness,0.0);
  mat2 blendRot=Rot(radians(uBlendAngle));
  float blendX=(tuv*blendRot).x;
  float edge0=-0.3-b-s;
  float edge1=0.2-b+s;
  float v0=0.5-b+s;
  float v1=-0.3-b-s;
  vec3 layer1=mix(colDark,colOrg,S(edge0,edge1,blendX));
  vec3 layer2=mix(colOrg,colLav,S(edge0,edge1,blendX));
  vec3 col=mix(layer1,layer2,S(v0,v1,tuv.y));

  vec2 grainUv=uv*max(uGrainScale,0.001);
  if(uGrainAnimated>0.5){grainUv+=vec2(iTime*0.05);}
  float grain=fract(sin(dot(grainUv,vec2(12.9898,78.233)))*43758.5453);
  col+=(grain-0.5)*uGrainAmount;

  col=(col-0.5)*uContrast+0.5;
  float luma=dot(col,vec3(0.2126,0.7152,0.0722));
  col=mix(vec3(luma),col,uSaturation);
  col=pow(max(col,0.0),vec3(1.0/max(uGamma,0.001)));
  col=clamp(col,0.0,1.0);

  o=vec4(col,1.0);
}
void main(){
  vec4 o=vec4(0.0);
  mainImage(o,gl_FragCoord.xy);
  fragColor=o;
}
`

export function Grainient({
  timeSpeed = 0.25,
  colorBalance = 0,
  warpStrength = 1,
  warpFrequency = 5,
  warpSpeed = 2,
  warpAmplitude = 50,
  blendAngle = 0,
  blendSoftness = 0.05,
  rotationAmount = 500,
  noiseScale = 2,
  grainAmount = 0.1,
  grainScale = 2,
  grainAnimated = false,
  contrast = 1.5,
  gamma = 1,
  saturation = 1,
  centerX = 0,
  centerY = 0,
  zoom = 0.9,
  color1 = '#FF9FFC',
  color2 = '#5227FF',
  color3 = '#B497CF',
  className = '',
}: GrainientProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const renderer = new Renderer({
      webgl: 2,
      alpha: true,
      antialias: false,
      dpr: Math.min(window.devicePixelRatio || 1, 2),
    })
    const gl = renderer.gl
    const canvas = gl.canvas
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.style.display = 'block'
    container.appendChild(canvas)

    const geometry = new Triangle(gl)
    const uniforms: GrainientUniforms = {
      iTime: { value: 0 },
      iResolution: { value: new Float32Array([1, 1]) },
      uTimeSpeed: { value: 0.25 },
      uColorBalance: { value: 0 },
      uWarpStrength: { value: 1 },
      uWarpFrequency: { value: 5 },
      uWarpSpeed: { value: 2 },
      uWarpAmplitude: { value: 50 },
      uBlendAngle: { value: 0 },
      uBlendSoftness: { value: 0.05 },
      uRotationAmount: { value: 500 },
      uNoiseScale: { value: 2 },
      uGrainAmount: { value: 0.1 },
      uGrainScale: { value: 2 },
      uGrainAnimated: { value: 0 },
      uContrast: { value: 1.5 },
      uGamma: { value: 1 },
      uSaturation: { value: 1 },
      uCenterOffset: { value: new Float32Array([0, 0]) },
      uZoom: { value: 0.9 },
      uColor1: { value: new Float32Array([1, 1, 1]) },
      uColor2: { value: new Float32Array([1, 1, 1]) },
      uColor3: { value: new Float32Array([1, 1, 1]) },
    }
    const program = new Program(gl, { vertex, fragment, uniforms })
    const mesh = new Mesh(gl, { geometry, program })
    contexts.set(container, { program, uniforms })

    const setSize = () => {
      const rect = container.getBoundingClientRect()
      renderer.setSize(Math.max(1, Math.floor(rect.width)), Math.max(1, Math.floor(rect.height)))
      uniforms.iResolution.value[0] = gl.drawingBufferWidth
      uniforms.iResolution.value[1] = gl.drawingBufferHeight
      renderer.render({ scene: mesh })
    }
    const resizeObserver = new ResizeObserver(setSize)
    resizeObserver.observe(container)
    setSize()

    let frame = 0
    let isVisible = true
    let isPageVisible = !document.hidden
    const startedAt = performance.now()
    const loop = (time: number) => {
      uniforms.iTime.value = (time - startedAt) * 0.001
      renderer.render({ scene: mesh })
      frame = requestAnimationFrame(loop)
    }
    const start = () => {
      if (isVisible && isPageVisible && frame === 0) frame = requestAnimationFrame(loop)
    }
    const stop = () => {
      if (frame !== 0) cancelAnimationFrame(frame)
      frame = 0
    }
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting
      if (isVisible) start()
      else stop()
    })
    intersectionObserver.observe(container)
    const onVisibilityChange = () => {
      isPageVisible = !document.hidden
      if (isPageVisible) start()
      else stop()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    start()

    return () => {
      stop()
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
      document.removeEventListener('visibilitychange', onVisibilityChange)
      contexts.delete(container)
      geometry.remove()
      program.remove()
      if (canvas.parentElement === container) container.removeChild(canvas)
    }
  }, [])

  useEffect(() => {
    const container = containerRef.current
    const context = container ? contexts.get(container) : undefined
    if (!context) return
    const { uniforms } = context
    uniforms.uTimeSpeed.value = timeSpeed
    uniforms.uColorBalance.value = colorBalance
    uniforms.uWarpStrength.value = warpStrength
    uniforms.uWarpFrequency.value = warpFrequency
    uniforms.uWarpSpeed.value = warpSpeed
    uniforms.uWarpAmplitude.value = warpAmplitude
    uniforms.uBlendAngle.value = blendAngle
    uniforms.uBlendSoftness.value = blendSoftness
    uniforms.uRotationAmount.value = rotationAmount
    uniforms.uNoiseScale.value = noiseScale
    uniforms.uGrainAmount.value = grainAmount
    uniforms.uGrainScale.value = grainScale
    uniforms.uGrainAnimated.value = grainAnimated ? 1 : 0
    uniforms.uContrast.value = contrast
    uniforms.uGamma.value = gamma
    uniforms.uSaturation.value = saturation
    uniforms.uCenterOffset.value = new Float32Array([centerX, centerY])
    uniforms.uZoom.value = zoom
    uniforms.uColor1.value = hexToRgb(color1)
    uniforms.uColor2.value = hexToRgb(color2)
    uniforms.uColor3.value = hexToRgb(color3)
  }, [
    blendAngle,
    blendSoftness,
    centerX,
    centerY,
    color1,
    color2,
    color3,
    colorBalance,
    contrast,
    gamma,
    grainAmount,
    grainAnimated,
    grainScale,
    noiseScale,
    rotationAmount,
    saturation,
    timeSpeed,
    warpAmplitude,
    warpFrequency,
    warpSpeed,
    warpStrength,
    zoom,
  ])

  return (
    <div
      ref={containerRef}
      className={`grainient-container ${className}`.trim()}
      aria-hidden="true"
    />
  )
}
