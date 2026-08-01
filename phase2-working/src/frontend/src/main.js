// Thought GPS - Sci-Fi Interface
// Iron Man / Jarvis style console

import { Home } from './pages/Home.js';
import { Dashboard } from './pages/Dashboard.js';
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
      main.innerHTML = '<div style="color: #ff3366; padding: 2rem;">PAGE NOT FOUND</div>';
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
