import React from 'react';
import GlitchText from './GlitchText';

// Brand sign-off — no chrome, no rules, no plates. The app skin simply
// dissolves into a gradient and the wordmark glitches once in a while.

export default function Footer() {
  return (
    <section className="brand-signoff" aria-label="Thought GPS">
      <div className="brand-signoff-glow" aria-hidden="true" />
      <div className="brand-signoff-mark">
        <GlitchText text="Thought GPS" />
      </div>
      <style>{`
        .brand-signoff {
          position: relative;
          width: 100%;
          min-height: 300px;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding: 7rem 1.5rem 3rem;
          overflow: hidden;
          background: transparent;
          border: 0;
        }
        .brand-signoff-glow {
          position: absolute;
          inset: -30% -10% -25%;
          pointer-events: none;
          background:
            radial-gradient(ellipse 60% 62% at 50% 88%, rgba(204, 255, 0, 0.05) 0%, transparent 68%),
            radial-gradient(ellipse 80% 55% at 24% 92%, rgba(255, 176, 132, 0.035) 0%, transparent 70%),
            radial-gradient(ellipse 70% 50% at 78% 26%, rgba(130, 168, 255, 0.03) 0%, transparent 70%);
          filter: blur(38px);
          animation: brand-signoff-drift 34s ease-in-out infinite alternate;
        }
        @keyframes brand-signoff-drift {
          0%   { transform: translate3d(-2%, 1.5%, 0) scale(1); opacity: 0.8; }
          50%  { transform: translate3d(2%, -1.5%, 0) scale(1.06); opacity: 1; }
          100% { transform: translate3d(-1%, 2%, 0) scale(1.02); opacity: 0.88; }
        }
        .brand-signoff-mark {
          position: relative;
          z-index: 1;
          font-family: var(--font-heading, 'Space Grotesk'), system-ui, sans-serif;
          font-weight: 500;
          font-size: clamp(2.4rem, 9vw, 7.5rem);
          letter-spacing: -0.03em;
          line-height: 0.95;
          color: rgba(238, 240, 238, 0.9);
          -webkit-mask-image: linear-gradient(90deg, transparent 0%, #000 16%, #000 84%, transparent 100%);
          mask-image: linear-gradient(90deg, transparent 0%, #000 16%, #000 84%, transparent 100%);
        }
        .brand-signoff-mark .gt-base {
          background-image: linear-gradient(
            180deg,
            rgba(246, 248, 245, 0.95) 0%,
            rgba(150, 156, 150, 0.5) 64%,
            rgba(96, 102, 96, 0.22) 100%
          );
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          text-shadow: 0 0 44px rgba(255, 255, 255, 0.05);
        }
        @media (max-width: 640px) {
          .brand-signoff { min-height: 200px; padding: 4.5rem 1rem 2rem; }
        }
      `}</style>
    </section>
  );
}
