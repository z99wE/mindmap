import React from 'react';

// Lightweight brand footer — no WebGL, no laser canvas, no 520KB chunk.
// Pure CSS liquid-glass footer with the Thought GPS wordmark.

const copies = [
  "ThoughtGPS: The navigation system for your ideas.",
  "Turn scattered thoughts into actionable intelligence.",
  "Never lose context. Always know your next step.",
  "Extract clarity from chaos with AI-driven insights.",
  "Navigate your mind's architecture with precision."
];

export default function Footer() {
  const [copyIndex, setCopyIndex] = React.useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setCopyIndex((prev) => (prev + 1) % copies.length);
    }, 3200);
    return () => clearInterval(interval);
  }, []);

  return (
    <footer className="brand-footer" aria-label="Footer">
      <div className="brand-footer-glow" aria-hidden="true" />
      <div className="brand-footer-inner">
        <div className="brand-footer-wordmark">
          <span className="brand-footer-mark">t</span>
          <span className="brand-footer-name">Thought GPS</span>
        </div>
        <p className="brand-footer-tagline">{copies[copyIndex]}</p>
      </div>
      <div className="brand-footer-meta">
        <span>COGNITIVE COPROCESSOR</span>
        <span>·</span>
        <span>v3.0</span>
      </div>
      <style>{`
        .brand-footer {
          position: relative;
          width: 100%;
          min-height: 180px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: 3rem 1.5rem;
          overflow: hidden;
          background: linear-gradient(180deg, rgba(10,11,13,0) 0%, rgba(10,11,13,0.9) 100%);
          border-top: 1px solid rgba(255,255,255,0.06);
        }
        .brand-footer-glow {
          position: absolute;
          left: 50%;
          bottom: -6rem;
          transform: translateX(-50%);
          width: 46rem;
          height: 13rem;
          background:
            radial-gradient(ellipse at center, rgba(204,255,0,0.10) 0%, rgba(204,255,0,0.03) 45%, transparent 70%),
            radial-gradient(ellipse at 65% 30%, rgba(106,53,255,0.08) 0%, transparent 55%);
          pointer-events: none;
        }
        .brand-footer-inner {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.6rem;
        }
        .brand-footer-wordmark {
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }
        .brand-footer-mark {
          width: 30px;
          height: 30px;
          border-radius: 9px;
          display: grid;
          place-items: center;
          font: italic 700 16px/1 'Space Grotesk', sans-serif;
          color: #000;
          background: linear-gradient(145deg, #d6ff3e 0%, #ccff00 55%, #b3e600 100%);
          box-shadow: 4px 4px 0 0 rgba(0,0,0,0.4), 0 0 18px rgba(204,255,0,0.4), inset 0 1px 0 rgba(255,255,255,0.5);
          letter-spacing: -0.02em;
        }
        .brand-footer-name {
          font: 600 20px/1 'Space Grotesk', sans-serif;
          letter-spacing: -0.02em;
          color: #f2f4f0;
        }
        .brand-footer-tagline {
          font: 400 14px/1.5 'Barlow', sans-serif;
          color: rgba(235,235,235,0.5);
          margin: 0;
          max-width: 480px;
          text-align: center;
        }
        .brand-footer-meta {
          position: relative;
          z-index: 1;
          display: flex;
          gap: 0.5rem;
          font: 500 10px/1 'JetBrains Mono', monospace;
          letter-spacing: 0.18em;
          color: rgba(235,235,235,0.28);
          text-transform: uppercase;
        }
        @media (max-width: 640px) {
          .brand-footer { min-height: 140px; padding: 2.25rem 1rem; }
        }
      `}</style>
    </footer>
  );
}
