export function renderErrorState(message) {
  // A beautiful glassmorphic error state matching the "Mentally" dark UI aesthetic
  return `
    <div class="card-reveal surface-card" style="padding:3rem 2rem;text-align:center;border:1px solid rgba(244,67,54,0.2);background:linear-gradient(180deg, rgba(244,67,54,0.05) 0%, transparent 100%);">
      <div style="width:56px;height:56px;border-radius:16px;background:rgba(244,67,54,0.1);display:grid;place-items:center;margin:0 auto 1.25rem;">
        <span class="material-symbols-outlined" style="font-size:28px;color:var(--md-sys-color-error);">error_outline</span>
      </div>
      <h3 style="font:var(--md-sys-typescale-title-large);margin:0 0 0.5rem;color:var(--md-sys-color-on-surface);">We hit a snag</h3>
      <p style="font:var(--md-sys-typescale-body-large);color:var(--md-sys-color-on-surface-variant);margin:0 auto 1.5rem;max-width:450px;line-height:1.6;">
        ${message}
      </p>
      <button class="btn-m3 btn-tonal" onclick="window.location.reload()" style="background:var(--md-sys-color-surface-container-high);">
        Retry
      </button>
    </div>
  `;
}
