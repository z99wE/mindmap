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
    <div className="top-bar glass-rim" style={{ width: '100%', height: '100%', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', borderRight: 'none', zIndex: 5, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, opacity: 0.25, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <RippleGrid enableRainbow gridColor="#84CC16" mouseInteraction={false} gridSize={8.0} gridThickness={12.0} />
      </div>
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
        <div className="nav-logo-icon" style={{ width: '32px', height: '32px', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--md-sys-color-primary)', color: 'var(--md-sys-color-on-primary)', borderRadius: '50%', boxShadow: '0 4px 12px rgba(132, 204, 22, 0.3)' }}>T</div>
        <ShinyText text="Thought GPS" disabled={false} speed={3} className="shiny-text" style={{ font: 'italic 800 20px/1 var(--font-heading)', letterSpacing: '0.05em' }} />
      </div>
    </div>
  );
}
