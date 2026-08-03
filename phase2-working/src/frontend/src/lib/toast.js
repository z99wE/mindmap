/**
 * toast.js
 * A lightweight Material 3 style Toast/Snackbar notification system
 */

export const toast = {
  show(message, type = 'info', duration = 3000) {
    // Check if toast container exists, create if not
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.style.cssText = `
        position: fixed;
        bottom: 2rem;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        z-index: 9999;
        pointer-events: none;
      `;
      document.body.appendChild(container);
    }

    const el = document.createElement('div');
    
    // Colors based on Material 3 standard tones
    let bgColor = 'var(--md-sys-color-inverse-surface, #313033)';
    let textColor = 'var(--md-sys-color-inverse-on-surface, #F4EFF4)';
    
    if (type === 'error') {
      bgColor = 'var(--md-sys-color-error-container, #F9DEDC)';
      textColor = 'var(--md-sys-color-on-error-container, #410E0B)';
    } else if (type === 'success') {
      bgColor = 'var(--color-success, #4CAF50)';
      textColor = '#fff';
    }

    el.style.cssText = `
      background: ${bgColor};
      color: ${textColor};
      padding: 0.75rem 1rem;
      border-radius: 8px;
      font: var(--md-sys-typescale-body-medium);
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      opacity: 0;
      transform: translateY(20px) scale(0.95);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      pointer-events: auto;
      max-width: 90vw;
      text-align: center;
    `;
    
    el.textContent = message;
    container.appendChild(el);

    // Animate in
    requestAnimationFrame(() => {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0) scale(1)';
    });

    // Animate out and remove
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(10px) scale(0.95)';
      setTimeout(() => {
        if (el.parentNode) {
          el.parentNode.removeChild(el);
        }
      }, 300); // Wait for transition
    }, duration);
  }
};
