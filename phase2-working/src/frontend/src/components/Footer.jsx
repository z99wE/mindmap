import React from 'react';
import ShinyText from './ShinyText';
import RippleGrid from './RippleGrid';

/**
 * Brand sign-off — a liquid-glass footer that consistently spans the full
 * viewport width. No mask shenanigans, no fixed height, no side-effect
 * distortion. Rides a subtle ripple grid and the ReMentally wordmark.
 */
export default function Footer() {
  return (
    <footer className="brand-signoff" aria-label="ReMentally footer">
      {/* Ripple grid backdrop — always fills the footer */}
      <div className="brand-signoff-grid">
        <RippleGrid
          enableRainbow
          gridColor="#84CC16"
          rippleIntensity={0.05}
          gridSize={14}
          gridThickness={12}
          mouseInteraction
          mouseInteractionRadius={0.8}
          opacity={0.2}
          fadeDistance={3}
          vignetteStrength={1.2}
          glowIntensity={0.08}
          gridRotation={0}
        />
      </div>

      {/* Content — centered brand mark */}
      <div className="brand-signoff-content">
        <div className="brand-signoff-mark">
          <ShinyText
            text="ReMentally"
            speed={2}
            color="#b5b5b5"
            shineColor="#ffffff"
            spread={120}
            direction="left"
            yoyo={false}
            pauseOnHover={false}
            disabled={false}
          />
          <p className="brand-signoff-tagline">Cognitive Coprocessor</p>
        </div>
      </div>

      <style>{`
        .brand-signoff {
          position: relative;
          width: 100%;
          min-height: 320px;
          overflow: hidden;
          background: transparent;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .brand-signoff-grid {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
          pointer-events: none;
        }
        .brand-signoff-content {
          position: relative;
          z-index: 1;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 3rem 1rem;
        }
        .brand-signoff-mark {
          font-family: var(--font-heading, 'Space Grotesk'), system-ui, sans-serif;
          font-weight: 500;
          font-size: clamp(2rem, 7vw, 5.5rem);
          letter-spacing: -0.03em;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }
        .brand-signoff-tagline {
          font-family: var(--font-body, 'Barlow'), system-ui, sans-serif;
          font-size: clamp(0.7rem, 1.5vw, 0.9rem);
          font-weight: 400;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.25);
          margin: 0;
        }
        @media (max-width: 640px) {
          .brand-signoff {
            min-height: 200px;
          }
          .brand-signoff-content {
            padding: 2rem 1rem;
          }
        }
      `}</style>
    </footer>
  );
}
