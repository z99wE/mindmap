// Legal - AI disclaimer & terms
export function Legal() {
  const container = document.createElement('div');

  container.innerHTML = `
    <div class="page-shell">
      <div class="surface-card card-reveal" style="padding:2rem;">
        <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.5rem;">
          <span class="material-symbols-rounded" style="color:var(--md-sys-color-on-surface-variant);font-size:28px;">gavel</span>
          <h1 style="font:var(--md-sys-typescale-headline-medium);margin:0;">Legal Notice</h1>
        </div>
        <p style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);margin:0;">
          AI disclaimer, terms summary, and privacy information for Thought GPS.
        </p>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:1.5rem;margin-top:1.5rem;">
        <!-- Disclaimer -->
        <div class="surface-card card-reveal" style="padding:1.5rem;">
          <h2 style="font:var(--md-sys-typescale-title-medium);margin:0 0 1rem;">
            <span class="material-symbols-rounded" style="vertical-align:middle;font-size:20px;color:var(--md-sys-color-tertiary);">warning</span>
            General Disclaimer
          </h2>
          <p style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);line-height:1.7;">
            The service is provided on an "as-is" and "as-available" basis without warranties of any kind, either express or implied.
          </p>
        </div>

        <!-- AI Usage -->
        <div class="surface-card card-reveal" style="padding:1.5rem;">
          <h2 style="font:var(--md-sys-typescale-title-medium);margin:0 0 1rem;">
            <span class="material-symbols-rounded" style="vertical-align:middle;font-size:20px;color:var(--md-sys-color-primary);">psychology</span>
            AI & Automation
          </h2>
          <p style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);line-height:1.7;">
            The platform uses third-party LLM models, routing layers, memory graphs, and automated workflows to classify and organize thoughts.
          </p>
          <p style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-error);line-height:1.7;margin-top:0.75rem;font-weight:500;">
            AI systems can hallucinate and produce incorrect details. Always verify outputs before relying on them.
          </p>
        </div>

        <!-- Privacy -->
        <div class="surface-card card-reveal" style="padding:1.5rem;">
          <h2 style="font:var(--md-sys-typescale-title-medium);margin:0 0 1rem;">
            <span class="material-symbols-rounded" style="vertical-align:middle;font-size:20px;color:var(--md-sys-color-secondary);">shield</span>
            Privacy & Key Storage
          </h2>
          <p style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);line-height:1.7;">
            API keys are stored with AES-256 encryption and used only for provider communication on your behalf. Your thoughts and memories are isolated per-user with JWT-verified queries.
          </p>
        </div>

        <!-- User Responsibility -->
        <div class="surface-card card-reveal" style="padding:1.5rem;">
          <h2 style="font:var(--md-sys-typescale-title-medium);margin:0 0 1rem;">
            <span class="material-symbols-rounded" style="vertical-align:middle;font-size:20px;color:var(--md-sys-color-on-surface);">person</span>
            User Responsibility
          </h2>
          <p style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);line-height:1.7;">
            You are responsible for how you use the service and for complying with applicable laws and platform policies. Only add API keys you are authorized to use.
          </p>
        </div>

        <!-- Liability -->
        <div class="surface-card card-reveal" style="padding:1.5rem;">
          <h2 style="font:var(--md-sys-typescale-title-medium);margin:0 0 1rem;">
            <span class="material-symbols-rounded" style="vertical-align:middle;font-size:20px;color:var(--md-sys-color-error);">balance</span>
            Limitation of Liability
          </h2>
          <p style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);line-height:1.7;">
            Neither the service nor its operators are liable for direct or indirect damages resulting from use or inability to use the platform.
          </p>
        </div>

        <!-- Practical Notes -->
        <div class="surface-card card-reveal" style="padding:1.5rem;">
          <h2 style="font:var(--md-sys-typescale-title-medium);margin:0 0 1rem;">
            <span class="material-symbols-rounded" style="vertical-align:middle;font-size:20px;color:var(--color-success);">info</span>
            Practical Notes
          </h2>
          <div style="display:flex;flex-direction:column;gap:0.75rem;">
            <div style="display:flex;align-items:flex-start;gap:0.5rem;">
              <span class="material-symbols-rounded" style="font-size:18px;color:var(--color-success);margin-top:2px;">check_circle</span>
              <span style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-on-surface-variant);">Treat generated results as assistance, not authority.</span>
            </div>
            <div style="display:flex;align-items:flex-start;gap:0.5rem;">
              <span class="material-symbols-rounded" style="font-size:18px;color:var(--color-success);margin-top:2px;">check_circle</span>
              <span style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-on-surface-variant);">Only add keys you are authorized to use.</span>
            </div>
            <div style="display:flex;align-items:flex-start;gap:0.5rem;">
              <span class="material-symbols-rounded" style="font-size:18px;color:var(--color-success);margin-top:2px;">check_circle</span>
              <span style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-on-surface-variant);">Human judgment remains the final decision maker.</span>
            </div>
          </div>
          <button class="btn-m3 btn-text" style="margin-top:1rem;width:100%;" onclick="showPage('home')">
            <span class="material-symbols-rounded" style="font-size:18px;">home</span>
            Return Home
          </button>
        </div>
      </div>
    </div>`;

  return container;
}
