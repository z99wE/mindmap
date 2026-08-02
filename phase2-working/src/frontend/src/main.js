// Thought GPS - Sci-Fi Interface
// Carbon Design System inspired - Mission Control

import { Home } from './pages/Home.js';
import { Dashboard } from './pages/Dashboard.js';
import { MissionControl } from './pages/MissionControl.js';
import { AdminDashboard } from './pages/AdminDashboard.js';
import { CognitiveLoad } from './pages/CognitiveLoad.js';
import { MemorySegments } from './pages/MemorySegments.js';
import { BrainFragments } from './pages/BrainFragments.js';
import { InteractiveSpace } from './pages/InteractiveSpace.js';
import { APIKeys } from './pages/APIKeys.js';
import { Credits } from './pages/Credits.js';
import { Memory } from './pages/Memory.js';

// Page state
let currentPage = 'home';

// Navigation function
window.showPage = (page) => {
  currentPage = page;
  updateActiveButton(page);
  renderPage(page);
};

// Mission Control page check
const isMissionControl = window.location.pathname === '/mission-control';
if (isMissionControl) {
  currentPage = 'mission-control';
}

// Brain Fragments page check
const isBrainFragments = window.location.pathname === '/brain-fragments';
if (isBrainFragments) {
  currentPage = 'brain-fragments';
}

// Update active button
function updateActiveButton(activePage) {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.textContent.toLowerCase().includes(activePage)) {
      btn.classList.add('active');
    }
  });
}

// Render page content
function renderPage(page) {
  const main = document.getElementById('main-content');
  main.innerHTML = '';
  
  switch (page) {
    case 'home':
      main.appendChild(Home());
      break;
    case 'dashboard':
      main.appendChild(Dashboard());
      break;
    case 'cognitive-load':
      main.appendChild(CognitiveLoad());
      break;
    case 'memory-segments':
      main.appendChild(MemorySegments());
      break;
    case 'brain-fragments':
      main.appendChild(BrainFragments());
      break;
    case 'interactive-space':
      main.appendChild(InteractiveSpace());
      break;
    case 'mission-control':
      main.appendChild(MissionControl());
      break;
    case 'admin':
      main.appendChild(AdminDashboard());
      break;
    case 'api-keys':
      main.appendChild(APIKeys());
      break;
    case 'credits':
      main.appendChild(Credits());
      break;
    case 'memory':
      main.appendChild(Memory());
      break;
    default:
      main.innerHTML = '<div style="color: #f08c29; padding: 2rem;">PAGE NOT FOUND</div>';
  }
}

// Initialize
renderPage('home');

// Update response time
setInterval(() => {
  const el = document.getElementById('response-time');
  if (el) {
    el.textContent = Math.floor(Math.random() * 50 + 10) + 'ms';
  }
}, 1000);

// Parallax effect
window.addEventListener('scroll', () => {
  const scrolled = window.pageYOffset;
  const parallax = document.querySelector('.parallax');
  if (parallax) {
    parallax.style.transform = `translateY(${scrolled * 0.3}px)`;
  }
});
