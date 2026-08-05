import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import RippleDistortion from './RippleDistortion';

const FEATURES = [
  {
    id: 'half-life',
    label: 'HALF-LIFE DECAY',
    color: '#ccff00',
    glow: 'rgba(204,255,0,0.25)',
    border: 'rgba(204,255,0,0.2)',
    title: 'Thoughts that matter survive.',
    body: 'Every thought gets a half-life. Urgent ones escalate. Vague ones fade. Your cognitive load stays manageable — automatically.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>
      </svg>
    ),
  },
  {
    id: 'commitment',
    label: 'COMMITMENT WITNESS',
    color: '#a3e635',
    glow: 'rgba(163,230,53,0.2)',
    border: 'rgba(163,230,53,0.2)',
    title: 'Your promises have accountability.',
    body: 'When you say "I will", we remember. Nudged before the deadline — not after. Commitments become actions, not regrets.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="9"/>
      </svg>
    ),
  },
  {
    id: 'drift',
    label: 'DRIFT DETECTOR',
    color: '#60a5fa',
    glow: 'rgba(96,165,250,0.2)',
    border: 'rgba(96,165,250,0.2)',
    title: 'Stay on the signal, not the noise.',
    body: 'Detects when your focus drifts from what matters. Sends a soft course-correction nudge before you lose the thread entirely.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
      </svg>
    ),
  },
  {
    id: 'memory',
    label: 'LIVING MEMORY GRAPH',
    color: '#e879f9',
    glow: 'rgba(232,121,249,0.2)',
    border: 'rgba(232,121,249,0.2)',
    title: 'Your past thoughts fuel your future ones.',
    body: 'Semantically indexed memory. Every thought is embedded, clustered, and surfaced when you need it — not just stored and forgotten.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="4" r="2"/><circle cx="4" cy="20" r="2"/><circle cx="20" cy="20" r="2"/>
        <path d="M12 6v4M6 18l5-4M18 18l-5-4"/>
      </svg>
    ),
  },
  {
    id: 'geofence',
    label: 'LOCATION CONTEXT',
    color: '#34d399',
    glow: 'rgba(52,211,153,0.2)',
    border: 'rgba(52,211,153,0.2)',
    title: 'Spatial intelligence for your brain.',
    body: 'Leave home → get a departure brief. Arrive at the office → pending items surface. Location is context. We treat it that way.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/>
      </svg>
    ),
  },
  {
    id: 'channels',
    label: 'REACH YOU ANYWHERE',
    color: '#f97316',
    glow: 'rgba(249,115,22,0.2)',
    border: 'rgba(249,115,22,0.2)',
    title: 'Your nudges, your channel.',
    body: 'Telegram, Discord, Slack, Email, or browser push — bring your own bot or use ours. You control where your mind gets pinged.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M22 2L11 13"/><path d="M22 2L15 22 11 13 2 9l20-7z"/>
      </svg>
    ),
  },
];

const STATS = [
  { value: '8', unit: 'cognitive engines', label: 'working in parallel' },
  { value: '< 50ms', unit: 'thought classification', label: 'not minutes — milliseconds' },
  { value: '∞', unit: 'half-life decay', label: 'your thoughts age gracefully' },
];

export default function LandingPage({ onNavigate, isLoggedIn }) {
  const [activeFeature, setActiveFeature] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const interval = setInterval(() => {
      setActiveFeature(f => (f + 1) % FEATURES.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const feat = FEATURES[activeFeature];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'transparent',
      color: '#fff',
      fontFamily: "'Space Grotesk', 'Inter', sans-serif",
      overflowX: 'hidden',
      position: 'relative',
      isolation: 'isolate',
    }}>
      {/* Ambient glow orbs (violet + lime — NeoPOP range behind the glass) */}
      <div aria-hidden="true" style={{
        position: 'absolute', top: '-6rem', left: '12%', width: '30rem', height: '30rem',
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(106,53,255,0.16), transparent 60%)',
        filter: 'blur(80px)', pointerEvents: 'none', zIndex: 0,
      }}/>
      <div aria-hidden="true" style={{
        position: 'absolute', top: '18rem', right: '-8rem', width: '26rem', height: '26rem',
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(204,255,0,0.12), transparent 60%)',
        filter: 'blur(90px)', pointerEvents: 'none', zIndex: 0,
      }}/>

      {/* ── NAV — Liquid Glass bar (non-sticky: the app's own top-bar is the sticky layer) ── */}
      <nav style={{
        position: 'relative', zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '1rem 2.5rem',
        background: 'rgba(10,10,13,0.55)',
        backdropFilter: 'blur(26px) saturate(185%)',
        WebkitBackdropFilter: 'blur(26px) saturate(185%)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 12,
            background: 'linear-gradient(145deg, #d6ff3e 0%, #ccff00 55%, #b3e600 100%)',
            border: '1px solid rgba(255,255,255,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 700, color: '#0a0a0a',
            fontStyle: 'italic',
            boxShadow: '4px 4px 0 0 rgba(0,0,0,0.4), 0 0 24px rgba(204,255,0,0.4), inset 0 1px 0 rgba(255,255,255,0.5)',
          }}>t</div>
          <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.02em', color: '#f0f0f0' }}>
            Thought GPS
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          {isLoggedIn ? (
            <button
              onClick={() => onNavigate('dashboard')}
              style={navBtnStyle}
            >Dashboard</button>
          ) : (
            <>
              <button onClick={() => onNavigate('auth')} style={navBtnStyle}>Sign In</button>
              <button
                onClick={() => onNavigate('auth')}
                style={{
                  ...navBtnStyle,
                  background: '#ccff00', color: '#0a0a0a',
                  borderRadius: 100, fontWeight: 700, padding: '0.5rem 1.25rem',
                }}
              >Get Started →</button>
            </>
          )}
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{
        position: 'relative', zIndex: 1,
        minHeight: '92vh',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', padding: '4rem 1.5rem 2rem',
      }}>
        {/* Status badge */}
        <motion.div
          className="glow-ring"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(204,255,0,0.08)',
            border: '1px solid rgba(204,255,0,0.2)',
            borderRadius: 100, padding: '0.35rem 1rem 0.35rem 0.5rem',
            marginBottom: '2rem',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)',
          }}
        >
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: '#ccff00',
            boxShadow: '0 0 8px #ccff00',
            display: 'inline-block',
            animation: 'pulse 2s infinite',
          }}/>
          <span style={{ fontSize: 12, color: '#ccff00', fontWeight: 600, letterSpacing: '0.08em' }}>
            COGNITIVE COPROCESSOR · ONLINE
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35 }}
          style={{
            fontSize: 'clamp(2.8rem, 8vw, 6.5rem)',
            fontWeight: 700,
            lineHeight: 1.0,
            letterSpacing: '-0.04em',
            maxWidth: 900,
            margin: '0 auto 1.5rem',
          }}
        >
          Your thoughts have{' '}
          <span style={{ color: '#ccff00', fontStyle: 'italic', textShadow: '0 0 24px rgba(204,255,0,0.55), 0 0 64px rgba(204,255,0,0.3)' }}>a half-life.</span>
          <br />Let the best survive.
        </motion.h1>

        {/* Ripple Distortion Component */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          style={{
             width: '100%',
             maxWidth: '800px',
             height: '450px',
             margin: '0 auto 3rem auto',
             borderRadius: '24px',
             overflow: 'hidden',
             boxShadow: '0 24px 64px -16px rgba(204,255,0,0.15)',
             border: '1px solid rgba(255,255,255,0.08)',
             maskImage: 'radial-gradient(ellipse at center, black 25%, transparent 80%)',
             WebkitMaskImage: 'radial-gradient(ellipse at center, black 25%, transparent 80%)'
          }}
        >
          <RippleDistortion
            src="/abstract_neural.png"
            brushSize={145}
            strength={0.2}
            swirl={1}
            rings={3}
            grayscale
            spread={7.75}
            fade={3.3}
            spacing={18}
            dispersion={1}
            glint={1.05}
            tint="#a855f7"
            tintAmount={0.08}
            highlightColor="#84CC16"
            trigger="hover"
            clickStrength={3.5}
            quality="high"
            enabled
          />
        </motion.div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}
        >
          <button
            onClick={() => onNavigate('auth')}
            style={{
              background: 'linear-gradient(145deg, #d6ff3e 0%, #ccff00 55%, #b3e600 100%)', color: '#0a0a0a',
              border: '1px solid rgba(255,255,255,0.4)', borderBottom: '1px solid rgba(0,0,0,0.25)',
              borderRadius: 100,
              padding: '0.85rem 2rem', fontSize: 15, fontWeight: 700,
              cursor: 'pointer', letterSpacing: '-0.01em',
              transition: 'transform 0.16s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s',
              boxShadow: '6px 6px 0 0 rgba(0,0,0,0.5), 0 0 44px rgba(204,255,0,0.4)',
            }}
            onMouseEnter={e => { e.target.style.transform = 'translate(-2px,-2px)'; e.target.style.boxShadow = '8px 8px 0 0 rgba(0,0,0,0.5), 0 0 60px rgba(204,255,0,0.6)'; }}
            onMouseLeave={e => { e.target.style.transform = 'translate(0,0)'; e.target.style.boxShadow = '6px 6px 0 0 rgba(0,0,0,0.5), 0 0 44px rgba(204,255,0,0.4)'; }}
            onMouseDown={e => { e.target.style.transform = 'translate(3px,3px)'; e.target.style.boxShadow = '2px 2px 0 0 rgba(0,0,0,0.5), 0 0 30px rgba(204,255,0,0.45)'; }}
            onMouseUp={e => {
              if (e.target.matches(':hover')) {
                e.target.style.transform = 'translate(-2px,-2px)';
                e.target.style.boxShadow = '8px 8px 0 0 rgba(0,0,0,0.5), 0 0 60px rgba(204,255,0,0.6)';
              } else {
                e.target.style.transform = 'translate(0,0)';
                e.target.style.boxShadow = '6px 6px 0 0 rgba(0,0,0,0.5), 0 0 44px rgba(204,255,0,0.4)';
              }
            }}
          >
            Start for free →
          </button>
          <button
            onClick={() => onNavigate('how-it-works')}
            style={{
              background: 'rgba(255,255,255,0.05)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.14)',
              borderRadius: 100,
              padding: '0.85rem 2rem', fontSize: 15, fontWeight: 500,
              cursor: 'pointer',
              backdropFilter: 'blur(18px) saturate(170%)',
              WebkitBackdropFilter: 'blur(18px) saturate(170%)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.16), 0 12px 32px -12px rgba(0,0,0,0.6)',
              transition: 'background 0.2s, box-shadow 0.2s, transform 0.16s cubic-bezier(0.34,1.56,0.64,1)',
            }}
            onMouseEnter={e => { e.target.style.background = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.22), 0 0 30px -6px rgba(106,53,255,0.5), 0 14px 36px -12px rgba(0,0,0,0.6)'; }}
            onMouseLeave={e => { e.target.style.background = 'rgba(255,255,255,0.05)'; e.target.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.16), 0 12px 32px -12px rgba(0,0,0,0.6)'; }}
          >
            See how it works
          </button>
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.0 }}
          style={{
            display: 'flex', gap: '3rem', flexWrap: 'wrap',
            justifyContent: 'center', marginTop: '4rem',
          }}
        >
          {STATS.map((s, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: 700, letterSpacing: '-0.03em', color: '#fff', textShadow: '0 0 24px rgba(204,255,0,0.35)' }}>
                {s.value}
              </div>
              <div style={{ fontSize: 11, color: '#ccff00', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2, textShadow: '0 0 12px rgba(204,255,0,0.5)' }}>
                {s.unit}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{s.label}</div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ── FEATURES ── */}
      <section style={{
        position: 'relative', zIndex: 1,
        padding: 'clamp(3rem, 8vw, 7rem) clamp(1.5rem, 5vw, 5rem)',
      }}>
        {/* Section label */}
        <div style={{
          fontFamily: 'monospace', fontSize: 11, letterSpacing: '0.12em',
          color: 'rgba(255,255,255,0.35)', marginBottom: '3rem', textAlign: 'center',
          textTransform: 'uppercase',
        }}>
          // COGNITIVE ENGINE
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: '2rem', maxWidth: 1100, margin: '0 auto',
          alignItems: 'start',
        }}>
          {/* Left: Feature selector list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {FEATURES.map((f, i) => (
              <button
                key={f.id}
                onClick={() => setActiveFeature(i)}
                style={{
                  textAlign: 'left',
                  border: `1px solid ${i === activeFeature ? f.border : 'rgba(255,255,255,0.07)'}`,
                  borderRadius: 16, padding: '1rem 1.25rem',
                  cursor: 'pointer', transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
                  background: i === activeFeature
                    ? `linear-gradient(180deg, rgba(${hexToRgb(f.color)}, 0.08), rgba(${hexToRgb(f.color)}, 0.02))`
                    : 'rgba(255,255,255,0.025)',
                  backdropFilter: 'blur(18px) saturate(170%)',
                  WebkitBackdropFilter: 'blur(18px) saturate(170%)',
                  boxShadow: i === activeFeature
                    ? `6px 6px 0 0 rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1), 0 0 34px -8px ${f.glow}`
                    : 'inset 0 1px 0 rgba(255,255,255,0.06)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{
                    fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.1em',
                    color: i === activeFeature ? f.color : 'rgba(255,255,255,0.3)',
                    transition: 'color 0.2s',
                  }}>
                    {f.label}
                  </span>
                  {i === activeFeature && (
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: f.color,
                      boxShadow: `0 0 6px ${f.color}`,
                      display: 'inline-block',
                    }}/>
                  )}
                </div>
                {i === activeFeature && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    style={{ marginTop: '0.5rem' }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 4 }}>{f.title}</div>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>{f.body}</div>
                  </motion.div>
                )}
              </button>
            ))}
          </div>

          {/* Right: Animated feature display */}
          <AnimatePresence mode="wait">
            <motion.div
              key={feat.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.35 }}
              style={{
                border: `1px solid ${feat.border}`,
                borderRadius: 24,
                padding: '2.5rem',
                background: `linear-gradient(180deg, rgba(${hexToRgb(feat.color)}, 0.08), rgba(${hexToRgb(feat.color)}, 0.02))`,
                backdropFilter: 'blur(26px) saturate(185%)',
                WebkitBackdropFilter: 'blur(26px) saturate(185%)',
                minHeight: 340,
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                boxShadow: `8px 8px 0 0 rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.14), 0 24px 60px -16px rgba(0,0,0,0.55), 0 0 60px -14px ${feat.glow}`,
              }}
            >
              <div>
                <div style={{
                  width: 52, height: 52, borderRadius: 14,
                  background: `rgba(${hexToRgb(feat.color)}, 0.12)`,
                  border: `1px solid ${feat.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: feat.color, marginBottom: '1.5rem',
                  boxShadow: `4px 4px 0 0 rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.18), 0 0 22px -4px ${feat.glow}`,
                }}>
                  {feat.icon}
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: 10, color: feat.color, letterSpacing: '0.1em', marginBottom: '0.75rem' }}>
                  {feat.label}
                </div>
                <h3 style={{ fontSize: 'clamp(1.4rem, 2.5vw, 2rem)', fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.03em', marginBottom: '1rem' }}>
                  {feat.title}
                </h3>
                <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7 }}>
                  {feat.body}
                </p>
              </div>
              {/* Feature dot indicator */}
              <div style={{ marginTop: '2rem', display: 'flex', gap: 6 }}>
                {FEATURES.map((_, i) => (
                  <div
                    key={i}
                    onClick={() => setActiveFeature(i)}
                    style={{
                      width: i === activeFeature ? 20 : 6,
                      height: 6, borderRadius: 999,
                      background: i === activeFeature ? feat.color : 'rgba(255,255,255,0.15)',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* ── CTA FOOTER ── */}
      <div className="gradient-rule" style={{ maxWidth: 900, margin: '0 auto' }} aria-hidden="true"/>
      <section style={{
        position: 'relative', zIndex: 1,
        padding: 'clamp(4rem, 10vw, 8rem) 1.5rem',
        textAlign: 'center',
      }}>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{
            fontSize: 'clamp(2rem, 5vw, 4rem)',
            fontWeight: 700, letterSpacing: '-0.04em',
            marginBottom: '1rem', lineHeight: 1.1,
          }}
        >
          Your cognitive load deserves <br />
          <span style={{ color: '#ccff00', fontStyle: 'italic', textShadow: '0 0 24px rgba(204,255,0,0.55), 0 0 64px rgba(204,255,0,0.3)' }}>a smarter system.</span>
        </motion.h2>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.45)', marginBottom: '2.5rem' }}>
          Free to start. No credit card. No setup required.
        </p>
        <button
          onClick={() => onNavigate('auth')}
          style={{
            background: 'linear-gradient(145deg, #d6ff3e 0%, #ccff00 55%, #b3e600 100%)', color: '#0a0a0a',
            border: '1px solid rgba(255,255,255,0.4)', borderBottom: '1px solid rgba(0,0,0,0.25)',
            borderRadius: 100,
            padding: '1rem 2.5rem', fontSize: 16, fontWeight: 700,
            cursor: 'pointer', letterSpacing: '-0.01em',
            boxShadow: '7px 7px 0 0 rgba(0,0,0,0.5), 0 0 52px rgba(204,255,0,0.45)',
            transition: 'transform 0.16s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s',
          }}
          onMouseEnter={e => { e.target.style.transform = 'translate(-2px,-2px)'; e.target.style.boxShadow = '9px 9px 0 0 rgba(0,0,0,0.5), 0 0 70px rgba(204,255,0,0.65)'; }}
          onMouseLeave={e => { e.target.style.transform = 'translate(0,0)'; e.target.style.boxShadow = '7px 7px 0 0 rgba(0,0,0,0.5), 0 0 52px rgba(204,255,0,0.45)'; }}            onMouseDown={e => { e.target.style.transform = 'translate(4px,4px)'; e.target.style.boxShadow = '2px 2px 0 0 rgba(0,0,0,0.5), 0 0 32px rgba(204,255,0,0.5)'; }}
            onMouseUp={e => {
              if (e.target.matches(':hover')) {
                e.target.style.transform = 'translate(-2px,-2px)';
                e.target.style.boxShadow = '9px 9px 0 0 rgba(0,0,0,0.5), 0 0 70px rgba(204,255,0,0.65)';
              } else {
                e.target.style.transform = 'translate(0,0)';
                e.target.style.boxShadow = '7px 7px 0 0 rgba(0,0,0,0.5), 0 0 52px rgba(204,255,0,0.45)';
              }
            }}
        >
          Start capturing your thoughts →
        </button>
        <p style={{ marginTop: '1.25rem', fontSize: 12, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.05em' }}>
          THOUGHT GPS · COGNITIVE COPROCESSOR · v3.0
        </p>
      </section>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @media(max-width:768px){
          .feat-grid{grid-template-columns:1fr !important}
        }
      `}</style>
    </div>
  );
}

const navBtnStyle = {
  background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)',
  fontSize: 14, fontWeight: 500, padding: '0.5rem 0.875rem',
  cursor: 'pointer', borderRadius: 8, transition: 'color 0.15s',
};

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}
