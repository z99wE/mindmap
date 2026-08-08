import React from 'react';
import RippleGrid from './RippleGrid';
import ShinyText from './ShinyText';

export default function TopLogo({ mobile }) {
  if (mobile) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: 'fit-content' }}>
        <div className="nav-logo-icon" style={{ width: '32px', height: '32px', fontSize: '16px' }}>T</div>
        <span style={{ font: 'italic 700 18px/1 var(--font-heading)', color: 'var(--md-sys-color-on-surface)' }}>
          Thought GPS
        </span>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.2)' }}>
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <RippleGrid enableRainbow gridColor="#84CC16" mouseInteraction />
      </div>
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
        <div className="nav-logo-icon" style={{ width: '48px', height: '48px', fontSize: '24px', boxShadow: '4px 4px 0 0 rgba(0, 0, 0, 0.4), 0 0 26px rgba(204, 255, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.5)' }}>T</div>
        <ShinyText text="Thought GPS" disabled={false} speed={3} className="shiny-text" style={{ font: 'italic 700 22px/1 var(--font-heading)' }} />
      </div>
    </div>
  );
}
