// Home Page Component - Overhauled to match Astrix high-end monospace layout specifications
export const Home = () => {
  const container = document.createElement('div');
  container.className = 'w-full';

  container.innerHTML = `
    <!-- Astrix-Style Hero Section -->
    <div id="varda-hero" class="relative h-[90vh] w-full bg-black overflow-hidden flex flex-col justify-between pt-16">
      
      <!-- Background Image & Gradient -->
      <div class="hero-image-bg"></div>
      <div class="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent z-0"></div>

      <!-- Grid Overlay -->
      <div class="absolute inset-0 pt-16 z-10 pointer-events-none">
         <div class="w-full h-full grid grid-cols-7 grid-rows-6" style="background-size: calc(100% / 7) calc(100% / 6); 
                    background-image: linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), 
                                      linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px);
                    background-position: -1px -1px;">
         </div>
      </div>

      <!-- Title Area / Context -->
      <div class="relative z-20 w-full h-full grid grid-cols-7 grid-rows-6 pointer-events-none">
        
        <!-- Headline -->
        <div class="col-span-7 lg:col-span-4 row-span-2 lg:row-span-3 p-6 lg:p-10 flex flex-col justify-start pointer-events-auto">
          <span class="text-[9px] uppercase tracking-[0.4em] text-white/50 mb-3 font-bold">Cognitive Coprocessor</span>
          <h1 class="text-[42px] leading-[0.9] lg:text-[72px] font-black text-white tracking-tighter uppercase font-primary">
            Thought<br><span class="text-white/20">GPS</span>
          </h1>
          <p class="text-xs uppercase tracking-widest text-white/60 mt-4 max-w-sm">
            Your Mind Was Never Meant to Remember Everything. Navigate ideas like Google Maps navigates roads.
          </p>
        </div>

        <div class="hidden lg:block col-span-1 row-span-3"></div>

        <!-- Subheadline -->
        <div class="col-span-7 lg:col-span-2 row-span-2 lg:row-span-3 p-6 lg:p-10 flex flex-col justify-start pointer-events-auto">
           <p class="text-[12px] leading-normal text-white/80 font-bold uppercase tracking-widest text-left">
              Thought GPS maps your ideas, remembers context, researches the web, coordinates AI agents, and guides you from scattered thoughts to finished work.
           </p>
           
           <!-- Telemetry message indicator -->
           <div class="mt-8 flex items-center gap-3 text-green-500 font-mono text-[10px] uppercase tracking-widest">
             <span class="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_#00e676]"></span>
             <span id="telemetry-feed">Thinking...</span>
           </div>
        </div>

        <!-- Bottom Call To Actions (Row 6) -->
        <div class="hidden lg:block col-span-5 row-span-1"></div>

        <a onclick="showPage('interactive-space')" class="pointer-events-auto col-span-3 md:col-span-2 lg:col-span-1 row-span-1 p-6 flex flex-col justify-end border-t border-r border-white/10 hover:bg-white group transition-all duration-500 no-underline cursor-pointer">
          <span class="text-white font-black uppercase text-[10px] tracking-widest group-hover:text-black transition-colors duration-500 block">
            Start Navigating &rarr;
          </span>
        </a>

        <a onclick="showPage('dashboard')" class="pointer-events-auto col-span-4 md:col-span-2 lg:col-span-1 row-span-1 p-6 flex flex-col justify-end border-t border-white/10 hover:bg-white group transition-all duration-500 no-underline cursor-pointer">
          <span class="text-white font-black uppercase text-[10px] tracking-widest group-hover:text-black transition-colors duration-500 block">
            Mission Control
          </span>
        </a>
      </div>
    </div>

    <!-- Monospace Ticker Marquee -->
    <div class="w-full py-6 bg-black overflow-hidden whitespace-nowrap border-y border-white/10">
      <div class="flex gap-6 animate-marquee items-center text-[10px] uppercase tracking-[0.5em] text-white font-black">
        <span>AI That Understands Where Your Thinking Is Going</span> <div class="w-12 h-px bg-white/20"></div>
        <span>Stop Searching. Start Navigating.</span> <div class="w-12 h-px bg-white/20"></div>
        <span>The operating system for human thought</span> <div class="w-12 h-px bg-white/20"></div>
        <span>Zero-friction cognitive memory graph</span> <div class="w-12 h-px bg-white/20"></div>
        <span>AI That Understands Where Your Thinking Is Going</span> <div class="w-12 h-px bg-white/20"></div>
        <span>Stop Searching. Start Navigating.</span>
      </div>
    </div>

    <!-- Astrix Bento Grid for Platform Features -->
    <section class="bg-black py-16 px-4">
      <div class="max-w-[1600px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-[400px]">
        
        <!-- Platform Pitch Cell -->
        <div class="lg:col-span-2 lg:row-span-2 group relative overflow-hidden flex flex-col justify-between p-8 lg:p-12 bg-transparent text-white border border-white/10 hover:bg-white hover:text-black transition-all duration-500">
          <div class="flex justify-between items-start w-full relative z-10">
            <div class="text-white/40 group-hover:text-black/40 font-black uppercase tracking-[0.3em] text-[10px]">The Problem</div>
          </div>
          <div class="relative z-10">
            <h2 class="text-[36px] lg:text-[54px] leading-[0.9] font-black tracking-tighter text-white group-hover:text-black uppercase transition-colors">
              Your Brain Isn't<br>The Bottleneck.<br><span class="text-white/30 group-hover:text-black/30">Navigation Is.</span>
            </h2>
            <p class="text-xs uppercase tracking-widest opacity-60 mt-4 max-w-md">
              Most AI forgets. Most note-taking apps just collect. Most productivity tools make you organize everything yourself. Your brain ends up doing all the navigation.
            </p>
          </div>
        </div>

        <!-- Metric Card -->
        <div class="flex flex-col justify-between p-10 bg-white border border-white/10 text-black hover:bg-black hover:text-white transition-colors duration-500 group">
          <div class="text-[10px] uppercase tracking-[0.3em] font-black text-black/40 group-hover:text-white/40">Performance</div>
          <div>
            <div class="text-[54px] font-black tracking-tighter leading-none mb-4">0.0$</div>
            <p class="text-[10px] uppercase tracking-widest font-black leading-tight">SearXNG-based reality search. Real intelligence at a zero-cost budget.</p>
          </div>
        </div>

        <!-- ADHD Benefits Lobe -->
        <div class="flex flex-col justify-between p-10 bg-[#141414] border border-white/10 group hover:bg-white transition-all duration-500">
          <div class="text-white/40 font-black uppercase tracking-[0.3em] text-[10px] group-hover:text-black/40">ADHD Mode</div>
          <h3 class="text-[28px] leading-[0.9] font-black text-white group-hover:text-black uppercase tracking-tighter">Designed for<br>Brains That Don't<br>Think In Straight Lines</h3>
        </div>

        <!-- Step-by-Step Pipeline -->
        <div class="md:col-span-2 p-10 bg-black border border-white/10 text-white flex flex-col md:flex-row gap-8 items-center overflow-hidden hover:bg-white hover:text-black transition-all duration-500 group">
          <div class="space-y-4">
            <span class="text-[9px] uppercase tracking-[0.4em] bg-white text-black group-hover:bg-black group-hover:text-white px-3 py-1 font-black">Memory Pipeline</span>
            <h3 class="text-[36px] leading-[0.9] font-black uppercase tracking-tighter">From Thought &rarr; Direction</h3>
            <p class="text-xs uppercase tracking-widest opacity-60 group-hover:opacity-100 max-w-sm">
              Capture (type or speak), Understand (extract context), Research (web search verify), Remember (relationship graph), and Execute tasks in real-time.
            </p>
          </div>
        </div>

        <!-- Architecture Bulletin -->
        <div class="p-10 bg-white border border-white/10 flex flex-col justify-between text-black group hover:bg-black hover:text-white transition-all duration-500">
          <div class="text-[10px] uppercase tracking-[0.3em] text-black/40 group-hover:text-white/40 font-black">Storage</div>
          <div class="space-y-4">
            <h4 class="text-lg font-black uppercase tracking-tight">Connected Memory</h4>
            <p class="text-[10px] text-black/60 group-hover:text-white/60 leading-relaxed font-bold uppercase tracking-widest">Thought GPS doesn't save conversations—it builds semantic knowledge graph relationships.</p>
          </div>
        </div>

        <!-- Multi-Agent Lobe -->
        <div class="p-10 bg-[#141414] border border-white/10 flex flex-col justify-center gap-6 text-left group hover:bg-white transition-colors duration-500">
          <p class="text-3xl font-black uppercase tracking-tighter text-white group-hover:text-black">Multi-Agent<br>Specialists</p>
          <div class="w-full h-1 bg-white/10">
            <div class="w-full h-full bg-white group-hover:bg-black"></div>
          </div>
          <p class="text-[9px] uppercase tracking-[0.4em] text-white/40 font-black group-hover:text-black/40">Coordinating Research, Writing, Coding & Planning</p>
        </div>

      </div>
    </section>
  `;

  // Telemetry loop for status ticker
  const telemetryMsgs = [
    "Thinking...",
    "Connecting ideas...",
    "Searching reality...",
    "Finding patterns...",
    "Updating memory...",
    "Calculating next step...",
    "Memory linked.",
    "Thought mapped.",
    "Research complete.",
    "Connection discovered."
  ];
  let telemetryIndex = 0;
  const intervalId = setInterval(() => {
    const feed = container.querySelector('#telemetry-feed');
    if (feed) {
      telemetryIndex = (telemetryIndex + 1) % telemetryMsgs.length;
      feed.textContent = telemetryMsgs[telemetryIndex];
    } else {
      clearInterval(intervalId);
    }
  }, 3000);

  return container;
};
