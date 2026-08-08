import { useEffect, useRef } from 'react';
import { Renderer, Program, Mesh, Geometry } from 'ogl';

// Hyperspeed — a synthwave-style road rushing toward the camera, rendered in
// Thought GPS brand colors (lime / chartreuse / emerald / faint violet).
// Shader-based (ogl fullscreen triangle) so it layers cleanly at low opacity
// with faded edges for the footer sign-off. Accepts the React Bits-style
// props (effectOptions, onSpeedUp, onSlowDown) for drop-in compatibility.

const vertex = `
attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragment = `
precision highp float;

uniform float uTime;
uniform vec2 uResolution;

const float HORIZON = 0.55;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution.xy;
  float t = uTime;

  float y = uv.y;
  float depth = clamp((HORIZON - y) / HORIZON, 0.0, 1.0);
  float x = uv.x - 0.5;

  vec3 col = vec3(0.0);
  float alpha = 0.0;

  // Horizon glow (grayscale)
  float hg = exp(-abs(y - HORIZON) * 30.0);
  col += vec3(0.5, 0.5, 0.5) * hg * 0.9;
  alpha += hg * 0.5;

  // Road surface
  float roadHalf = 0.60 * depth;
  float inRoad = step(abs(x), roadHalf);
  col += vec3(0.05, 0.05, 0.05) * inRoad;
  alpha += inRoad * 0.12;

  // Road edge lines (solid, grayscale)
  float edge = 1.0 - smoothstep(0.0, 0.016, abs(abs(x) - roadHalf));
  col += vec3(0.7, 0.7, 0.7) * edge;
  alpha += edge * 0.55;

  // Center dashed line — dashes stream toward the camera
  float dash = step(fract(depth * 9.0 - t * 2.2), 0.5);
  float center = (1.0 - smoothstep(0.0, 0.02, abs(x))) * dash;
  col += vec3(0.6, 0.6, 0.6) * center * 0.85;
  alpha += center * 0.5;

  // Roadside light sticks — grayscale, scrolling past
  float stickIdx = floor(depth * 16.0);
  float stickF = fract(depth * 16.0 - t * 2.6);
  float stick = step(stickF, 0.12);
  float stickX = roadHalf + 0.035;
  float stickL = (1.0 - smoothstep(0.0, 0.018, abs(abs(x) - stickX))) * stick;
  float stickR = (1.0 - smoothstep(0.0, 0.018, abs(abs(x) + stickX))) * stick;
  float hue = fract(stickIdx * 0.5);
  vec3 stickCol = mix(vec3(0.9, 0.9, 0.9), vec3(0.4, 0.4, 0.4), hue);
  col += stickCol * (stickL + stickR) * 0.9;
  alpha += (stickL + stickR) * 0.55;

  // Car light streaks — grayscale pairs rushing outward from center
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    float lane = 0.20 + 0.10 * hash(vec2(fi, 1.0));
    float sp = 1.6 + hash(vec2(fi, 2.0)) * 2.4;
    float c = step(fract(depth * (7.0 + fi * 1.7) + t * sp + fi * 0.9), 0.16);
    float side = mod(fi, 2.0) < 1.0 ? 1.0 : -1.0;
    float cx = side * lane * roadHalf;
    float car = (1.0 - smoothstep(0.0, 0.035, abs(x - cx))) * c;
    vec3 carCol = mix(vec3(0.8, 0.8, 0.8), vec3(0.3, 0.3, 0.3), fract(fi * 0.618));
    col += carCol * car * 1.15;
    alpha += car * 0.7;
  }

  // Depth vignette so the horizon never blows out
  col *= (0.55 + 0.45 * smoothstep(0.0, 0.35, depth));

  // Soft edge fade (bottom + sides) for a ghosted, faded look
  float fade = smoothstep(0.0, 0.10, uv.y)
             * smoothstep(0.0, 0.14, uv.x)
             * smoothstep(0.0, 0.14, 1.0 - uv.x);

  gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0) * fade * 0.6);
}
`;

export default function Hyperspeed({ effectOptions = {}, onSpeedUp, onSlowDown, className, style }) {
  const hostRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const reduceMotion =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let renderer, program, mesh, raf = 0;
    let disposed = false;

    try {
      renderer = new Renderer({
        alpha: true,
        antialias: false,
        dpr: Math.min(window.devicePixelRatio || 1, 2),
      });
      const gl = renderer.gl;
      gl.clearColor(0, 0, 0, 0);
      const canvas = gl.canvas;
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.display = 'block';
      host.appendChild(canvas);

      const geometry = new Geometry(gl, {
        position: {
          size: 2,
          data: new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
        },
      });

      program = new Program(gl, {
        vertex,
        fragment,
        uniforms: {
          uTime: { value: 0 },
          uResolution: { value: [1, 1] },
        },
        transparent: true,
        depthTest: false,
        depthWrite: false,
        cullFace: false,
      });

      mesh = new Mesh(gl, { geometry, program, frustumCulled: false });

      const resize = () => {
        const w = host.clientWidth || 1;
        const h = host.clientHeight || 1;
        renderer.setSize(w, h);
        program.uniforms.uResolution.value = [canvas.width, canvas.height];
      };
      resize();
      const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
      if (ro) ro.observe(host);

      const start = performance.now();
      const loop = () => {
        if (disposed) return;
        program.uniforms.uTime.value = (performance.now() - start) / 1000;
        renderer.render({ scene: mesh });
        if (!reduceMotion) raf = requestAnimationFrame(loop);
      };
      loop();

      return () => {
        disposed = true;
        cancelAnimationFrame(raf);
        if (ro) ro.disconnect();
        const ext = gl.getExtension('WEBGL_lose_context');
        if (ext) ext.loseContext();
      };
    } catch (err) {
      console.warn('Hyperspeed: WebGL unavailable', err);
      return () => {};
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={hostRef}
      className={className}
      style={{ width: '100%', height: '100%', pointerEvents: 'none', ...style }}
      aria-hidden="true"
    />
  );
}
