import React from 'react';
import RippleGrid from './RippleGrid';

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
    <div className="top-bar glass-rim" style={{ width: '100%', height: '100%', padding: '0 1.5rem', justifyContent: 'flex-start', position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, opacity: 0.15, pointerEvents: 'none', maskImage: 'linear-gradient(to right, black, transparent)' }}>
        <RippleGrid enableRainbow gridColor="#84CC16" mouseInteraction={false} />
      </div>
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div className="nav-logo-icon" style={{ width: '36px', height: '36px', fontSize: '18px', boxShadow: '2px 2px 0 0 rgba(0, 0, 0, 0.4), 0 0 16px rgba(204, 255, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.5)' }}>T</div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <div className="nav-logo-text" style={{ fontSize: '16px', letterSpacing: '-0.02em', color: '#fff', fontWeight: 600 }}>Thought GPS</div>
          <div className="nav-logo-sub" style={{ fontSize: '10px', marginTop: '0', opacity: 0.6 }}>Cognitive Coprocessor</div>
        </div>
      </div>
    </div>
  );
}
