import React from 'react';
import ShinyText from './ShinyText';
import GlassSurface from './GlassSurface';
import RippleGrid from './RippleGrid';

// Brand sign-off — a liquid-glass surface dissolves the app into the dark,
// and the wordmark rides the glass with a quiet shine.

export default function Footer() {
  return (
    <section className="brand-signoff" aria-label="Thought GPS">
      {/* Grid in background */}
      <div style={{ width: '100%', height: '500px', position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden' }}>
        <RippleGrid
          enableRainbow
          gridColor="#84CC16"
          rippleIntensity={0.06}
          gridSize={12}
          gridThickness={15}
          mouseInteraction
          mouseInteractionRadius={0.9}
          opacity={0.28}
          fadeDistance={2.5}
          vignetteStrength={1.8}
          glowIntensity={0.1}
          gridRotation={0}
        />
      </div>

      {/* Text in foreground */}
      <div style={{ position: 'relative', zIndex: 1, height: '500px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="brand-signoff-mark">
          <ShinyText
            text="Thought GPS"
            speed={2}
            color="#b5b5b5"
            shineColor="#ffffff"
            spread={120}
            direction="left"
            yoyo={false}
            pauseOnHover={false}
            disabled={false}
          />
        </div>
      </div>

      <style>{`
        .brand-signoff {
          position: relative;
          width: 100%;
          min-height: 500px;
          overflow: hidden;
          background: transparent;
          border: 0;
          /* dissolve the footer into the app above — no seam, just light */
          -webkit-mask-image: linear-gradient(180deg, transparent 0%, #000 24%);
          mask-image: linear-gradient(180deg, transparent 0%, #000 24%);
        }
        .brand-signoff-mark {
          font-family: var(--font-heading, 'Space Grotesk'), system-ui, sans-serif;
          font-weight: 500;
          font-size: clamp(2.4rem, 9vw, 7.5rem);
          letter-spacing: -0.03em;
          -webkit-mask-image: linear-gradient(90deg, transparent 0%, #000 16%, #000 84%, transparent 100%);
          mask-image: linear-gradient(90deg, transparent 0%, #000 16%, #000 84%, transparent 100%);
        }
      `}</style>
    </section>
  );
}
