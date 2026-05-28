// Shaggy — landing page interactions (V2: cinematic + collage)
// Deps: Lenis (smooth weighted scroll), GSAP + ScrollTrigger (scene parallax,
// holds, curtain wipe, reveals). All gracefully degrade and respect
// prefers-reduced-motion fully.

(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isCoarse    = window.matchMedia('(pointer: coarse)').matches;
  const isMobile    = window.matchMedia('(max-width: 899px)').matches;

  // ---------------------------------------------------------------------
  // 1. Lenis weighted smooth scroll — the "composed swagger"
  // ---------------------------------------------------------------------
  let lenis = null;
  function bootLenis() {
    if (reduceMotion) return null;
    if (typeof window.Lenis !== 'function') return null;
    const l = new window.Lenis({
      duration: isMobile ? 1.0 : 1.3,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      lerp: isMobile ? 0.1 : 0.07,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.4
    });
    function raf(time) { l.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
    return l;
  }

  // ---------------------------------------------------------------------
  // 2. GSAP + ScrollTrigger — scene parallax, hero curtain, reveals
  // ---------------------------------------------------------------------
  function bootGsap() {
    if (reduceMotion) return;
    if (typeof window.gsap === 'undefined' || typeof window.ScrollTrigger === 'undefined') return;

    const { gsap } = window;
    gsap.registerPlugin(window.ScrollTrigger);

    // Sync Lenis with ScrollTrigger so triggers fire on smooth-scrolled positions.
    if (lenis) {
      lenis.on('scroll', window.ScrollTrigger.update);
      gsap.ticker.add((time) => { lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
    }

    // ----- HERO: image hold + parallax scale + copy fade + cream curtain
    const hero = document.querySelector('.scene--hero');
    if (hero && !isMobile) {
      const heroMedia = hero.querySelector('.scene__media');
      const heroImg   = hero.querySelector('.scene__media img');
      const heroCopy  = hero.querySelector('.scene__copy--hero');
      const curtain   = hero.querySelector('.scene__curtain');
      const cue       = hero.querySelector('.scene__scroll-cue');

      // Reveal hero copy in on first paint (no scroll required)
      gsap.fromTo(heroCopy,
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 1.4, ease: 'expo.out', delay: 0.2 }
      );

      // Hold the image, slow parallax scale, fade copy and curtain wipe up
      gsap.timeline({
        scrollTrigger: {
          trigger: hero,
          start: 'top top',
          end: 'bottom top',
          scrub: 1.2
        }
      })
      .to(heroImg,  { scale: 1.10, ease: 'none' }, 0)
      .to(heroCopy, { opacity: 0, y: -60, ease: 'none' }, 0.4)
      .to(cue,      { opacity: 0, ease: 'none' }, 0)
      .to(curtain,  { height: '100%', ease: 'none' }, 0.55);
    }

    // ----- SCENE PARALLAX (pillar-1, billboard, manifesto) -----
    document.querySelectorAll('.scene:not(.scene--hero):not(.scene--paper):not(.scene--close) .scene__media').forEach((media) => {
      if (isMobile) return;
      const img = media.querySelector('img');
      if (!img) return;
      gsap.fromTo(img,
        { yPercent: -6, scale: 1.08 },
        {
          yPercent: 6,
          scale: 1.0,
          ease: 'none',
          scrollTrigger: {
            trigger: media.closest('.scene'),
            start: 'top bottom',
            end:   'bottom top',
            scrub: 1.0
          }
        }
      );
    });

    // ----- COPY REVEALS in scenes (composed-swagger fade-rise) -----
    document.querySelectorAll('.scene .scene__copy[data-reveal]').forEach((el) => {
      if (isMobile) {
        gsap.set(el, { opacity: 1, y: 0 });
        return;
      }
      gsap.fromTo(el,
        { opacity: 0, y: 36 },
        {
          opacity: 1,
          y: 0,
          duration: 1.3,
          ease: 'expo.out',
          scrollTrigger: { trigger: el.closest('.scene'), start: 'top 65%', once: true }
        }
      );
    });

    // ----- COLLAGE OBJECTS: slow rise on enter (taped feel) -----
    document.querySelectorAll('.taped, .portrait-placeholder, .peek--card, .pullquote, .breath .prose, .breath .eyebrow, .breath .section__title, .breath .section__lede, .breath .waitlist, .breath .faq, .joel-copy').forEach((el) => {
      gsap.fromTo(el,
        { opacity: 0, y: 24 },
        {
          opacity: 1, y: 0,
          duration: 1.1,
          ease: 'expo.out',
          scrollTrigger: { trigger: el, start: 'top 88%', once: true }
        }
      );
    });

    // ----- BIG ICON in PILLAR 2: a slow scale-in like ink soaking in -----
    const bigIcon = document.querySelector('.big-icon');
    if (bigIcon) {
      gsap.fromTo(bigIcon,
        { scale: 0.92, opacity: 0 },
        {
          scale: 1.0, opacity: 0.10,
          duration: 1.6,
          ease: 'expo.out',
          scrollTrigger: { trigger: '.scene--paper', start: 'top 70%', once: true }
        }
      );
    }

    // ----- CLOSE line: drift in -----
    const closeInner = document.querySelector('.scene--close .close__inner');
    if (closeInner) {
      gsap.fromTo(closeInner,
        { opacity: 0, y: 28 },
        {
          opacity: 1, y: 0,
          duration: 1.4,
          ease: 'expo.out',
          scrollTrigger: { trigger: '.scene--close', start: 'top 70%', once: true }
        }
      );
    }
  }

  // ---------------------------------------------------------------------
  // 3. Sticky nav background after the hero
  // ---------------------------------------------------------------------
  const nav = document.getElementById('nav');
  if (nav) {
    let ticking = false;
    const sync = () => {
      nav.classList.toggle('nav--scrolled', window.scrollY > 80);
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(sync);
        ticking = true;
      }
    }, { passive: true });
    sync();
  }

  // ---------------------------------------------------------------------
  // 4. In-page anchor links — honour Lenis if available
  // ---------------------------------------------------------------------
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href || href === '#') return;
    const target = document.querySelector(href);
    if (!target) return;
    e.preventDefault();
    if (lenis && !reduceMotion) {
      lenis.scrollTo(target, { offset: -8, duration: 1.6 });
    } else {
      target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    }
    const prevTabindex = target.getAttribute('tabindex');
    if (prevTabindex === null) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
    if (prevTabindex === null) setTimeout(() => target.removeAttribute('tabindex'), 1500);
  });

  // ---------------------------------------------------------------------
  // 5. FAQ accordion — ARIA-driven, animated
  // ---------------------------------------------------------------------
  document.querySelectorAll('.faq__q').forEach((btn) => {
    const answer = document.getElementById(btn.getAttribute('aria-controls'));
    if (!answer) return;

    answer.addEventListener('transitionend', (ev) => {
      if (ev.propertyName !== 'max-height') return;
      const open = btn.getAttribute('aria-expanded') === 'true';
      if (open) {
        answer.style.maxHeight = 'none';
      } else {
        answer.hidden = true;
      }
    });

    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') === 'true';

      if (open) {
        if (reduceMotion) {
          answer.style.maxHeight = '';
          answer.hidden = true;
        } else {
          answer.style.maxHeight = answer.scrollHeight + 'px';
          requestAnimationFrame(() => { answer.style.maxHeight = '0px'; });
        }
        btn.setAttribute('aria-expanded', 'false');
      } else {
        answer.hidden = false;
        if (reduceMotion) {
          answer.style.maxHeight = 'none';
        } else {
          answer.style.maxHeight = '0px';
          requestAnimationFrame(() => { answer.style.maxHeight = answer.scrollHeight + 'px'; });
        }
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });

  // ---------------------------------------------------------------------
  // 6. Waitlist form
  // ---------------------------------------------------------------------
  const form = document.getElementById('waitlist-form');
  if (form) {
    const successEl  = document.getElementById('waitlist-success');
    const statusEl   = document.getElementById('waitlist-status');
    const nameInput  = document.getElementById('f-name');
    const phoneInput = document.getElementById('f-phone');
    const dogInput   = document.getElementById('f-dog');
    const submitBtn  = form.querySelector('button[type="submit"]');
    const submitOriginalLabel = submitBtn ? submitBtn.textContent : 'Join the waitlist';

    const showError = (input, errorId) => {
      const err = document.getElementById(errorId);
      if (err) err.hidden = false;
      input.setAttribute('aria-invalid', 'true');
    };
    const clearError = (input, errorId) => {
      const err = document.getElementById(errorId);
      if (err) err.hidden = true;
      input.removeAttribute('aria-invalid');
    };
    const validPhone = (value) => {
      const digits = value.replace(/\D/g, '');
      return digits.length === 10 || (digits.length === 11 && digits.startsWith('1'));
    };

    nameInput.addEventListener('input',  () => clearError(nameInput,  'f-name-error'));
    phoneInput.addEventListener('input', () => clearError(phoneInput, 'f-phone-error'));

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      statusEl.hidden = true;
      statusEl.textContent = '';

      let valid = true;
      if (!nameInput.value.trim())            { showError(nameInput,  'f-name-error');  valid = false; }
      if (!validPhone(phoneInput.value))      { showError(phoneInput, 'f-phone-error'); valid = false; }
      if (!valid) {
        const firstError = form.querySelector('[aria-invalid="true"]');
        if (firstError) firstError.focus();
        return;
      }

      const payload = {
        name:  nameInput.value.trim(),
        phone: phoneInput.value.trim(),
        dog:   dogInput.value.trim(),
        source: 'waitlist-landing',
        submitted_at: new Date().toISOString()
      };

      const endpoint = form.dataset.endpoint && form.dataset.endpoint.trim();

      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Sending'; }

      try {
        if (endpoint) {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (!res.ok) throw new Error('Request failed: ' + res.status);
        } else {
          // // CONNECT_BACKEND_HERE — no endpoint configured yet.
          // eslint-disable-next-line no-console
          console.log('[Shaggy waitlist — stub] Would POST payload:', payload);
          await new Promise((r) => setTimeout(r, 500));
        }

        if (typeof window.gtag === 'function') {
          window.gtag('event', 'waitlist_signup', {
            source: 'landing-page',
            has_dog_info: !!payload.dog
          });
        }
        if (Array.isArray(window.dataLayer)) {
          window.dataLayer.push({ event: 'waitlist_signup', has_dog_info: !!payload.dog });
        }
        window.dispatchEvent(new CustomEvent('waitlist:signup', { detail: payload }));

        form.hidden = true;
        successEl.hidden = false;
        successEl.focus();
      } catch (err) {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = submitOriginalLabel;
        }
        statusEl.hidden = false;
        statusEl.textContent = 'Something went wrong on our end. Please try again in a moment.';
        // eslint-disable-next-line no-console
        console.error('[Shaggy waitlist]', err);
      }
    });
  }

  // ---------------------------------------------------------------------
  // 7. Boot
  // ---------------------------------------------------------------------
  function boot() {
    lenis = bootLenis();
    bootGsap();
  }
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(boot, 0);
  } else {
    window.addEventListener('DOMContentLoaded', boot);
  }
})();
