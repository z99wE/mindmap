import React, { useState, useEffect } from 'react';
import LaserFlow from './LaserFlow';

const copies = [
  "ThoughtGPS: The navigation system for your ideas.",
  "Turn scattered thoughts into actionable intelligence.",
  "Never lose context. Always know your next step.",
  "Extract clarity from chaos with AI-driven insights.",
  "Navigate your mind's architecture with precision."
];

export default function Footer() {
  const [copyIndex, setCopyIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    let interval;
    if (isHovering) {
      interval = setInterval(() => {
        setCopyIndex((prev) => (prev + 1) % copies.length);
      }, 3000);
    } else {
      setCopyIndex(0); // reset when not hovering
    }
    return () => clearInterval(interval);
  }, [isHovering]);

  return (
    <div 
      style={{ 
        position: 'relative', 
        width: '100%', 
        height: '100%', 
        backgroundColor: '#050505',
        cursor: 'crosshair',
        overflow: 'hidden'
      }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Background Laser Flow */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
        <LaserFlow 
          color="#39ff14"
          flowSpeed={isHovering ? 0.8 : 0.35}
          wispIntensity={isHovering ? 9.0 : 5.0}
          wispDensity={isHovering ? 1.5 : 1.0}
          wispSpeed={isHovering ? 20.0 : 12.0}
          fogIntensity={0.5}
          horizontalBeamOffset={0.5} 
          verticalBeamOffset={0.5}
          verticalSizing={2.5}
          horizontalSizing={2.0}
          decay={1.2}
          mouseTiltStrength={0.05}
          mouseSmoothTime={0.05}
        />
      </div>
      
      {/* Content Overlay */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        zIndex: 10,
        width: '90%',
        pointerEvents: 'none'
      }}>
        <h2 style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: isHovering ? '3rem' : '2.5rem',
          fontWeight: 800,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          margin: 0,
          background: 'linear-gradient(180deg, #b0ffb0 0%, #39ff14 40%, #00aa00 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          filter: isHovering ? 'drop-shadow(0 0 15px rgba(57, 255, 20, 0.8))' : 'drop-shadow(0 4px 8px rgba(57, 255, 20, 0.4))',
          transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
        }}>
          Thought GPS
        </h2>
        
        <div style={{
          marginTop: '1rem',
          height: '2.5rem',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <p style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '1.15rem',
            color: '#ffffff',
            fontWeight: 500,
            letterSpacing: '0.05em',
            margin: 0,
            opacity: isHovering ? 1 : 0,
            transform: isHovering ? 'translateY(0)' : 'translateY(15px)',
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            textShadow: '0 2px 8px rgba(0,0,0,0.9), 0 0 4px rgba(57,255,20,0.5)'
          }}>
            {copies[copyIndex]}
          </p>
        </div>
      </div>
    </div>
  );
}
