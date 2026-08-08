import React from 'react';
import RippleGrid from './RippleGrid';

export default function TopLogo() {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', borderRadius: '12px', display: 'flex', alignItems: 'center' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }}>
        <RippleGrid
          gridColor="#84CC16"
          rippleIntensity={0.04}
          gridSize={8}
          gridThickness={12}
          opacity={0.3}
          fadeDistance={1.5}
          vignetteStrength={1.2}
          glowIntensity={0.05}
          gridRotation={0}
        />
      </div>
      <div style={{
        position: 'relative',
        zIndex: 1,
        fontFamily: 'var(--font-heading)',
        fontSize: '18px',
        fontWeight: '600',
        color: 'var(--md-sys-color-on-surface)',
        paddingLeft: '12px',
        letterSpacing: '-0.02em',
        pointerEvents: 'none'
      }}>
        Thought GPS
      </div>
    </div>
  );
}
