import React from 'react';
import RippleGrid from './RippleGrid';

export default function TopLogo() {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', borderRadius: '12px', display: 'flex', alignItems: 'center', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }}>
        <RippleGrid
          enableRainbow={true}
          gridColor="#84CC16"
          rippleIntensity={0.06}
          gridSize={12}
          gridThickness={15}
          mouseInteraction={true}
          mouseInteractionRadius={0.9}
          opacity={0.4}
          fadeDistance={2.5}
          vignetteStrength={1.8}
          glowIntensity={0.1}
          gridRotation={0}
        />
      </div>
      <div style={{
        position: 'relative',
        zIndex: 1,
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0 8px',
        width: '100%'
      }}>
        <div style={{
          width: '24px',
          height: '24px',
          borderRadius: '8px',
          background: 'linear-gradient(145deg, #ccff00, #99cc00)',
          display: 'grid',
          placeItems: 'center',
          boxShadow: '2px 2px 0 0 rgba(0, 0, 0, 0.4), 0 0 16px rgba(204, 255, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.5)',
          fontFamily: 'var(--font-heading)',
          fontStyle: 'italic',
          fontWeight: '700',
          fontSize: '12px',
          lineHeight: '1',
          color: '#000000',
          letterSpacing: '-0.02em'
        }}>
          T
        </div>
        <div style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '16px',
          fontWeight: '600',
          color: 'var(--md-sys-color-on-surface)',
          letterSpacing: '-0.02em',
          pointerEvents: 'none'
        }}>
          Thought GPS
        </div>
      </div>
    </div>
  );
}
