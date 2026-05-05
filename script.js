// Founding-100 enrollment.
//
// Submits to /api/subscribe (a Cloudflare Pages Function in
// functions/api/subscribe.js) which forwards to Buttondown using a
// server-side secret. Counter remains client-side localStorage as social
// proof — the canonical subscriber list lives in Buttondown.
(function () {
  // Pre-launch reset: counter starts at 100 spots remaining.
  // STORAGE_KEY bumped to v2 so anyone who tested the v1 counter gets
  // a fresh state on first visit after this deploy.
  const BASELINE = 0;
  const CAP = 100;
  const STORAGE_KEY = 'shaggy_claimed_v2';

  const remainingEl = document.getElementById('remaining');
  const form = document.getElementById('enroll-form');
  const cta = document.getElementById('cta');
  const emailInput = document.getElementById('enroll-email');

  if (!remainingEl || !form || !cta) return;

  const readClaimed = () => {
    try {
      const stored = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
      return Math.max(stored, BASELINE);
    } catch (_) {
      return BASELINE;
    }
  };

  const writeClaimed = (n) => {
    try { localStorage.setItem(STORAGE_KEY, String(n)); } catch (_) {}
  };

  const renderRemaining = () => {
    remainingEl.textContent = String(Math.max(0, CAP - readClaimed()));
  };

  renderRemaining();

  const showError = (message) => {
    let el = cta.querySelector('.alltype__cta-error');
    if (!el) {
      el = document.createElement('p');
      el.className = 'alltype__cta-error';
      const note = cta.querySelector('.alltype__cta-note');
      if (note) cta.insertBefore(el, note);
      else cta.appendChild(el);
    }
    el.textContent = message;
  };

  const clearError = () => {
    const el = cta.querySelector('.alltype__cta-error');
    if (el) el.remove();
  };

  const showConfirmation = () => {
    const note = cta.querySelector('.alltype__cta-note');
    form.outerHTML = `
      <div class="alltype__done">
        <span class="alltype__done-pulse"></span>
        <span class="s-body alltype__done-text">You're on the list.</span>
      </div>
    `;
    if (note) cta.appendChild(note);
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();

    const email = (emailInput.value || '').trim();
    if (!email || !emailInput.checkValidity()) {
      emailInput.focus();
      return;
    }

    const button = form.querySelector('button[type="submit"]');
    const originalButtonHTML = button.innerHTML;
    button.disabled = true;
    button.innerHTML = 'Sending…';

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || 'Could not subscribe — please try again.');
      }

      // Bump the counter only on confirmed success so a failed network
      // call doesn't artificially inflate "claimed" spots.
      const next = readClaimed() + 1;
      writeClaimed(next);
      renderRemaining();
      showConfirmation();
    } catch (err) {
      button.disabled = false;
      button.innerHTML = originalButtonHTML;
      showError(err.message || 'Could not subscribe — please try again.');
    }
  });
})();
