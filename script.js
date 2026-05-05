// Founding-100 enrollment — local-only counter; swap localStorage for a
// real backend (Buttondown / Formspree / your own API) when wiring up.
(function () {
  const BASELINE = 37;
  const CAP = 100;
  const STORAGE_KEY = 'shaggy_claimed';

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

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = (emailInput.value || '').trim();
    if (!email || !emailInput.checkValidity()) {
      emailInput.focus();
      return;
    }

    const next = readClaimed() + 1;
    writeClaimed(next);
    renderRemaining();

    // Replace form with confirmation, preserve the helper note.
    const note = cta.querySelector('.alltype__cta-note');
    form.outerHTML = `
      <div class="alltype__done">
        <span class="alltype__done-pulse"></span>
        <span class="s-body alltype__done-text">You're on the list.</span>
      </div>
    `;
    if (note) cta.appendChild(note);

    // TODO: POST email to your backend here, e.g.:
    // fetch('https://api.your-form-service.com/...', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ email }),
    // });
  });
})();
