/* ============================================================
   VELORA — 3D PRODUCT ENGINE
   Builds the wrapped-chocolate-bar visual with real CSS 3D
   transforms (perspective + preserve-3d + rotateX/Y +
   translateZ) — no three.js, no CDN, no <script type="module">.
   It is plain, synchronous DOM + CSS, so it renders the instant
   this script runs, in Chrome or Firefox, served or opened
   directly as a file.
============================================================ */
(function () {
  const prefersReducedMotion = window.VELORA_PREFERS_REDUCED_MOTION || window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function clamp01(x) { return Math.max(0, Math.min(1, x)); }
  function easeInOutCubic(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function px(n) { return n + 'px'; }

  /* ============================================================
     BUILD ONE PRODUCT (bar + two-piece foil wrapper + seal band)
  ============================================================ */
  function buildProduct(container, theme) {
    container.innerHTML = '';

    const stage = document.createElement('div');
    stage.className = 'choc-stage';
    const rig = document.createElement('div');
    rig.className = 'choc-rig choc-theme-' + theme;
    stage.appendChild(rig);
    container.appendChild(stage);

    const shadow = document.createElement('div');
    shadow.className = 'choc-shadow';
    rig.appendChild(shadow);

    const bar = document.createElement('div');
    bar.className = 'c3d-box choc-bar';
    ['front', 'top', 'right'].forEach((name) => {
      const f = document.createElement('div');
      f.className = 'c3d-face c3d-face-' + name;
      bar.appendChild(f);
    });
    rig.appendChild(bar);

    const wrapLeft = document.createElement('div');
    wrapLeft.className = 'choc-wrap-half choc-wrap-left';
    rig.appendChild(wrapLeft);

    const wrapRight = document.createElement('div');
    wrapRight.className = 'choc-wrap-half choc-wrap-right';
    rig.appendChild(wrapRight);

    const band = document.createElement('div');
    band.className = 'choc-band';
    const emblem = document.createElement('div');
    emblem.className = 'choc-emblem';
    band.appendChild(emblem);
    rig.appendChild(band);

    function resize() {
      const rect = container.getBoundingClientRect();
      const w = Math.max(1, rect.width);
      const h = Math.max(1, rect.height);
      const base = Math.max(130, Math.min(280, Math.min(w, h * 1.5) * 0.56));
      const barW = base;
      const barH = base * 0.175;
      const barD = base * 0.56;
      const wrapW = barW * 1.04;
      const wrapH = barH * 2.05;

      bar.style.setProperty('--w', px(barW));
      bar.style.setProperty('--h', px(barH));
      bar.style.setProperty('--d', px(barD));

      [wrapLeft, wrapRight].forEach((el) => {
        el.style.setProperty('--w', px(wrapW));
        el.style.setProperty('--h', px(wrapH));
      });
      band.style.setProperty('--w', px(wrapW));
      band.style.setProperty('--h', px(wrapH));

      rig.style.setProperty('--barW', px(barW));
      rig.style.setProperty('--barD', px(barD));
      rig.style.setProperty('--rigH', px(barH));
    }
    resize();
    if (window.ResizeObserver) {
      new ResizeObserver(resize).observe(container);
    } else {
      window.addEventListener('resize', resize, { passive: true });
    }

    function setProgress(t) {
      t = clamp01(t);

      // the seal band breaks first
      const bandT = clamp01((t - 0.02) / 0.22);
      const bandEase = easeInOutCubic(bandT);
      band.style.transform = `translateZ(2px) scaleX(${1 - bandEase})`;
      band.style.opacity = String(1 - bandEase);
      band.style.pointerEvents = bandEase > 0.98 ? 'none' : 'auto';

      // then the two foil halves swing open like doors
      const openT = clamp01((t - 0.12) / 0.55);
      const openEase = easeInOutCubic(openT);
      wrapLeft.style.transform = `rotateY(${-132 * openEase}deg) translateX(${-16 * openEase}px)`;
      wrapRight.style.transform = `rotateY(${132 * openEase}deg) translateX(${16 * openEase}px)`;

      const fadeT = clamp01((t - 0.55) / 0.3);
      const fadeOp = 1 - easeInOutCubic(fadeT);
      wrapLeft.style.opacity = String(fadeOp);
      wrapRight.style.opacity = String(fadeOp);
      const showFlaps = fadeOp > 0.02;
      wrapLeft.style.visibility = showFlaps ? 'visible' : 'hidden';
      wrapRight.style.visibility = showFlaps ? 'visible' : 'hidden';
    }
    setProgress(0);

    return { rig, stage, setProgress, resize };
  }

  /* ============================================================
     SHARED ANIMATION LOOP
     One rAF loop drives every product instance's idle float /
     auto-rotate / hover-spin / mouse parallax so the page never
     runs more than one animation frame callback for visuals.
  ============================================================ */
  const instances = [];
  function registerInstance(cfg) {
    instances.push(Object.assign({
      rotY: 0,
      rotX: 0,
      hovered: false,
      visible: true,
      autoSpeed: 14,   // deg/sec
      hoverSpeed: 34,  // deg/sec
      floatAmp: 5,     // px
      floatSpeed: 1.1, // rad/sec multiplier
      tiltX: 0,
      tiltY: 0,
    }, cfg));
    return instances[instances.length - 1];
  }

  let lastTime = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;
    const t = now / 1000;

    instances.forEach((inst) => {
      if (!inst.visible) return;
      if (!prefersReducedMotion) {
        const speed = inst.hovered ? inst.hoverSpeed : inst.autoSpeed;
        inst.rotY += speed * dt;
      }
      const floatY = prefersReducedMotion ? 0 : Math.sin(t * inst.floatSpeed + inst.phase) * inst.floatAmp;
      const rx = inst.rotX + inst.tiltX;
      const ry = inst.rotY + inst.tiltY;
      inst.rig.style.transform = `translateY(${floatY}px) rotateX(${rx}deg) rotateY(${ry}deg)`;
    });
  }
  requestAnimationFrame(frame);

  /* ============================================================
     HERO INSTANCE — sealed, idle float + slow spin + mouse tilt
  ============================================================ */
  const heroSlot = document.getElementById('hero-product-slot');
  let heroInst = null;
  if (heroSlot) {
    const heroProduct = buildProduct(heroSlot, 'dark');
    heroProduct.setProgress(0);
    heroInst = registerInstance({ rig: heroProduct.rig, phase: 0, autoSpeed: 9, hoverSpeed: 9, floatAmp: 6 });

    window.addEventListener('mousemove', (e) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      heroInst.tiltX = prefersReducedMotion ? 0 : ny * -6;
      heroInst.tiltY = prefersReducedMotion ? 0 : nx * 10;
    }, { passive: true });
  }

  /* ============================================================
     STORY INSTANCE — unwrap driven by the pinned scroll section
  ============================================================ */
  const storySlot = document.getElementById('story-product-slot');
  const unwrapStorySection = document.getElementById('unwrap-story');
  const storySteps = document.querySelectorAll('.story-step');
  const storyDots = document.querySelectorAll('.story-progress .dot');
  let currentStepIndex = 0;

  function updateStorySteps(progress) {
    const stepIndex = Math.min(3, Math.floor(progress * 4));
    if (stepIndex !== currentStepIndex || progress === 0) {
      currentStepIndex = stepIndex;
      storySteps.forEach((el, i) => {
        el.classList.toggle('active', i === stepIndex);
        el.classList.toggle('mobile-active', i === stepIndex);
      });
      storyDots.forEach((el, i) => el.classList.toggle('active', i === stepIndex));
    }
  }

  if (storySlot && unwrapStorySection) {
    const storyProduct = buildProduct(storySlot, 'dark');
    registerInstance({ rig: storyProduct.rig, phase: 1.4, autoSpeed: 6, hoverSpeed: 6, floatAmp: 4 });
    updateStorySteps(0);

    // The scroll-pinned story is disabled on narrow screens (see the
    // 980px media query) in favour of a static, swipeable-feeling
    // layout — so the dots double as tappable/keyboard step controls
    // whenever scroll-jacking isn't driving progress.
    storyDots.forEach((dot, i) => {
      dot.setAttribute('role', 'button');
      dot.setAttribute('tabindex', '0');
      dot.setAttribute('aria-label', `Show step ${i + 1} of the unwrapping story`);
      const activate = () => {
        const progress = (i + 0.5) / storyDots.length;
        storyProduct.setProgress(progress);
        updateStorySteps(progress);
      };
      dot.addEventListener('click', activate);
      dot.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
      });
    });

    function computeScrollProgress() {
      const storyRect = unwrapStorySection.getBoundingClientRect();
      const storyHeight = unwrapStorySection.offsetHeight - window.innerHeight;
      // storyHeight <= 0 means the pinned-scroll layout is disabled at
      // this viewport size (see the 980px media query) — there's no
      // scroll-jacked progress to compute, so let the dots (above) own
      // step navigation instead of forcing everything back to step 1.
      if (storyHeight <= 0) return null;
      const scrolledIntoStory = -storyRect.top;
      return clamp01(scrolledIntoStory / storyHeight);
    }

    function onScroll() {
      const progress = computeScrollProgress();
      if (progress === null) return;
      storyProduct.setProgress(progress);
      updateStorySteps(progress);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    onScroll();
  }

  /* ============================================================
     COLLECTION CARD INSTANCES — partially open, decorative
  ============================================================ */
  document.querySelectorAll('.product-visual').forEach((visualEl, i) => {
    const theme = visualEl.dataset.productColor || 'dark';
    const product = buildProduct(visualEl, theme);
    product.setProgress(0.32);

    const inst = registerInstance({ rig: product.rig, phase: i * 1.7, autoSpeed: 8, hoverSpeed: 26, floatAmp: 3 });

    visualEl.addEventListener('mouseenter', () => { inst.hovered = true; });
    visualEl.addEventListener('mouseleave', () => { inst.hovered = false; });

    if (window.IntersectionObserver) {
      const cardIo = new IntersectionObserver((entries) => {
        entries.forEach((e) => { inst.visible = e.isIntersecting; });
      }, { threshold: 0.05 });
      cardIo.observe(visualEl);
    }
  });
})();
