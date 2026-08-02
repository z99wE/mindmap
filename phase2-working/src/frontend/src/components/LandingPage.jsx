import React, { useState } from 'react';
import { motion } from 'framer-motion';
import FadingVideo from './FadingVideo.jsx';
import BlurText from './BlurText.jsx';
import InfiniteMenu from './InfiniteMenu.jsx';
import Strands from './Strands.jsx';
import DecryptedText from './DecryptedText.jsx';
import Dither from './Dither.jsx';

export default function LandingPage({ onNavigate, isLoggedIn }) {
  const [showMenu, setShowMenu] = useState(false);

  const menuItems = [
    {
      image: 'https://picsum.photos/400/400?random=1',
      link: 'home',
      title: 'Home',
      description: 'Back to the start.'
    },
    {
      image: 'https://picsum.photos/400/400?random=2',
      link: 'dashboard',
      title: 'Dashboard',
      description: 'Your main cognitive board.'
    },
    {
      image: 'https://picsum.photos/400/400?random=3',
      link: 'interactive-space',
      title: 'Chat Space',
      description: 'Talk to your memory coprocessor.'
    },
    {
      image: 'https://picsum.photos/400/400?random=4',
      link: 'map-my-mind',
      title: 'Mind Map',
      description: 'Explore connections.'
    },
    {
      image: 'https://picsum.photos/400/400?random=5',
      link: 'mission-control',
      title: 'Mission Control',
      description: 'System metrics and prompts.'
    },
    {
      image: 'https://picsum.photos/400/400?random=6',
      link: 'thought-afterlife',
      title: 'Afterlife',
      description: 'View decaying thoughts.'
    }
  ];

  const handleMenuSelect = (item) => {
    setShowMenu(false);
    if (onNavigate) onNavigate(item.link);
  };

  return (
    <div className="relative min-h-screen bg-black text-white font-body selection:bg-cyan-500 selection:text-black overflow-hidden">
      {/* Dynamic Strands Background (ambient space glow) */}
      <div className="fixed inset-0 pointer-events-none z-10 opacity-30">
        <Strands
          colors={["#00f3ff", "#ff0055", "#39ff14", "#8b00ff"]}
          count={5}
          speed={0.6}
          amplitude={1.2}
          waviness={3.0}
          thickness={0.8}
          glow={3.0}
          scale={2.0}
          opacity={0.7}
        />
      </div>

      {/* ── SECTION 1: HERO ── */}
      <section className="relative h-screen w-full flex flex-col justify-between overflow-hidden">
        {/* Background Waves (Dither) */}
        <div className="absolute inset-0 w-full h-full z-0 opacity-80">
          <Dither
            waveColor={[0.0, 0.95, 1.0]}
            disableAnimation={false}
            enableMouseInteraction={true}
            mouseRadius={0.4}
            colorNum={4.6}
            waveAmplitude={0.5}
            waveFrequency={3}
            waveSpeed={0.04}
          />
        </div>

        {/* Navbar */}
        <nav className="relative z-50 flex items-center justify-between px-8 lg:px-16 pt-6">
          <div className="w-12 h-12 rounded-full liquid-glass flex items-center justify-center cursor-pointer border border-cyan-500/30">
            <span className="font-heading italic text-2xl text-cyan-400">t</span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 liquid-glass rounded-full px-2 py-1.5 border border-white/10">
            <button onClick={() => onNavigate('home')} className="px-3 py-2 text-sm font-medium text-white/90 hover:text-cyan-400">Home</button>
            <button onClick={() => setShowMenu(true)} className="px-3 py-2 text-sm font-medium text-white/90 hover:text-cyan-400">Menu Sphere</button>
            {isLoggedIn ? (
              <button onClick={() => onNavigate('dashboard')} className="px-3 py-2 text-sm font-medium text-white/90 hover:text-cyan-400">Dashboard</button>
            ) : (
              <button onClick={() => onNavigate('auth')} className="px-3 py-2 text-sm font-medium text-white/90 hover:text-cyan-400">Sign In</button>
            )}
            <button
              onClick={() => setShowMenu(true)}
              className="bg-white text-black rounded-full px-4 py-2 text-sm font-semibold hover:bg-cyan-400 transition-colors duration-300 whitespace-nowrap flex items-center gap-1"
            >
              Open Atlas <span className="text-[10px]">&#x2197;</span>
            </button>
          </div>

          <div className="w-12" /> {/* Spacer */}
        </nav>

        {/* Hero Content */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4 max-w-4xl mx-auto pt-16">
          {/* Badge */}
          <motion.div
            initial={{ filter: 'blur(10px)', opacity: 0, y: 20 }}
            animate={{ filter: 'blur(0px)', opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="liquid-glass rounded-full p-1 pr-3 flex items-center gap-2 mb-6 border border-cyan-500/20"
          >
            <span className="bg-cyan-500 text-black px-3 py-1 text-xs font-bold rounded-full animate-pulse">SYSTEM STATUS</span>
            <span className="text-xs md:text-sm text-cyan-200">Thought GPS: Cognitive Coprocessor Active</span>
          </motion.div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-heading italic text-white leading-none tracking-tight">
            <BlurText text="Your thoughts have a half-life. Let the best survive." />
          </h1>

          {/* Subheading */}
          <motion.p
            initial={{ filter: 'blur(10px)', opacity: 0, y: 20 }}
            animate={{ filter: 'blur(0px)', opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="mt-6 text-sm md:text-base text-white/80 max-w-2xl font-light leading-relaxed"
          >
            Thought GPS automatically captures, classifies, and scales your cognitive load using half-life decay. Built specifically for ADHD and neurodiverse minds to bring order to chaos.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ filter: 'blur(10px)', opacity: 0, y: 20 }}
            animate={{ filter: 'blur(0px)', opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.1 }}
            className="flex items-center gap-6 mt-8"
          >
            <button
              onClick={() => setShowMenu(true)}
              className="liquid-glass-strong rounded-full px-6 py-3 text-sm font-semibold text-white border border-cyan-400/40 hover:bg-cyan-400/20 transition-all duration-300 flex items-center gap-2 shadow-[0_0_15px_rgba(0,243,255,0.2)]"
            >
              Start Your Voyage <span className="text-cyan-400">&#x2197;</span>
            </button>
            <button
              onClick={() => onNavigate('how-it-works')}
              className="text-sm font-medium hover:text-cyan-400 transition-colors flex items-center gap-2"
            >
              <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">&#9658;</span>
              View Liftoff
            </button>
          </motion.div>

          {/* Stats Row */}
          <motion.div
            initial={{ filter: 'blur(10px)', opacity: 0, y: 20 }}
            animate={{ filter: 'blur(0px)', opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.3 }}
            className="flex flex-wrap justify-center gap-6 mt-12"
          >
            <div className="liquid-glass p-5 w-[200px] rounded-2xl border border-white/5 text-left">
              <span className="text-2xl text-cyan-400">&#9201;</span>
              <div className="text-3xl font-heading italic text-white mt-2">34.5 Min</div>
              <div className="text-xs text-white/60 mt-1">Average Videos Watch Time</div>
            </div>
            <div className="liquid-glass p-5 w-[200px] rounded-2xl border border-white/5 text-left">
              <span className="text-2xl text-pink-500">&#127760;</span>
              <div className="text-3xl font-heading italic text-white mt-2">2.8B+</div>
              <div className="text-xs text-white/60 mt-1">Users Across the Globe</div>
            </div>
          </motion.div>
        </div>

        {/* Partners */}
        <motion.div
          initial={{ filter: 'blur(10px)', opacity: 0, y: 20 }}
          animate={{ filter: 'blur(0px)', opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.4 }}
          className="relative z-10 flex flex-col items-center gap-4 pb-8"
        >
          <div className="liquid-glass rounded-full px-4 py-1 text-xs font-medium text-cyan-300 border border-cyan-500/20">
            Collaborating with top aerospace pioneers globally
          </div>
          <div className="flex items-center gap-8 md:gap-16 font-heading italic text-xl md:text-2xl text-white/60">
            <span className="hover:text-cyan-400 transition-colors">Aeon</span>
            <span className="hover:text-pink-500 transition-colors">Vela</span>
            <span className="hover:text-green-400 transition-colors">Apex</span>
            <span className="hover:text-purple-400 transition-colors">Orbit</span>
            <span className="hover:text-cyan-300 transition-colors">Zeno</span>
          </div>
        </motion.div>
      </section>

      {/* ── SECTION 2: CAPABILITIES ── */}
      <section className="relative min-h-screen w-full flex flex-col justify-between overflow-hidden bg-black py-24">
        {/* Background Video */}
        <FadingVideo
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260418_094631_d30ab262-45ee-4b7d-99f3-5d5848c8ef13.mp4"
          className="absolute inset-0 w-full h-full object-cover z-0"
        />

        <div className="relative z-10 px-8 md:px-16 lg:px-20 flex flex-col justify-between flex-1">
          {/* Header */}
          <div className="text-left">
            <span className="text-xs font-mono tracking-widest text-cyan-400 block mb-3">// CAPABILITIES</span>
            <h2 className="font-heading italic text-white text-6xl md:text-7xl lg:text-8xl leading-none tracking-tight">
              Production<br />evolved
            </h2>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
            {/* Card 1 */}
            <div className="liquid-glass rounded-2xl p-6 min-h-[360px] flex flex-col justify-between border border-cyan-500/10 hover:border-cyan-500/30 transition-all duration-300">
              <div className="flex items-start justify-between">
                <div className="w-11 h-11 rounded-xl liquid-glass flex items-center justify-center text-cyan-400 border border-cyan-500/20">
                  <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                    <path d="M5 21q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h14q.825 0 1.413.588T21 5v14q0 .825-.587 1.413T19 21H5Zm1-4h12l-3.75-5-3 4L9 13l-3 4Z" />
                  </svg>
                </div>
                <div className="flex flex-wrap justify-end gap-1.5 max-w-[70%]">
                  <span className="liquid-glass rounded-full px-2.5 py-0.5 text-[10px] text-cyan-300 border border-cyan-500/10">Natural Context</span>
                  <span className="liquid-glass rounded-full px-2.5 py-0.5 text-[10px] text-pink-300 border border-pink-500/10">Photo Realism</span>
                </div>
              </div>
              <div className="mt-8">
                <h3 className="font-heading italic text-white text-3xl tracking-tight leading-none">AI Scenery</h3>
                <p className="mt-3 text-sm text-white/70 font-light leading-relaxed">
                  AI analyzes your product to create indistinguishable natural environments — from Icelandic cliffs to misty forests.
                </p>
              </div>
            </div>

            {/* Card 2 */}
            <div className="liquid-glass rounded-2xl p-6 min-h-[360px] flex flex-col justify-between border border-pink-500/10 hover:border-pink-500/30 transition-all duration-300">
              <div className="flex items-start justify-between">
                <div className="w-11 h-11 rounded-xl liquid-glass flex items-center justify-center text-pink-400 border border-pink-500/20">
                  <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                    <path d="M4 6.47 5.76 10H20v8H4V6.47M22 4h-4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.89-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4Z" />
                  </svg>
                </div>
                <div className="flex flex-wrap justify-end gap-1.5 max-w-[70%]">
                  <span className="liquid-glass rounded-full px-2.5 py-0.5 text-[10px] text-pink-300 border border-pink-500/10">Scale Fast</span>
                  <span className="liquid-glass rounded-full px-2.5 py-0.5 text-[10px] text-green-300 border border-green-500/10">Time Saver</span>
                </div>
              </div>
              <div className="mt-8">
                <h3 className="font-heading italic text-white text-3xl tracking-tight leading-none">Batch Production</h3>
                <p className="mt-3 text-sm text-white/70 font-light leading-relaxed">
                  Style your entire product line in minutes. Create a unified visual identity for catalogues and social media without weeks of retouching.
                </p>
              </div>
            </div>

            {/* Card 3 */}
            <div className="liquid-glass rounded-2xl p-6 min-h-[360px] flex flex-col justify-between border border-green-500/10 hover:border-green-500/30 transition-all duration-300">
              <div className="flex items-start justify-between">
                <div className="w-11 h-11 rounded-xl liquid-glass flex items-center justify-center text-green-400 border border-green-500/20">
                  <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                    <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1Zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7Z" />
                  </svg>
                </div>
                <div className="flex flex-wrap justify-end gap-1.5 max-w-[70%]">
                  <span className="liquid-glass rounded-full px-2.5 py-0.5 text-[10px] text-green-300 border border-green-500/10">Ray Tracing</span>
                  <span className="liquid-glass rounded-full px-2.5 py-0.5 text-[10px] text-cyan-300 border border-cyan-500/10">Studio Quality</span>
                </div>
              </div>
              <div className="mt-8">
                <h3 className="font-heading italic text-white text-3xl tracking-tight leading-none">Smart Lighting</h3>
                <p className="mt-3 text-sm text-white/70 font-light leading-relaxed">
                  Automatic lighting and material adjustment. Achieve flawless integration with realistic shadows and sunlight.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Interactive Menu Modal Overlay ── */}
      {showMenu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md">
          <button
            onClick={() => setShowMenu(false)}
            className="absolute top-8 right-8 text-white hover:text-cyan-400 text-3xl font-heading"
          >
            CLOSE
          </button>
          <div className="w-[85vw] h-[85vh] max-w-6xl relative">
            <InfiniteMenu items={menuItems} scale={1.2} onSelect={handleMenuSelect} />
          </div>
        </div>
      )}
    </div>
  );
}
