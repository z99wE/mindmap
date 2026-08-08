import React from 'react';
import ShinyText from './ShinyText';
import GlassSurface from './GlassSurface';
import Hyperspeed from './Hyperspeed';

// Brand sign-off — a liquid-glass surface dissolves the app into the dark,
// and the wordmark rides the glass with a quiet shine.

export default function Footer() {
  return (
    <section className="brand-signoff" aria-label="Thought GPS">
      <div className="brand-signoff-glow" aria-hidden="true" />
      <GlassSurface
        className="brand-signoff-glass"
        borderRadius={26}
        style={{ position: 'absolute', top: '0.4rem', left: '0.6rem', right: '0.6rem', bottom: '0.4rem' }}
        displace={0.5}
        distortionScale={-180}
        redOffset={0}
        greenOffset={10}
        blueOffset={20}
        brightness={50}
        opacity={0.93}
        mixBlendMode="screen"
      >
        <div className="brand-signoff-mark">
          <ShinyText
            text="Thought GPS"
            speed={2}
            color="#b5b5b5"
            shineColor="#ffffff"
            spread={120}
            direction="left"
            yoyo={false}
            pauseOnHover={false}
            disabled={false}
          />
        </div>
      </GlassSurface>
      <Hyperspeed
        className="brand-signoff-speed"
        effectOptions={{
          distortion: 'xyDistortion',
          length: 400,
          roadWidth: 9,
          islandWidth: 2,
          lanesPerRoad: 3,
          fov: 90,
          fovSpeedUp: 150,
          speedUp: 3,
          carLightsFade: 0.4,
          totalSideLightSticks: 50,
          lightPairsPerRoadWay: 30,
          shoulderLinesWidthPercentage: 0.05,
          brokenLinesWidthPercentage: 0.1,
          brokenLinesLengthPercentage: 0.5,
          lightStickWidth: [0.02, 0.05],
          lightStickHeight: [0.3, 0.7],
          movingAwaySpeed: [20, 50],
          movingCloserSpeed: [-150, -230],
          carLightsLength: [20, 80],
          carLightsRadius: [0.03, 0.08],
          carWidthPercentage: [0.1, 0.5],
          carShiftX: [-0.5, 0.5],
          carFloorSeparation: [0, 0.1],
          colors: {
            roadColor: 0x080808,
            islandColor: 0x0a0a0a,
            background: 0x000000,
            shoulderLines: 0x333333,
            brokenLines: 0x444444,
            leftCars: [0x888888, 0xbbbbbb, 0xffffff],
            rightCars: [0x555555, 0x777777, 0x999999],
            sticks: 0x666666
          }
        }}
      />
      <style>{`
        .brand-signoff {
          position: relative;
          width: 100%;
          min-height: 300px;
          overflow: hidden;
          background: transparent;
          border: 0;
          /* dissolve the footer into the app above — no seam, just light */
          -webkit-mask-image: linear-gradient(180deg, transparent 0%, #000 24%);
          mask-image: linear-gradient(180deg, transparent 0%, #000 24%);
        }
        .brand-signoff-glow {
          position: absolute;
          inset: -60% -15% -30%;
          pointer-events: none;
          background:
            radial-gradient(ellipse 72% 62% at 50% 100%, rgba(204, 255, 0, 0.1) 0%, transparent 58%),
            radial-gradient(ellipse 92% 55% at 22% 104%, rgba(255, 176, 132, 0.05) 0%, transparent 64%),
            radial-gradient(ellipse 76% 50% at 82% 44%, rgba(130, 168, 255, 0.045) 0%, transparent 64%);
          filter: blur(44px);
          animation: brand-signoff-drift 34s ease-in-out infinite alternate;
        }
        @keyframes brand-signoff-drift {
          0%   { transform: translate3d(-2%, 1.5%, 0) scale(1); opacity: 0.8; }
          50%  { transform: translate3d(2%, -1.5%, 0) scale(1.06); opacity: 1; }
          100% { transform: translate3d(-1%, 2%, 0) scale(1.02); opacity: 0.88; }
        }
        .brand-signoff-glass {
          z-index: 0;
        }
        .brand-signoff-glass .glass-surface-content {
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding: 5.5rem 1.5rem 2.5rem;
          box-sizing: border-box;
        }
        .brand-signoff-mark {
          font-family: var(--font-heading, 'Space Grotesk'), system-ui, sans-serif;
          font-weight: 500;
          font-size: clamp(2.4rem, 9vw, 7.5rem);
          letter-spacing: -0.03em;
          -webkit-mask-image: linear-gradient(90deg, transparent 0%, #000 16%, #000 84%, transparent 100%);
          mask-image: linear-gradient(90deg, transparent 0%, #000 16%, #000 84%, transparent 100%);
        }
        .brand-signoff-speed {
          position: absolute;
          left: 6%;
          right: 6%;
          bottom: 0.4rem;
          height: clamp(84px, 15vw, 150px);
          opacity: 0.30;
          z-index: 0;
          pointer-events: none;
          -webkit-mask-image: radial-gradient(ellipse 66% 86% at 50% 100%, #000 18%, transparent 74%);
          mask-image: radial-gradient(ellipse 66% 86% at 50% 100%, #000 18%, transparent 74%);
        }
        @media (max-width: 640px) {
          .brand-signoff { min-height: 200px; }
          .brand-signoff-glass .glass-surface-content { padding: 3.5rem 1rem 1.5rem; }
          .brand-signoff-speed { height: 64px; opacity: 0.16; }
        }
      `}</style>
    </section>
  );
}
