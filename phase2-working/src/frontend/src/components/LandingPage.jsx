// Landing page — premium liquid-glass facelift.
// Behaviour is unchanged: same props, same navigation targets, same feature copy.
// Presentation only: one accent, no icons, no pill tags, scroll-linked hero.
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useSpring, useReducedMotion } from 'framer-motion';
import RippleDistortion from './RippleDistortion';
import api from '../lib/api.js';


const FEATURES = [
  {
    id: 'half-life',
    label: 'HALF-LIFE DECAY',
    title: 'Thoughts that matter survive.',
    body: 'Every thought gets a half-life. Urgent ones escalate. Vague ones fade. Your cognitive load stays manageable — automatically.',
  },
  {
    id: 'commitment',
    label: 'COMMITMENT WITNESS',
    title: 'Your promises have accountability.',
    body: 'When you say "I will", we remember. Nudged before the deadline — not after. Commitments become actions, not regrets.',
  },
  {
    id: 'drift',
    label: 'DRIFT DETECTOR',
    title: 'Stay on the signal, not the noise.',
    body: 'Detects when your focus drifts from what matters. Sends a soft course-correction nudge before you lose the thread entirely.',
  },
  {
    id: 'memory',
    label: 'LIVING MEMORY GRAPH',
    title: 'Your past thoughts fuel your future ones.',
    body: 'Semantically indexed memory. Every thought is embedded, clustered, and surfaced when you need it — not just stored and forgotten.',
  },
  {
    id: 'geofence',
    label: 'LOCATION CONTEXT',
    title: 'Spatial intelligence for your brain.',
    body: 'Leave home, get a departure brief. Arrive at the office, pending items surface. Location is context. We treat it that way.',
  },
  {
    id: 'channels',
    label: 'REACH YOU ANYWHERE',
    title: 'Your nudges, your channel.',
    body: 'Telegram, Discord, Slack, Email, or browser push — bring your own bot or use ours. You control where your mind gets pinged.',
  },
  {
    id: 'thinking',
    label: 'I AM THINKING',
    title: 'A live map of your brain.',
    body: 'Watch your thoughts swirl and cluster in real-time. Hover over the vortex to instantly see where your cognitive energy is focused.',
  }
];

const STATS = [
  { value: '8', unit: 'cognitive engines', label: 'working in parallel' },
  { value: '< 50ms', unit: 'thought classification', label: 'not minutes — milliseconds' },
  { value: 'decay', unit: 'half-life model', label: 'your thoughts age gracefully' },
];

const EASE = [0.22, 0.61, 0.36, 1];

const HEAD_LINES = [
  ['Your', 'thoughts', 'have'],
  ['a half-life.'],
  ['Let', 'the', 'best', 'survive.'],
];

export default function LandingPage({ onNavigate, isLoggedIn }) {
  const [activeFeature, setActiveFeature] = useState(0);
  const heroRef = useRef(null);
  const stageRef = useRef(null);
  const reduce = useReducedMotion();

  // Updates Form State
  const [subEmail, setSubEmail] = useState('');
  const [subName, setSubName] = useState('');
  const [subCountry, setSubCountry] = useState('');
  const [subStatus, setSubStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'
  const [subMsg, setSubMsg] = useState('');

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  // smooth-scroll feel: spring-damped progress instead of raw scroll
  const p = useSpring(scrollYProgress, { stiffness: 90, damping: 26, mass: 0.35 });

  // 2D only — no 3D camera, no stage bending. Gentle rise + fade on scroll.
  const heroY = useTransform(p, [0, 1], reduce ? ['0%', '0%'] : ['0%', '-9%']);
  const heroFade = useTransform(p, [0, 0.9], [1, 0.08]);
  const nextY = useTransform(p, [0.2, 1], reduce ? [0, 0] : [90, 0]);
  const nextScale = useTransform(p, [0.2, 1], reduce ? [1, 1] : [0.96, 1]);
  const nextFade = useTransform(p, [0.25, 0.95], [0.15, 1]);


  // pointer-driven parallax — a flat 2D drift, no rotation, no bend
  const px = useSpring(0, { stiffness: 70, damping: 20, mass: 0.4 });
  const py = useSpring(0, { stiffness: 70, damping: 20, mass: 0.4 });
  const stageX = useTransform(px, [-1, 1], reduce ? [0, 0] : [-10, 10]);
  const stageY = useTransform(py, [-1, 1], reduce ? [0, 0] : [6, -6]);
  const glowX = useTransform(px, [-1, 1], ['38%', '62%']);
  const glowY = useTransform(py, [-1, 1], ['38%', '62%']);

  useEffect(() => {
    if (reduce) return;
    const onMove = e => {
      const el = stageRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      px.set(((e.clientX - r.left) / r.width) * 2 - 1);
      py.set(((e.clientY - r.top) / r.height) * 2 - 1);
    };
    const onLeave = () => {
      px.set(0);
      py.set(0);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerleave', onLeave);
    };
  }, [reduce, px, py]);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature(f => (f + 1) % FEATURES.length);
    }, 5200);
    return () => clearInterval(interval);
  }, []);

  const feat = FEATURES[activeFeature];
  let wordIndex = 0;

  return (
    <div className="tg-landing">
      {/* ── HERO — 3D stage, spring-smoothed scroll camera ── */}
      <section ref={heroRef} className="tg-landing-hero">
        <motion.div
          ref={stageRef}
          className="tg-landing-stage"
          style={{
            x: stageX,
            y: heroY,
            opacity: heroFade,
          }}
        >
          <motion.div
            className="tg-landing-aura"
            style={{ left: glowX, top: glowY }}
            animate={reduce ? {} : { opacity: [0.18, 0.32, 0.18], scale: [1, 1.06, 1] }}
            transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
            aria-hidden="true"
          />

          <motion.h1 className="tg-landing-headline">
            {HEAD_LINES.map((line, li) => (
              <span className="tg-headline-line" key={li}>
                {line.map(word => {
                  const i = wordIndex++;
                  const accent = word === 'a half-life.';
                  return (
                    <motion.span
                      className={accent ? 'tg-headline-word tg-headline-word--accent' : 'tg-headline-word'}
                      key={word}
                      initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
                      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                      transition={{ duration: 1.1, delay: 0.12 + i * 0.075, ease: EASE }}
                    >
                      {word}
                    </motion.span>
                  );
                })}
              </span>
            ))}
          </motion.h1>

          <motion.p
            style={{
              font: 'var(--md-sys-typescale-body-large)',
              color: 'var(--md-sys-color-outline)',
              marginTop: '1.5rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              textAlign: 'center',
              zIndex: 2,
              position: 'relative'
            }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5, ease: EASE }}
          >
            Clear the Mental fog
          </motion.p>

          <motion.div
            className="tg-landing-ctas"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.6, ease: EASE }}
          >
            <button
              className="tg-btn tg-btn--primary lg-hover"
              onClick={() => onNavigate(isLoggedIn ? 'dashboard' : 'auth')}
            >
              {isLoggedIn ? 'Open your dashboard' : 'Start for free'}
            </button>
            <button
              className="tg-btn tg-btn--quiet lg-hover"
              onClick={() => onNavigate('how-it-works')}
            >
              See how it works
            </button>
          </motion.div>

          {/* ambient displacement layer — no visible plate, hover ripple retained */}
          <motion.div
            className="tg-landing-field"
            style={{ y: stageY }}
            initial={{ opacity: 0 }}
            animate={reduce ? { opacity: 0.16 } : { opacity: [0.11, 0.2, 0.11] }}
            transition={
              reduce
                ? { duration: 0.5 }
                : { duration: 13, repeat: Infinity, ease: 'easeInOut', delay: 0.9 }
            }
            aria-hidden="true"
          >
            <RippleDistortion
              src="/abstract_neural.png"
              brushSize={165}
              strength={0.22}
              swirl={1}
              rings={3}
              grayscale
              spread={7.75}
              fade={3.3}
              spacing={18}
              dispersion={1}
              glint={1.05}
              highlightColor="#84CC16"
              trigger="hover"
              clickStrength={3.5}
              quality="high"
              enabled
            />
          </motion.div>


          <motion.div
            className="tg-landing-stats"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.9, delay: 0.8, ease: EASE }}
          >
            {STATS.map((s) => (
              <div key={s.unit} className="tg-landing-stat">
                <div className="tg-landing-stat-value">{s.value}</div>
                <div className="tg-landing-stat-unit">{s.unit}</div>
                <div className="tg-landing-stat-note">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ── FEATURES — rises out of Z as the hero recedes (one continuous camera) ── */}
      <motion.section
        className="tg-landing-section tg-landing-arrive"
        style={{ y: nextY, opacity: nextFade, scale: nextScale }}
      >
        <motion.p
          className="tg-eyebrow tg-landing-section-label"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          The cognitive engine
        </motion.p>

        <div className="tg-landing-grid">
          <div className="tg-landing-list">
            {FEATURES.map((f, i) => (
              <button
                key={f.id}
                onClick={() => setActiveFeature(i)}
                aria-pressed={i === activeFeature}
                className={`tg-landing-item lg-hover${i === activeFeature ? ' is-active' : ''}`}
              >
                <span className="tg-landing-item-label">{f.label}</span>
                <span className="tg-landing-item-title">{f.title}</span>
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={feat.id}
              className="tg-landing-panel"
              initial={{ opacity: 0, y: 16, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -10, filter: 'blur(8px)' }}
              transition={{ duration: 0.45, ease: EASE }}
            >
              <div>
                <div className="tg-landing-panel-label">{feat.label}</div>
                <h3 className="tg-landing-panel-title">{feat.title}</h3>
                <p className="tg-landing-panel-body">{feat.body}</p>
              </div>
              <div className="tg-landing-progress" role="presentation">
                {FEATURES.map((f, i) => (
                  <span
                    key={f.id}
                    onClick={() => setActiveFeature(i)}
                    className={`tg-landing-progress-step${i === activeFeature ? ' is-active' : ''}`}
                  />
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.section>

      {/* ── TRUST ── */}
      <section className="tg-landing-section tg-landing-section--tight">
        <div className="tg-landing-trust">
          {[
            ['Your data stays yours', 'Bring your own keys and channels. Nothing is resold, nothing is trained on.'],
            ['Built for real load', 'Thought classification in under fifty milliseconds, running eight engines in parallel.'],
            ['Free to begin', 'No card, no setup call, no onboarding maze. Capture your first thought in a minute.'],
          ].map(([title, body]) => (
            <motion.div
              key={title}
              className="tg-landing-trust-item"
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6, ease: EASE }}
            >
              <div className="tg-landing-trust-title">{title}</div>
              <p className="tg-landing-trust-body">{body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── UPDATES & NEWSLETTER SIGNUP ── */}
      <section className="tg-landing-section" style={{ padding: '4rem 1rem', maxWidth: '640px', margin: '0 auto' }}>
        <motion.div
          className="glass-strong card-reveal"
          style={{
            borderRadius: 'var(--md-sys-shape-extra-large)',
            padding: '2.5rem',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            position: 'relative',
            overflow: 'hidden'
          }}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.8, ease: EASE }}
        >
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <span style={{ display: 'inline-block', font: '700 11px/1 Inter', letterSpacing: '0.12em', color: '#ccff00', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Stay Synced</span>
            <h2 style={{ font: 'var(--md-sys-typescale-headline-small)', margin: '0 0 0.5rem', color: '#f0f4ee' }}>Get News & UnZonko updates</h2>
            <p style={{ font: 'var(--md-sys-typescale-body-medium)', color: 'var(--md-sys-color-on-surface-variant)', margin: 0 }}>Subscribe to product releases, cognitive hacks, and feature previews.</p>
          </div>

          {subStatus === 'success' ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ textAlign: 'center', padding: '1.5rem', background: 'rgba(204,255,0,0.06)', borderRadius: 'var(--md-sys-shape-medium)', border: '1px solid rgba(204,255,0,0.2)' }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '36px', color: '#ccff00', marginBottom: '0.5rem' }}>mark_email_read</span>
              <p style={{ font: 'var(--md-sys-typescale-body-large)', color: '#f0f4ee', margin: '0 0 4px', fontWeight: 'bold' }}>You're on the list!</p>
              <p style={{ font: 'var(--md-sys-typescale-body-medium)', color: 'var(--md-sys-color-on-surface-variant)', margin: 0 }}>{subMsg || 'Check your email for confirmation.'}</p>
            </motion.div>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!subEmail || !subEmail.includes('@')) {
                  setSubStatus('error');
                  setSubMsg('Please enter a valid email address.');
                  return;
                }
                setSubStatus('loading');
                try {
                  const resp = await api.post('/billing/waitlist', {
                    email: subEmail,
                    name: subName || undefined,
                    country: subCountry || undefined,
                    tier: 'updates'
                  });
                  if (resp.error) {
                    setSubStatus('error');
                    setSubMsg(resp.error);
                  } else {
                    setSubStatus('success');
                    setSubMsg(resp.message);
                  }
                } catch (err) {
                  setSubStatus('error');
                  setSubMsg(err.message || 'Something went wrong.');
                }
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ font: 'var(--md-sys-typescale-label-medium)', color: 'var(--md-sys-color-on-surface-variant)', display: 'block', marginBottom: '0.35rem' }}>Name</label>
                  <input
                    type="text"
                    className="input-m3"
                    placeholder="Jane Doe"
                    value={subName}
                    onChange={(e) => setSubName(e.target.value)}
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}
                  />
                </div>
                <div>
                  <label style={{ font: 'var(--md-sys-typescale-label-medium)', color: 'var(--md-sys-color-on-surface-variant)', display: 'block', marginBottom: '0.35rem' }}>Country</label>
                  <input
                    type="text"
                    className="input-m3"
                    placeholder="United States"
                    value={subCountry}
                    onChange={(e) => setSubCountry(e.target.value)}
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ font: 'var(--md-sys-typescale-label-medium)', color: 'var(--md-sys-color-on-surface-variant)', display: 'block', marginBottom: '0.35rem' }}>Email <span style={{ color: 'var(--md-sys-color-error)' }}>*</span></label>
                <input
                  type="email"
                  required
                  className="input-m3"
                  placeholder="jane@example.com"
                  value={subEmail}
                  onChange={(e) => setSubEmail(e.target.value)}
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}
                />
              </div>

              {subStatus === 'error' && (
                <div style={{ padding: '0.75rem', borderRadius: 'var(--md-sys-shape-small)', background: 'rgba(255,138,158,.1)', color: 'var(--md-sys-color-error)', font: 'var(--md-sys-typescale-body-small)' }}>
                  {subMsg}
                </div>
              )}

              <button
                type="submit"
                className="btn-m3 btn-filled lg-hover"
                disabled={subStatus === 'loading'}
                style={{ width: '100%', height: '48px', fontWeight: 'bold', marginTop: '0.5rem' }}
              >
                {subStatus === 'loading' ? 'Subscribing...' : 'Keep Me Updated'}
              </button>

              <p style={{ font: 'var(--md-sys-typescale-body-small)', color: 'var(--md-sys-color-outline)', margin: '0.5rem 0 0', textAlign: 'center', fontSize: '11px', lineHeight: '1.4' }}>
                By subscribing, you agree to our <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('legal'); }} style={{ textDecoration: 'underline', color: 'var(--md-sys-color-primary)' }}>Privacy Policy & Disclaimers</a>. We collect names, emails, and country details solely for communications, news, and waitlist management.
              </p>
            </form>
          )}
        </motion.div>
      </section>

      {/* ── CLOSING ── */}
      <section className="tg-landing-section tg-landing-close">
        <motion.h2
          className="tg-landing-close-title"
          initial={{ opacity: 0, y: 20, filter: 'blur(12px)' }}
          whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.9, ease: EASE }}
        >
          Your cognitive load deserves <em>a smarter system.</em>
        </motion.h2>
        <button
          className="tg-btn tg-btn--primary lg-hover"
          onClick={() => onNavigate(isLoggedIn ? 'dashboard' : 'auth')}
        >
          {isLoggedIn ? 'Open your dashboard' : 'Start capturing your thoughts'}
        </button>
      </section>

    </div>
  );
}
