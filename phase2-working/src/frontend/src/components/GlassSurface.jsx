import React, { useEffect, useRef } from "react";

// GlassSurface — a liquid-glass refraction surface (React Bits style).
//
// A WebGL layer renders a procedural aurora through a displacement shader:
// pointer-tracked refraction, layered noise, per-channel RGB offsets
// (chromatic aberration), brightness and opacity. Children are laid on top
// as real DOM, so text stays crisp and animated.
//
// props (React Bits compatible):
//   width, height, borderRadius, className, mixBlendMode,
//   displace, distortionScale, redOffset, greenOffset, blueOffset,
//   brightness, opacity

const VERT = `
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAG = `
precision highp float;

uniform float uTime;
uniform vec2 uMouse;
uniform vec2 uVelocity;
uniform float uDisplace;
uniform float uDistortionScale;
uniform float uRedOffset;
uniform float uGreenOffset;
uniform float uBlueOffset;
uniform float uBrightness;
uniform float uOpacity;
uniform sampler2D uTexture;

varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(17.0, 9.0);
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = vUv;
  vec2 mouse = uMouse;

  // refraction field — layered noise flowing with time
  float freq = 0.011 * abs(uDistortionScale);
  vec2 field = vec2(
    fbm(uv * freq + vec2(uTime * 0.07, -uTime * 0.05)),
    fbm(uv * freq + vec2(-uTime * 0.05, uTime * 0.08))
  );

  // displacement: gentle global refraction + a swirl that hugs the pointer
  vec2 distVec = uv - mouse;
  float falloff = exp(-dot(distVec, distVec) * 7.0);
  vec2 offset = (field - 0.5) * uDisplace * 0.1;
  offset += distVec * falloff * uDisplace * 0.22;
  offset += uVelocity * uDisplace * 0.18;

  // per-channel offsets for the chromatic edge
  vec2 uvR = uv + offset + vec2(uRedOffset, 0.0) * 0.003;
  vec2 uvG = uv + offset + vec2(uGreenOffset, 0.0) * 0.003;
  vec2 uvB = uv + offset + vec2(uBlueOffset, 0.0) * 0.003;

  vec3 col;
  col.r = texture2D(uTexture, uvR).r;
  col.g = texture2D(uTexture, uvG).g;
  col.b = texture2D(uTexture, uvB).b;

  // brightness: 50 = neutral
  col *= uBrightness / 50.0;

  gl_FragColor = vec4(col, uOpacity);
}
`;

// Procedural aurora source — soft lime / amber / blue blobs on near-black,
// generated once and sampled by the shader.
function makeAuroraTexture(size) {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#04060a";
  ctx.fillRect(0, 0, size, size);

  const blobs = [
    ["rgba(204, 255, 0, 0.34)", 0.62, 0.9, 0.52, 0.5], // lime, bottom-center
    ["rgba(255, 176, 132, 0.2)", 0.16, 0.96, 0.38, 0.4], // warm amber
    ["rgba(130, 168, 255, 0.16)", 0.84, 0.42, 0.32, 0.36], // cool blue
  ];
  for (const [color, x, y, r, alpha] of blobs) {
    const g = ctx.createRadialGradient(x * size, y * size, 0, x * size, y * size, r * size);
    g.addColorStop(0, color);
    g.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }

  // fine film grain so the glass never looks flat even at rest
  const grain = ctx.createImageData(size, size);
  const data = grain.data;
  for (let i = 0; i < data.length; i += 4) {
    const v = (Math.random() - 0.5) * 10;
    data[i] = 6 + v;
    data[i + 1] = 9 + v;
    data[i + 2] = 13 + v;
    data[i + 3] = 255;
  }
  ctx.putImageData(grain, 0, 0);
  return c;
}

export default function GlassSurface({
  children,
  width,
  height,
  borderRadius = 24,
  className = "",
  style,
  mixBlendMode = "screen",
  displace = 0.5,
  distortionScale = -180,
  redOffset = 0,
  greenOffset = 10,
  blueOffset = 20,
  brightness = 50,
  opacity = 0.93,
}) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let disposed = false;
    let renderer = null;
    let program = null;
    let mesh = null;
    let raf = 0;
    let ro = null;
    let widthPx = 0;
    let heightPx = 0;
    let dpr = 1;

    const target = { x: 0.5, y: 0.5 };
    const mouse = { x: 0.5, y: 0.5 };
    const velocity = { x: 0, y: 0 };
    let tPrev = 0;

    const measure = () => {
      const r = wrap.getBoundingClientRect();
      widthPx = width || r.width || 300;
      heightPx = height || r.height || 200;
    };

    const onPointerMove = (e) => {
      const r = wrap.getBoundingClientRect();
      target.x = (e.clientX - r.left) / r.width;
      target.y = 1 - (e.clientY - r.top) / r.height;
    };

    const syncSize = () => {
      if (!renderer) return;
      const r = wrap.getBoundingClientRect();
      const w = width || r.width;
      const h = height || r.height;
      if (!w || !h) return;
      const bw = Math.round(w * dpr);
      const bh = Math.round(h * dpr);
      if (canvas.width !== bw || canvas.height !== bh) {
        canvas.width = bw;
        canvas.height = bh;
        renderer.setSize(bw, bh);
      }
    };

    const renderFrame = (t) => {
      if (disposed) return;
      const dt = Math.min((t - tPrev) / 1000, 0.05);
      tPrev = t;
      const k = 1 - Math.exp(-dt * 6);
      velocity.x = (target.x - mouse.x) * k * 10;
      velocity.y = (target.y - mouse.y) * k * 10;
      mouse.x += (target.x - mouse.x) * k;
      mouse.y += (target.y - mouse.y) * k;

      syncSize();
      program.uniforms.uTime.value = t * 0.001;
      program.uniforms.uMouse.value.set(mouse.x, mouse.y);
      program.uniforms.uVelocity.value.set(velocity.x, velocity.y);
      renderer.render({ scene: mesh });
      if (!reduced) raf = requestAnimationFrame(renderFrame);
    };

    const init = async () => {
      try {
        const ogl = await import("ogl");
        if (disposed) return;

        measure();
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(widthPx * dpr);
        canvas.height = Math.round(heightPx * dpr);

        renderer = new ogl.Renderer({ canvas });
        renderer.setSize(canvas.width, canvas.height);
        const gl = renderer.gl;
        gl.clearColor(0, 0, 0, 0);

        const texture = new ogl.Texture(gl, {
          image: makeAuroraTexture(512),
          generateMipmaps: false,
        });

        program = new ogl.Program(gl, {
          vertex: VERT,
          fragment: FRAG,
          uniforms: {
            uTime: { value: 0 },
            uMouse: { value: new ogl.Vec2(0.5, 0.5) },
            uVelocity: { value: new ogl.Vec2(0, 0) },
            uDisplace: { value: displace },
            uDistortionScale: { value: distortionScale },
            uRedOffset: { value: redOffset },
            uGreenOffset: { value: greenOffset },
            uBlueOffset: { value: blueOffset },
            uBrightness: { value: brightness },
            uOpacity: { value: opacity },
            uTexture: { value: texture },
          },
        });
        mesh = new ogl.Mesh(gl, { geometry: new ogl.Triangle(gl), program });

        wrap.addEventListener("pointermove", onPointerMove, { passive: true });

        // keep the drawing buffer in sync with layout changes
        ro = new ResizeObserver(() => {
          const r = wrap.getBoundingClientRect();
          const w = width || r.width;
          const h = height || r.height;
          if (
            w &&
            h &&
            (Math.abs(w - widthPx) > 1 || Math.abs(h - heightPx) > 1)
          ) {
            widthPx = w;
            heightPx = h;
            canvas.width = Math.round(w * dpr);
            canvas.height = Math.round(h * dpr);
            if (renderer) renderer.setSize(canvas.width, canvas.height);
          }
        });
        ro.observe(wrap);

        tPrev = performance.now();
        raf = requestAnimationFrame(renderFrame);
      } catch (err) {
        // WebGL unavailable — the children still render on the plain surface
        if (!disposed) console.warn("GlassSurface: WebGL unavailable", err);
      }
    };

    init();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      if (ro) ro.disconnect();
      wrap.removeEventListener("pointermove", onPointerMove);
    };
  }, [width, height, displace, distortionScale, redOffset, greenOffset, blueOffset, brightness, opacity]);

  return (
    <div
      ref={wrapRef}
      className={`glass-surface ${className}`}
      style={{
        position: "relative",
        width: width || "100%",
        height: height || "100%",
        borderRadius,
        overflow: "hidden",
        ...style,
      }}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          display: "block",
          mixBlendMode,
          pointerEvents: "none",
        }}
      />
      <div
        className="glass-surface-content"
        style={{ position: "relative", zIndex: 1, width: "100%", height: "100%" }}
      >
        {children}
      </div>
    </div>
  );
}
