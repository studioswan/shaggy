// Founding-100 enrollment.
//
// Submits to /api/subscribe (a Cloudflare Pages Function in
// functions/api/subscribe.js) which forwards to Buttondown using a
// server-side secret.
//
// The remaining-spots counter fetches the real subscriber count from
// /api/count (which queries Buttondown server-side) so every visitor
// sees the same accurate number.
(function () {
  const CAP = 100;

  const remainingEl = document.getElementById('remaining');
  const form = document.getElementById('enroll-form');
  const cta = document.getElementById('cta');
  const emailInput = document.getElementById('enroll-email');

  if (!remainingEl || !form || !cta) return;

  // ── Counter ──────────────────────────────────────────────────────
  // Fetch the real remaining count from the server.
  const fetchRemaining = async () => {
    try {
      const res = await fetch('/api/count');
      if (!res.ok) return;
      const data = await res.json();
      if (typeof data.remaining === 'number') {
        remainingEl.textContent = String(data.remaining);
      }
    } catch (_) {
      // Network error — leave the default (100) in place.
    }
  };

  fetchRemaining();

  // ── Form handling ────────────────────────────────────────────────
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

      // Refresh the counter from the server to reflect the new signup.
      await fetchRemaining();
      showConfirmation();
    } catch (err) {
      button.disabled = false;
      button.innerHTML = originalButtonHTML;
      showError(err.message || 'Could not subscribe — please try again.');
    }
  });
})();
