// Legal - AI disclaimer & terms
export function Legal() {
  const container = document.createElement('div');

  container.innerHTML = `
    <div class="page-shell">
      <div class="surface-card card-reveal" style="padding:2rem;">
        <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.5rem;">
          <span class="dot" style="width:10px;height:10px;background:var(--md-sys-color-on-surface-variant);box-shadow:0 0 12px rgba(204,255,0,0.2);"></span>
          <h1 style="font:var(--md-sys-typescale-headline-medium);margin:0;">Legal Notice</h1>
        </div>
        <p style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);margin:0;">
          AI disclaimer, terms summary, and privacy information for UnZonko.
        </p>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:1.5rem;margin-top:1.5rem;">
        <!-- Medical & Legal Disclaimer -->
        <div class="surface-card card-reveal" style="padding:1.5rem; border: 1px solid rgba(204,255,0,0.26) !important;">
          <h2 style="font:var(--md-sys-typescale-title-medium);margin:0 0 1rem; color: var(--color-analytical);">
            <span class="dot" style="width:8px;height:8px;background:var(--color-analytical);box-shadow:0 0 8px rgba(204,255,0,0.3);vertical-align:middle;"></span>
            Medical &amp; Legal Disclaimer
          </h2>
          <p style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);line-height:1.7; font-weight: 500;">
            This is NOT a medical, legal, psychiatric, or mental wellness tool. It is provided strictly for educational, productivity, and entertainment purposes. UnZonko does not diagnose, treat, or prevent ADHD, anxiety, depression, or any other cognitive condition. Consult a licensed professional for medical or psychiatric advice.
          </p>
        </div>

        <!-- AI Usage -->
        <div class="surface-card card-reveal" style="padding:1.5rem;">
          <h2 style="font:var(--md-sys-typescale-title-medium);margin:0 0 1rem;">
            <span class="dot" style="width:8px;height:8px;background:var(--md-sys-color-primary);box-shadow:0 0 8px rgba(204,255,0,0.3);vertical-align:middle;"></span>
            AI &amp; Automation
          </h2>
          <p style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);line-height:1.7;">
            The platform uses third-party LLM models, routing layers, memory graphs, and automated workflows to classify and organize thoughts.
          </p>
          <p style="font:var(--md-sys-typescale-body-medium);color:var(--color-analytical);line-height:1.7;margin-top:0.75rem;font-weight:500;">
            AI systems can hallucinate and produce incorrect details. Always verify outputs before relying on them.
          </p>
        </div>

        <!-- Privacy -->
        <div class="surface-card card-reveal" style="padding:1.5rem; border: 1px solid rgba(163,230,53,0.2) !important;">
          <h2 style="font:var(--md-sys-typescale-title-medium);margin:0 0 1rem; color: var(--md-sys-color-secondary);">
            <span class="dot" style="width:8px;height:8px;background:var(--md-sys-color-secondary);box-shadow:0 0 8px rgba(163,230,53,0.3);vertical-align:middle;"></span>
            Privacy &amp; Key Storage
          </h2>
          <p style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);line-height:1.7;">
            API keys are stored with AES-256 encryption and used only for provider communication on your behalf. Your thoughts and memories are isolated per-user with JWT-verified queries.
          </p>
        </div>

        <!-- Waitlist & Email Collection Disclaimer -->
        <div class="surface-card card-reveal" style="padding:1.5rem; border: 1px solid rgba(204,255,0,0.26) !important;">
          <h2 style="font:var(--md-sys-typescale-title-medium);margin:0 0 1rem; color: var(--color-analytical);">
            <span class="dot" style="width:8px;height:8px;background:var(--color-analytical);box-shadow:0 0 8px rgba(204,255,0,0.3);vertical-align:middle;"></span>
            Data Collection &amp; Consent
          </h2>
          <p style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);line-height:1.7;">
            We collect basic contact info (including email, name, and country location) when you register, subscribe to our newsletter, or join the early access waitlist. 
          </p>
          <p style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);line-height:1.7;margin-top:0.75rem;">
            This data is used solely to manage your early access spot and send news and updates. Subscribing represents active consent. You can unsubscribe at any time using the link in the email or by contacting support.
          </p>
        </div>

        <!-- User Responsibility -->
        <div class="surface-card card-reveal" style="padding:1.5rem;">
          <h2 style="font:var(--md-sys-typescale-title-medium);margin:0 0 1rem;">
            <span class="dot" style="width:8px;height:8px;background:var(--md-sys-color-on-surface);box-shadow:0 0 8px rgba(235,235,235,0.2);vertical-align:middle;"></span>
            User Responsibility
          </h2>
          <p style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);line-height:1.7;">
            You are responsible for how you use the service and for complying with applicable laws and platform policies. Only add API keys you are authorized to use.
          </p>
        </div>

        <!-- Liability -->
        <div class="surface-card card-reveal" style="padding:1.5rem;">
          <h2 style="font:var(--md-sys-typescale-title-medium);margin:0 0 1rem;">
            <span class="dot" style="width:8px;height:8px;background:var(--color-secondary);box-shadow:0 0 8px rgba(163,230,53,0.3);vertical-align:middle;"></span>
            Limitation of Liability
          </h2>
          <p style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);line-height:1.7;">
            Neither the service nor its operators are liable for direct or indirect damages resulting from use or inability to use the platform.
          </p>
        </div>

        <!-- Practical Notes -->
        <div class="surface-card card-reveal" style="padding:1.5rem;">
          <h2 style="font:var(--md-sys-typescale-title-medium);margin:0 0 1rem;">
            <span class="dot" style="width:8px;height:8px;background:var(--color-success);box-shadow:0 0 8px rgba(16,185,129,0.3);vertical-align:middle;"></span>
            Practical Notes
          </h2>
          <div style="display:flex;flex-direction:column;gap:0.75rem;">
            <div style="display:flex;align-items:flex-start;gap:0.5rem;">
              <span class="dot" style="width:6px;height:6px;background:var(--color-success);box-shadow:0 0 6px rgba(16,185,129,0.3);margin-top:6px;flex-shrink:0;"></span>
              <span style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-on-surface-variant);">Treat generated results as assistance, not authority.</span>
            </div>
            <div style="display:flex;align-items:flex-start;gap:0.5rem;">
              <span class="dot" style="width:6px;height:6px;background:var(--color-success);box-shadow:0 0 6px rgba(16,185,129,0.3);margin-top:6px;flex-shrink:0;"></span>
              <span style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-on-surface-variant);">Only add keys you are authorized to use.</span>
            </div>
            <div style="display:flex;align-items:flex-start;gap:0.5rem;">
              <span class="dot" style="width:6px;height:6px;background:var(--color-success);box-shadow:0 0 6px rgba(16,185,129,0.3);margin-top:6px;flex-shrink:0;"></span>
              <span style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-on-surface-variant);">Human judgment remains the final decision maker.</span>
            </div>
          </div>
          <button class="btn-m3 btn-text" style="margin-top:1rem;width:100%;" onclick="showPage('home')">
            Return Home
          </button>
        </div>
      </div>
    </div>`;

  return container;
}
