// Thought GPS - M3 App Shell with Auth Guard
import api from './lib/api.js';
import { Home } from './pages/Home.js';
import { Auth } from './pages/Auth.js';
import { Dashboard } from './pages/Dashboard.js';
import { MissionControl } from './pages/MissionControl.js';
import { BrainFragments } from './pages/BrainFragments.js';
import { CognitiveLoad } from './pages/CognitiveLoad.js';
import { MemorySegments } from './pages/MemorySegments.js';
import { Memory } from './pages/Memory.js';
import { InteractiveSpace } from './pages/InteractiveSpace.js';
import { APIKeys } from './pages/APIKeys.js';
import { Credits } from './pages/Credits.js';
import { ThoughtAfterlife } from './pages/ThoughtAfterlife.js';
import { Commitments } from './pages/Commitments.js';
import { ThoughtArchaeology } from './pages/ThoughtArchaeology.js';
import { ThoughtExport } from './pages/ThoughtExport.js';
import { HowItWorks } from './pages/HowItWorks.js';
import { NotificationsLog } from './pages/NotificationsLog.js';
import { AdminDashboard } from './pages/AdminDashboard.js';
import { Legal } from './pages/Legal.js';

let currentPage = 'home';
let user = null;

// Page registry with metadata
const pageRegistry = {
  home:                { title: 'Home',            icon: 'home',           auth: false, section: 'main' },
  dashboard:           { title: 'Dashboard',       icon: 'dashboard',      auth: true,  section: 'main' },
  'interactive-space': { title: 'Chat',            icon: 'psychology',     auth: true,  section: 'main' },
  memory:              { title: 'Memory',          icon: 'memory',         auth: true,  section: 'analytics' },
  'brain-fragments':   { title: 'Brain Fragments', icon: 'neurology',      auth: true,  section: 'analytics' },
  'cognitive-load':    { title: 'Cognitive Load',  icon: 'monitoring',     auth: true,  section: 'analytics' },
  'memory-segments':   { title: 'Memory Segments', icon: 'scatter_plot',   auth: true,  section: 'analytics' },
  'thought-afterlife': { title: 'Thought Afterlife',icon: 'hourglass_empty',auth: true, section: 'analytics' },
  commitments:         { title: 'Commitments',     icon: 'task_alt',       auth: true,  section: 'analytics' },
  archaeology:         { title: 'Archaeology',     icon: 'history_edu',    auth: true,  section: 'analytics' },
  'thought-export':    { title: 'Export',          icon: 'download',       auth: true,  section: 'setup' },
  'how-it-works':      { title: 'How It Works',    icon: 'play_circle',    auth: false, section: 'main' },
  'mission-control':   { title: 'Mission Control', icon: 'settings_suggest',auth: true, section: 'setup' },
  'api-keys':          { title: 'API Vault',       icon: 'key',            auth: true,  section: 'setup' },
  credits:             { title: 'Credits & Tiers', icon: 'payments',       auth: true,  section: 'setup' },
  notifications:       { title: 'Notifications',   icon: 'notifications',  auth: true,  section: 'setup' },
  admin:               { title: 'Admin',           icon: 'admin_panel_settings', auth: true, section: 'admin', adminOnly: true },
  legal:               { title: 'Legal',           icon: 'gavel',          auth: false, section: 'other' },
  auth:                { title: 'Sign In',         icon: 'login',          auth: false, section: 'hidden' },
};

const pageFactories = {
  home: Home, auth: Auth, dashboard: Dashboard, 'mission-control': MissionControl,
  'brain-fragments': BrainFragments, 'cognitive-load': CognitiveLoad,
  'memory-segments': MemorySegments, memory: Memory, 'interactive-space': InteractiveSpace,
  'api-keys': APIKeys, credits: Credits, 'thought-afterlife': ThoughtAfterlife,
  commitments: Commitments, archaeology: ThoughtArchaeology,
  'thought-export': ThoughtExport, 'how-it-works': HowItWorks,
  notifications: NotificationsLog,
  admin: AdminDashboard, legal: Legal,
};

// ── Navigation Rendering ─────────────────────────────────────────────────────
function renderNavRail() {
  const rail = document.getElementById('nav-rail');
  if (!rail) return;
  const isAdmin = user?.isAdmin;
  const isLoggedIn = api.isLoggedIn();

  let html = `
    <div class="nav-logo">
      <div class="nav-logo-icon">
        <span class="material-symbols-rounded" style="color:#fff;font-size:24px;">explore</span>
      </div>
      <div>
        <div class="nav-logo-text">Thought GPS</div>
        <div class="nav-logo-sub">Cognitive Coprocessor</div>
      </div>
    </div>`;

  const sections = [
    { key: 'main', label: '' },
    { key: 'analytics', label: 'Analytics' },
    { key: 'setup', label: 'Configuration' },
  ];

  for (const section of sections) {
    const items = Object.entries(pageRegistry).filter(([, p]) =>
      p.section === section.key && (!p.auth || isLoggedIn) && (!p.adminOnly || isAdmin)
    );
    if (items.length === 0) continue;
    if (section.label) html += `<div class="nav-section-label">${section.label}</div>`;
    for (const [key, page] of items) {
      const active = key === currentPage ? 'active' : '';
      html += `<div class="nav-item ${active}" data-page="${key}" onclick="showPage('${key}')">
        <span class="material-symbols-rounded">${page.icon}</span>
        <span>${page.title}</span>
      </div>`;
    }
  }

  // Admin section
  if (isAdmin) {
    html += `<div class="nav-section-label">Admin</div>`;
    html += `<div class="nav-item ${currentPage === 'admin' ? 'active' : ''}" onclick="showPage('admin')">
      <span class="material-symbols-rounded">admin_panel_settings</span><span>Admin</span></div>`;
  }

  // Legal always visible
  html += `<div style="flex:1;"></div>`;
  html += `<div class="nav-item ${currentPage === 'legal' ? 'active' : ''}" onclick="showPage('legal')">
    <span class="material-symbols-rounded">gavel</span><span>Legal</span></div>`;

  rail.innerHTML = html;
}

function renderBottomNav() {
  const container = document.getElementById('bottom-nav-items');
  if (!container) return;
  const bottomItems = ['home', 'dashboard', 'interactive-space', 'memory', 'mission-control'];
  const isLoggedIn = api.isLoggedIn();
  container.innerHTML = bottomItems
    .filter(k => pageRegistry[k] && (!pageRegistry[k].auth || isLoggedIn))
    .map(k => {
      const p = pageRegistry[k];
      const active = k === currentPage ? 'active' : '';
      return `<div class="bottom-nav-item ${active}" onclick="showPage('${k}')">
        <span class="material-symbols-rounded">${p.icon}</span>
        <span>${p.title.split(' ')[0]}</span>
      </div>`;
    }).join('');
}

function renderMobileDrawer() {
  const content = document.getElementById('drawer-content');
  if (!content) return;
  // Clone nav rail content
  const rail = document.getElementById('nav-rail');
  content.innerHTML = rail ? rail.innerHTML : '';
  // Bind clicks
  content.querySelectorAll('[onclick]').forEach(el => {
    el.addEventListener('click', () => {
      document.getElementById('mobile-drawer').classList.remove('open');
    });
  });
}

function updateUserChip() {
  const chip = document.getElementById('user-name');
  if (!chip) return;
  if (user) {
    chip.textContent = user.email?.split('@')[0] || 'User';
  } else {
    chip.textContent = 'Sign In';
  }
}

async function updateNotifBadge() {
  if (!api.isLoggedIn()) return;
  const data = await api.get('/notifications/unread-count');
  const badge = document.getElementById('notif-badge');
  if (badge && data.count > 0) {
    badge.textContent = data.count > 99 ? '99+' : data.count;
    badge.style.display = 'grid';
  } else if (badge) {
    badge.style.display = 'none';
  }
}

// ── Page Router ──────────────────────────────────────────────────────────────
function renderPage(page) {
  const info = pageRegistry[page];
  const factory = pageFactories[page];

  // Auth guard
  if (info?.auth && !api.isLoggedIn()) {
    page = 'auth';
  }
  // Admin guard
  if (info?.adminOnly && !user?.isAdmin) {
    page = 'home';
  }

  currentPage = page;
  const main = document.getElementById('main-content');
  if (!main) return;

  // Set page title
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = pageRegistry[page]?.title || 'Thought GPS';

  // Render page content
  if (factory) {
    const content = factory();
    if (typeof content === 'string') main.innerHTML = content;
    else if (content instanceof Node) main.replaceChildren(content);
    else main.innerHTML = '<div class="surface-card" style="color:var(--md-sys-color-error)">Page error</div>';
  } else {
    main.innerHTML = '<div class="surface-card">Page not found</div>';
  }

  // Animate entrance
  main.classList.add('page-enter');
  requestAnimationFrame(() => {
    main.classList.remove('page-enter');
    main.classList.add('page-enter-active');
    setTimeout(() => main.classList.remove('page-enter-active'), 400);
  });

  // Update nav active states
  renderNavRail();
  renderBottomNav();
  renderMobileDrawer();

  // Reveal cards with stagger
  setTimeout(() => {
    document.querySelectorAll('.card-reveal').forEach((el, i) => {
      setTimeout(() => el.classList.add('revealed'), i * 80);
    });
  }, 100);

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Global showPage
window.showPage = (page) => {
  renderPage(page);
};

window.handleUserClick = () => {
  if (api.isLoggedIn()) {
    if (confirm('Sign out?')) {
      api.clearAuth();
      user = null;
      renderPage('home');
    }
  } else {
    renderPage('auth');
  }
};

// Listen for auth events
window.addEventListener('tg-auth-required', () => renderPage('auth'));
window.addEventListener('tg-auth-success', (e) => {
  user = e.detail?.user || api.getUser();
  updateUserChip();
  renderPage('dashboard');
});

// ── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  user = api.getUser();
  updateUserChip();

  // Try to refresh user data if logged in
  if (api.isLoggedIn()) {
    const me = await api.get('/auth/me');
    if (me.id) {
      user = me;
      api.setUser(me);
      updateUserChip();
      updateNotifBadge();
    }
  }

  // Determine initial page from URL
  const path = window.location.pathname;
  const pageFromPath = Object.entries(pageRegistry).find(([k]) => path.includes(k))?.[0];
  renderPage(pageFromPath || 'home');
}

init();
