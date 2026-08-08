import React from 'react';

// ShinyText — a calm, continuous sheen that sweeps across the text.
// No glitch, no noise: just a polished metallic glide.
//
// props follow the React Bits component of the same name:
//   text, speed, delay, color, shineColor, spread, direction,
//   yoyo, pauseOnHover, disabled

export default function ShinyText({
  text = '',
  speed = 2,
  delay = 0,
  color = '#b5b5b5',
  shineColor = '#ffffff',
  spread = 120,
  direction = 'left',
  yoyo = false,
  pauseOnHover = false,
  disabled = false,
  className = '',
  style,
}) {
  return (
    <span
      className={`shiny-text ${className}`}
      data-direction={direction}
      data-pause-on-hover={pauseOnHover ? '' : undefined}
      data-disabled={disabled ? '' : undefined}
      aria-label={text}
      style={{
        '--shine-color': color,
        '--shine-highlight': shineColor,
        '--shine-spread': `${spread}px`,
        '--shine-duration': `${Math.max(0.5, speed)}s`,
        '--shine-delay': `${delay}s`,
        ...style,
      }}
    >
      {text}
      <style>{`
        .shiny-text {
          position: relative;
          display: inline-block;
          white-space: pre;
          /* own line-height >= 1 so the background-clip:text paint box
             covers full glyphs (descenders) instead of slicing them off */
          line-height: 1.12;
          color: var(--shine-color, #b5b5b5);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          background-image: linear-gradient(
            100deg,
            var(--shine-color, #b5b5b5) 0%,
            var(--shine-color, #b5b5b5) 40%,
            var(--shine-highlight, #ffffff) 50%,
            var(--shine-color, #b5b5b5) 60%,
            var(--shine-color, #b5b5b5) 100%
          );
          background-size: 200% 100%;
          background-position: 120% 50%;
          animation: shiny-sweep var(--shine-duration, 2s) linear infinite;
          animation-delay: var(--shine-delay, 0s);
        }

        .shiny-text[data-direction="right"] {
          background-position: -120% 50%;
          animation-direction: reverse;
        }
        .shiny-text[data-direction="top"],
        .shiny-text[data-direction="bottom"] {
          background-size: 100% 200%;
          background-position: 50% 120%;
          animation-name: shiny-sweep-vertical;
        }
        .shiny-text[data-direction="bottom"] {
          background-position: 50% -120%;
          animation-direction: reverse;
        }

        /* continuous glide — the band crosses and loops forever */
        @keyframes shiny-sweep {
          0%   { background-position: 130% 50%; }
          100% { background-position: -130% 50%; }
        }
        @keyframes shiny-sweep-vertical {
          0%   { background-position: 50% 130%; }
          100% { background-position: 50% -130%; }
        }

        .shiny-text[data-pause-on-hover]:hover {
          animation-play-state: paused;
        }

        .shiny-text[data-disabled] {
          animation: none;
          background-position: 50% 50%;
        }

        @media (prefers-reduced-motion: reduce) {
          .shiny-text {
            animation: none;
            background-position: 50% 50%;
          }
        }
      `}</style>
    </span>
  );
}
