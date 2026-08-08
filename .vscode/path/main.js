import * as THREE from 'three';
import { createChocolateProduct } from './chocolateModel.js';
import { createRenderer, createLighting, createGroundShadow } from './sceneSetup.js';
 
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 
/* ============================================================
   WEBGL SUPPORT CHECK
============================================================ */
function hasWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  } catch (e) {
    return false;
  }
}
 
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
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2400);
}
 
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
   ADD TO CART
============================================================ */
let cartCount = 0;
document.querySelectorAll('.add-to-cart').forEach(btn => {
  btn.addEventListener('click', () => {
    cartCount++;
    showToast(`${btn.dataset.name} added to cart (${cartCount})`);
  });
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
 
/* ============================================================
   FALLBACK IF NO WEBGL
============================================================ */
if (!hasWebGL()) {
  const heroSlot = document.getElementById('hero-product-slot');
  const storySlot = document.getElementById('story-product-slot');
  const fallbackHTML = `
    <div class="no-webgl-fallback" style="display:flex;">
      <div class="fallback-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="#c9a15a" stroke-width="1"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18"/></svg>
        <p>3D preview unavailable on this device.<br/>Explore our collection below.</p>
      </div>
    </div>`;
  heroSlot.innerHTML = fallbackHTML;
  storySlot.innerHTML = fallbackHTML;
} else {
  initHeroScene();
  initProductCardScenes();
}
 
/* ============================================================
   MAIN HERO + STORY 3D SCENE
   A single shared renderer/canvas positioned fixed behind content;
   we reposition the "focus" between hero and story sections by
   moving the camera / product group based on scroll progress.
============================================================ */
function initHeroScene() {
  const canvas = document.getElementById('hero-canvas');
  const renderer = createRenderer(canvas);
  const scene = new THREE.Scene();
 
  const camera = new THREE.PerspectiveCamera(32, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0.3, 6);
 
  createLighting(scene);
  const groundShadow = createGroundShadow(scene);
 
  const product = createChocolateProduct('dark');
  product.group.scale.setScalar(1.35);
  scene.add(product.group);
 
  // subtle environment glow sprite behind product
  const glowGeo = new THREE.PlaneGeometry(6, 6);
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xc9a15a,
    transparent: true,
    opacity: 0.05,
    depthWrite: false
  });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  glow.position.z = -2;
  scene.add(glow);
 
  // Track target screen-space anchor rectangles (hero slot vs story slot) in normalized device coords
  const heroSlot = document.getElementById('hero-product-slot');
  const storySlot = document.getElementById('story-product-slot');
 
  const mouse = { x: 0, y: 0 };
  window.addEventListener('mousemove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });
 
  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();
 
  // Compute NDC center of a DOM element relative to viewport, and convert to a world-space
  // offset at a fixed depth so the product visually sits "inside" that slot.
  function elementToWorldOffset(el, depth) {
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const ndcX = (cx / window.innerWidth) * 2 - 1;
    const ndcY = -((cy / window.innerHeight) * 2 - 1);
    const vFOV = THREE.MathUtils.degToRad(camera.fov);
    const distance = camera.position.z - depth;
    const height = 2 * Math.tan(vFOV / 2) * distance;
    const width = height * camera.aspect;
    return { x: (ndcX * width) / 2, y: (ndcY * height) / 2 };
  }
 
  const unwrapStorySection = document.getElementById('unwrap-story');
  const heroSection = document.getElementById('hero');
  const storySteps = document.querySelectorAll('.story-step');
  const storyDots = document.querySelectorAll('.story-progress .dot');
 
  let scrollProgress = 0; // 0 = hero, 1 = end of unwrap story
  let currentStepIndex = 0;
 
  function computeScrollProgress() {
    const storyRect = unwrapStorySection.getBoundingClientRect();
    const storyHeight = unwrapStorySection.offsetHeight - window.innerHeight;
    if (storyHeight <= 0) return 0;
    const scrolledIntoStory = -storyRect.top;
    return THREE.MathUtils.clamp(scrolledIntoStory / storyHeight, 0, 1);
  }
 
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
  updateStorySteps(0);
 
  const clock = new THREE.Clock();
  let currentOffset = { x: 0, y: 0 };
  let currentRotY = 0;
  let currentRotX = 0;
 
  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    const dt = Math.min(clock.getDelta(), 0.05);
 
    scrollProgress = computeScrollProgress();
    updateStorySteps(scrollProgress);
 
    // Determine which slot is currently active/visible to anchor the product to
    const heroRect = heroSection.getBoundingClientRect();
    const heroVisible = heroRect.bottom > window.innerHeight * 0.15;
    const activeSlot = heroVisible && scrollProgress < 0.02 ? heroSlot : storySlot;
 
    const worldOffset = elementToWorldOffset(activeSlot, 0);
    currentOffset.x += (worldOffset.x - currentOffset.x) * Math.min(1, dt * 4);
    currentOffset.y += (worldOffset.y - currentOffset.y) * Math.min(1, dt * 4);
 
    product.group.position.x = currentOffset.x;
    product.group.position.y = currentOffset.y;
 
    // unwrap driven by scroll progress through the story section
    product.updateUnwrap(scrollProgress);
 
    // base auto rotation, slower once opened, plus mouse parallax tilt, plus scroll-driven spin
    const autoSpin = prefersReducedMotion ? 0 : t * 0.18;
    const scrollSpin = scrollProgress * Math.PI * 1.15;
    const targetRotYVal = autoSpin + scrollSpin + (prefersReducedMotion ? 0 : mouse.x * 0.35);
    const targetRotXVal = (prefersReducedMotion ? 0 : mouse.y * -0.18) + Math.sin(t * 0.4) * 0.03;
 
    currentRotY += (targetRotYVal - currentRotY) * Math.min(1, dt * 3);
    currentRotX += (targetRotXVal - currentRotX) * Math.min(1, dt * 3);
    product.group.rotation.y = currentRotY;
    product.group.rotation.x = currentRotX;
 
    // gentle float
    product.group.position.y += prefersReducedMotion ? 0 : Math.sin(t * 1.1) * 0.04;
 
    // subtle camera drift with scroll for cinematic feel
    camera.position.x = prefersReducedMotion ? 0 : Math.sin(scrollProgress * Math.PI) * 0.25;
    camera.position.y = 0.3 - scrollProgress * 0.15;
    camera.lookAt(currentOffset.x, currentOffset.y * 0.3, 0);
 
    groundShadow.position.x = currentOffset.x;
    groundShadow.position.y = currentOffset.y - 0.75;
 
    renderer.render(scene, camera);
  }
  animate();
}
 
/* ============================================================
   PRODUCT COLLECTION CARD MINI-SCENES
============================================================ */
function initProductCardScenes() {
  const visuals = document.querySelectorAll('.product-visual');
  visuals.forEach((visualEl) => {
    const canvas = visualEl.querySelector('canvas');
    const theme = visualEl.dataset.productColor || 'dark';
 
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
 
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 20);
    camera.position.set(0, 0.4, 3.6);
    camera.lookAt(0, 0, 0);
 
    createLighting(scene);
 
    const product = createChocolateProduct(theme);
    product.group.scale.setScalar(1.1);
    scene.add(product.group);
    product.updateUnwrap(0.25); // partially opened, decorative
 
    let hovered = false;
    visualEl.addEventListener('mouseenter', () => { hovered = true; });
    visualEl.addEventListener('mouseleave', () => { hovered = false; });
 
    function resize() {
      const rect = visualEl.getBoundingClientRect();
      const w = Math.max(1, rect.width);
      const h = Math.max(1, rect.height);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
 
    const ro = new ResizeObserver(resize);
    ro.observe(visualEl);
    resize();
 
    let visible = false;
    const cardIo = new IntersectionObserver((entries) => {
      entries.forEach(e => { visible = e.isIntersecting; });
    }, { threshold: 0.05 });
    cardIo.observe(visualEl);
 
    const clock = new THREE.Clock();
    function animate() {
      requestAnimationFrame(animate);
      if (!visible) return;
      const t = clock.getElapsedTime();
      const dt = Math.min(clock.getDelta(), 0.05);
      const targetSpeed = hovered ? 0.9 : 0.25;
      product.group.rotation.y += (prefersReducedMotion ? 0 : dt * targetSpeed);
      product.group.rotation.x = Math.sin(t * 0.5) * 0.05;
      product.group.position.y = Math.sin(t * 1.2) * 0.03;
      renderer.render(scene, camera);
    }
    animate();
  });
}