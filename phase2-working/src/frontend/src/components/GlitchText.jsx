import React from 'react';

// GlitchText — a single, restrained glitch signature. No shuffling, no bounce.
// Two offset ghost layers tear briefly and settle; the rest of the time the
// wordmark sits perfectly still.

export default function GlitchText({ text = '', className = '', style }) {
  return (
    <span className={`gt-root ${className}`} style={style} aria-label={text}>
      <span className="gt-layer gt-base">{text}</span>
      <span className="gt-layer gt-ghost gt-ghost-a" aria-hidden="true">{text}</span>
      <span className="gt-layer gt-ghost gt-ghost-b" aria-hidden="true">{text}</span>
      <span className="gt-scan" aria-hidden="true" />
      <style>{`
        .gt-root {
          position: relative;
          display: inline-block;
          isolation: isolate;
        }
        .gt-layer {
          display: block;
          white-space: pre;
        }
        .gt-base {
          position: relative;
          z-index: 2;
          animation: gt-tear 8s steps(1, end) infinite;
        }
        .gt-ghost {
          position: absolute;
          inset: 0;
          z-index: 1;
          opacity: 0;
          mix-blend-mode: screen;
          pointer-events: none;
        }
        .gt-ghost-a { color: rgba(204, 255, 0, 0.55); animation: gt-ghost-a 8s steps(1, end) infinite; }
        .gt-ghost-b { color: rgba(130, 168, 255, 0.5); animation: gt-ghost-b 8s steps(1, end) infinite; }
        .gt-scan {
          position: absolute;
          left: -2%;
          right: -2%;
          height: 16%;
          top: 30%;
          z-index: 3;
          pointer-events: none;
          background: linear-gradient(180deg, transparent, rgba(255,255,255,0.05), transparent);
          opacity: 0;
          animation: gt-scan 8s linear infinite;
        }
        @keyframes gt-tear {
          0%, 92.4% { transform: none; clip-path: none; }
          92.6%     { transform: translate3d(-2px, 0, 0); clip-path: inset(18% 0 46% 0); }
          92.9%     { transform: translate3d(3px, -1px, 0); clip-path: inset(52% 0 12% 0); }
          93.3%     { transform: translate3d(-1px, 1px, 0); clip-path: none; }
          93.6%     { transform: translate3d(2px, 0, 0); clip-path: inset(4% 0 72% 0); }
          94%, 100% { transform: none; clip-path: none; }
        }
        @keyframes gt-ghost-a {
          0%, 92.4% { opacity: 0; transform: none; }
          92.6%     { opacity: 0.8; transform: translate3d(-5px, 1px, 0); }
          93.1%     { opacity: 0.5; transform: translate3d(4px, -1px, 0); }
          93.7%     { opacity: 0.65; transform: translate3d(-3px, 0, 0); }
          94%, 100% { opacity: 0; transform: none; }
        }
        @keyframes gt-ghost-b {
          0%, 92.4% { opacity: 0; transform: none; }
          92.7%     { opacity: 0.7; transform: translate3d(5px, -1px, 0); }
          93.2%     { opacity: 0.45; transform: translate3d(-4px, 1px, 0); }
          93.8%     { opacity: 0.6; transform: translate3d(3px, 0, 0); }
          94%, 100% { opacity: 0; transform: none; }
        }
        @keyframes gt-scan {
          0%, 92.4%  { opacity: 0; top: 8%; }
          92.6%      { opacity: 1; }
          94%        { opacity: 0; top: 82%; }
          100%       { opacity: 0; top: 82%; }
        }
        .gt-root:hover .gt-base { animation-duration: 1.1s; }
        .gt-root:hover .gt-ghost-a,
        .gt-root:hover .gt-ghost-b,
        .gt-root:hover .gt-scan { animation-duration: 1.1s; }
        @media (prefers-reduced-motion: reduce) {
          .gt-base, .gt-ghost, .gt-scan { animation: none; opacity: 0; }
          .gt-base { opacity: 1; }
        }
      `}</style>
    </span>
  );
}
