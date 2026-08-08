import React from 'react';
import RippleGrid from './RippleGrid';
import ShinyText from './ShinyText';

export default function TopLogo({ mobile }) {
  if (mobile) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: 'fit-content' }}>
        <div className="nav-logo-icon" style={{ width: '28px', height: '28px', fontSize: '14px' }}>T</div>
        <ShinyText text="Thought GPS" disabled={false} speed={3} className="shiny-text" style={{ font: 'italic 700 16px/1 var(--font-heading)' }} />
      </div>
    );
  }

  return (
    <div className="top-bar glass-rim" style={{ width: '100%', height: '100%', padding: '0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', borderRight: 'none', zIndex: 5 }}>
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, opacity: 0.4, pointerEvents: 'none' }}>
        <RippleGrid enableRainbow gridColor="#84CC16" mouseInteraction={false} />
      </div>
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem', transform: 'translateY(2px)' }}>
        <div className="nav-logo-icon" style={{ width: '32px', height: '32px', fontSize: '16px', boxShadow: '2px 2px 0 0 rgba(0, 0, 0, 0.4), 0 0 14px rgba(204, 255, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.5)' }}>T</div>
        <ShinyText text="Thought GPS" disabled={false} speed={3} className="shiny-text" style={{ font: 'italic 700 15px/1 var(--font-heading)', letterSpacing: '0.02em' }} />
      </div>
    </div>
  );
}
