import React from 'react';
import ShinyText from './ShinyText';

/**
 * Compact brand mark for the top of the nav rail (desktop) and top bar (mobile).
 * Miniature version of the Footer brand sign-off: ShinyText sweep + tagline.
 */
export default function TopLogo({ mobile }) {
  if (mobile) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        width: 'fit-content',
        padding: '0.25rem 0',
      }}>
        <div style={{
          width: '26px',
          height: '26px',
          borderRadius: '8px',
          background: 'linear-gradient(145deg, #d6ff3e, #ccff00)',
          display: 'grid',
          placeItems: 'center',
          boxShadow: '0 0 16px rgba(204, 255, 0, 0.3), inset 0 1px 0 rgba(255,255,255,0.4)',
          flexShrink: 0,
        }}>
          <span style={{
            fontFamily: "'Space Grotesk', system-ui",
            fontWeight: 700,
            fontSize: '13px',
            lineHeight: 1,
            color: '#000',
            letterSpacing: '-0.02em',
          }}>R</span>
        </div>
        <ShinyText
          text="ReMentally"
          speed={2.5}
          color="#b5b5b5"
          shineColor="#ffffff"
          spread={100}
          direction="left"
          yoyo={false}
          pauseOnHover={false}
          disabled={false}
          style={{ font: 'italic 700 15px/1 var(--font-heading)', letterSpacing: '0.02em' }}
        />
      </div>
    );
  }

  /* Desktop: compact footer-style brand mark */
  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      padding: '0 0.75rem',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>
      {/* Subtle gradient glow behind the logo */}
      <div style={{
        position: 'absolute',
        top: '-40%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '180px',
        height: '180px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(204,255,0,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
        filter: 'blur(20px)',
      }} aria-hidden="true" />

      {/* Brand mark */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.35rem',
      }}>
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
          style={{
            font: 'italic 800 17px/1 var(--font-heading)',
            letterSpacing: '0.04em',
          }}
        />
        <span style={{
          fontFamily: "var(--font-body, 'Barlow'), system-ui, sans-serif",
          fontSize: '8px',
          fontWeight: 400,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.2)',
          whiteSpace: 'nowrap',
        }}>
          Cognitive Coprocessor
        </span>
      </div>
    </div>
  );
}
