/* ============================================================
   VELORA — CORE SITE SCRIPT
   Plain script (no <script type="module">, no external
   dependencies, no CDN). The product visuals in main.js are
   built with real CSS 3D transforms, not WebGL, so there is
   nothing here that can fail to load — this and every other
   script on the page just runs, in any modern browser, whether
   the page is opened directly as a file or served.
============================================================ */
(function () {
  window.VELORA_PREFERS_REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const prefersReducedMotion = window.VELORA_PREFERS_REDUCED_MOTION;

  /* ============================================================
     OPENING / LOADING SEQUENCE
     A short branded intro plays once, then hands off to the
     scroll-driven unwrap.
  ============================================================ */
  function runIntro() {
    const overlay = document.getElementById('intro-overlay');
    if (!overlay) return;
    document.documentElement.classList.add('intro-lock');
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      overlay.classList.add('intro-hide');
      document.documentElement.classList.remove('intro-lock');
      setTimeout(() => { overlay.style.display = 'none'; }, 750);
    };
    setTimeout(finish, prefersReducedMotion ? 350 : 2200);
  }
  runIntro();

  /* ============================================================
     NAVIGATION
  ============================================================ */
  const header = document.getElementById('site-header');
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });

  const burger = document.getElementById('burger-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  const menuOverlay = document.getElementById('menu-overlay');

  function closeMenu() {
    burger.classList.remove('open');
    burger.setAttribute('aria-expanded', 'false');
    mobileMenu.classList.remove('open');
    menuOverlay.classList.remove('open');
  }
  burger.addEventListener('click', () => {
    const isOpen = mobileMenu.classList.toggle('open');
    burger.classList.toggle('open', isOpen);
    burger.setAttribute('aria-expanded', String(isOpen));
    menuOverlay.classList.toggle('open', isOpen);
  });
  menuOverlay.addEventListener('click', closeMenu);
  mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));

  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const id = link.getAttribute('href');
      if (id.length > 1) {
        const target = document.querySelector(id);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
        }
      }
    });
  });

  /* ============================================================
     TOAST
  ============================================================ */
  const toastEl = document.getElementById('toast');
  let toastTimer;
  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2400);
  }
  window.veloraShowToast = showToast;

  /* ============================================================
     CONTACT FORM
  ============================================================ */
  const contactForm = document.getElementById('contact-form');
  const formMsg = document.getElementById('form-msg');
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('contact-email').value;
    formMsg.textContent = `Thank you — we will reply to ${email} shortly.`;
    contactForm.reset();
    showToast('Message sent successfully');
  });

  /* ============================================================
     SCROLL REVEAL (IntersectionObserver)
  ============================================================ */
  const revealTargets = document.querySelectorAll('.reveal, .feature-card, .ingredient-row, .craft-card, .product-card, .testi-card');
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
  revealTargets.forEach(el => io.observe(el));
})();
