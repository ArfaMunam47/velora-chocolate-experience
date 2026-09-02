/* ============================================================
   VELORA CART + CHECKOUT
   Self-contained cart state, drawer UI, and a demo checkout flow.
   Persists to localStorage so the bag survives a reload.
============================================================ */
(function () {
const STORAGE_KEY = 'velora-cart-v1';

function loadCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function saveCart(cart) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  } catch (e) {
    /* storage unavailable (private mode, etc.) — cart still works in-memory */
  }
}

let cart = loadCart();

/* ============================================================
   TOAST
   site.js (loaded just before this file) owns the #toast element
   and exposes window.veloraShowToast — reuse it instead of
   redeclaring toastEl/showToast here, since cart.js and site.js
   are both plain scripts sharing one global scope. The inline
   fallback covers the unlikely case site.js hasn't run yet.
============================================================ */
function cartToast(msg) {
  if (typeof window.veloraShowToast === 'function') {
    window.veloraShowToast(msg);
    return;
  }
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2400);
}

/* ============================================================
   FORMATTING
============================================================ */
const currency = (n) => `$${n.toFixed(2).replace(/\.00$/, '')}`;

function cartTotals() {
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  return { subtotal, total: subtotal };
}

/* ============================================================
   DOM REFERENCES
============================================================ */
const cartBtn = document.getElementById('cart-btn');
const mobileCartBtn = document.getElementById('mobile-cart-btn');
const cartOverlay = document.getElementById('cart-overlay');
const cartDrawer = document.getElementById('cart-drawer');
const cartClose = document.getElementById('cart-close');
const cartItemsEl = document.getElementById('cart-items');
const cartEmptyEl = document.getElementById('cart-empty');
const cartEmptyShopBtn = document.getElementById('cart-empty-shop-btn');
const cartDrawerFoot = document.getElementById('cart-drawer-foot');
const cartSubtotalEl = document.getElementById('cart-subtotal');
const cartTotalEl = document.getElementById('cart-total');
const cartCheckoutBtn = document.getElementById('cart-checkout-btn');
const cartCountEls = [document.getElementById('cart-count'), document.getElementById('cart-count-mobile')].filter(Boolean);

const checkoutSection = document.getElementById('checkout');
const checkoutFormView = document.getElementById('checkout-form-view');
const checkoutForm = document.getElementById('checkout-form');
const checkoutSummaryItems = document.getElementById('checkout-summary-items');
const checkoutSubtotalEl = document.getElementById('checkout-subtotal');
const checkoutTotalEl = document.getElementById('checkout-total');
const checkoutBackBtn = document.getElementById('checkout-back-btn');
const checkoutConfirmation = document.getElementById('checkout-confirmation');
const checkoutContinueBtn = document.getElementById('checkout-continue-btn');
const confirmName = document.getElementById('confirm-name');
const confirmEmail = document.getElementById('confirm-email');
const confirmOrderId = document.getElementById('confirm-order-id');

/* ============================================================
   RENDER
============================================================ */
function renderCart() {
  const hasItems = cart.length > 0;
  cartEmptyEl.hidden = hasItems;
  cartDrawerFoot.hidden = !hasItems;
  cartItemsEl.innerHTML = '';

  cart.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'cart-item';
    li.innerHTML = `
      <div class="cart-item-swatch" aria-hidden="true"></div>
      <div>
        <p class="cart-item-name">${item.name}</p>
        <span class="cart-item-price">${currency(item.price)} each</span>
        <div class="cart-item-qty">
          <button class="cart-qty-btn" data-action="dec" aria-label="Decrease quantity of ${item.name}">−</button>
          <span aria-live="polite">${item.qty}</span>
          <button class="cart-qty-btn" data-action="inc" aria-label="Increase quantity of ${item.name}">+</button>
        </div>
      </div>
      <button class="cart-item-remove" data-action="remove" aria-label="Remove ${item.name} from cart">Remove</button>
    `;
    li.querySelector('[data-action="dec"]').addEventListener('click', () => changeQty(item.name, -1));
    li.querySelector('[data-action="inc"]').addEventListener('click', () => changeQty(item.name, 1));
    li.querySelector('[data-action="remove"]').addEventListener('click', () => removeItem(item.name));
    cartItemsEl.appendChild(li);
  });

  const { subtotal, total } = cartTotals();
  cartSubtotalEl.textContent = currency(subtotal);
  cartTotalEl.textContent = currency(total);

  const count = cart.reduce((sum, item) => sum + item.qty, 0);
  cartCountEls.forEach((el) => {
    el.textContent = String(count);
    el.hidden = count === 0;
  });

  renderCheckoutSummary();
}

function renderCheckoutSummary() {
  if (!checkoutSummaryItems) return;
  checkoutSummaryItems.innerHTML = '';
  cart.forEach((item) => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${item.name} × ${item.qty}</span><span>${currency(item.price * item.qty)}</span>`;
    checkoutSummaryItems.appendChild(li);
  });
  const { subtotal, total } = cartTotals();
  checkoutSubtotalEl.textContent = currency(subtotal);
  checkoutTotalEl.textContent = currency(total);
}

/* ============================================================
   MUTATIONS
============================================================ */
function addItem(name, price) {
  const existing = cart.find((item) => item.name === name);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ name, price: Number(price) || 0, qty: 1 });
  }
  saveCart(cart);
  renderCart();
  cartToast(`${name} added to your bag`);
}

function changeQty(name, delta) {
  const item = cart.find((i) => i.name === name);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    cart = cart.filter((i) => i.name !== name);
  }
  saveCart(cart);
  renderCart();
}

function removeItem(name) {
  cart = cart.filter((i) => i.name !== name);
  saveCart(cart);
  renderCart();
}

/* ============================================================
   DRAWER OPEN / CLOSE
============================================================ */
let lastFocused = null;

function openDrawer() {
  lastFocused = document.activeElement;
  cartDrawer.removeAttribute('inert');
  cartDrawer.classList.add('open');
  cartOverlay.classList.add('open');
  cartClose.focus();
  document.addEventListener('keydown', onDrawerKeydown);
}

function closeDrawer() {
  cartDrawer.classList.remove('open');
  cartOverlay.classList.remove('open');
  cartDrawer.setAttribute('inert', '');
  document.removeEventListener('keydown', onDrawerKeydown);
  if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
}

function onDrawerKeydown(e) {
  if (e.key === 'Escape') closeDrawer();
}

cartBtn && cartBtn.addEventListener('click', openDrawer);
mobileCartBtn && mobileCartBtn.addEventListener('click', () => {
  document.getElementById('mobile-menu').classList.remove('open');
  document.getElementById('menu-overlay').classList.remove('open');
  document.getElementById('burger-btn').classList.remove('open');
  openDrawer();
});
cartClose && cartClose.addEventListener('click', closeDrawer);
cartOverlay && cartOverlay.addEventListener('click', closeDrawer);
cartEmptyShopBtn && cartEmptyShopBtn.addEventListener('click', () => {
  closeDrawer();
  document.getElementById('collection').scrollIntoView({ behavior: 'smooth' });
});

/* ============================================================
   ADD TO CART BUTTONS (product cards)
============================================================ */
document.querySelectorAll('.add-to-cart').forEach((btn) => {
  btn.addEventListener('click', () => {
    addItem(btn.dataset.name, parseFloat(btn.dataset.price));
  });
});

/* ============================================================
   CHECKOUT FLOW
============================================================ */
function goToCheckout() {
  if (cart.length === 0) return;
  closeDrawer();
  checkoutSection.hidden = false;
  checkoutFormView.hidden = false;
  checkoutConfirmation.hidden = true;
  renderCheckoutSummary();
  requestAnimationFrame(() => {
    checkoutSection.scrollIntoView({ behavior: 'smooth' });
  });
}

cartCheckoutBtn && cartCheckoutBtn.addEventListener('click', goToCheckout);

checkoutBackBtn && checkoutBackBtn.addEventListener('click', () => {
  checkoutSection.hidden = true;
  openDrawer();
});

checkoutForm && checkoutForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!checkoutForm.checkValidity()) {
    checkoutForm.reportValidity();
    return;
  }
  const name = document.getElementById('co-name').value.trim();
  const email = document.getElementById('co-email').value.trim();
  const orderId = `VLR-${Date.now().toString(36).toUpperCase().slice(-6)}`;

  confirmName.textContent = name ? `, ${name.split(' ')[0]}` : '';
  confirmEmail.textContent = email;
  confirmOrderId.textContent = orderId;

  checkoutFormView.hidden = true;
  checkoutConfirmation.hidden = false;

  cart = [];
  saveCart(cart);
  renderCart();
  checkoutForm.reset();
});

checkoutContinueBtn && checkoutContinueBtn.addEventListener('click', () => {
  checkoutSection.hidden = true;
  document.getElementById('hero').scrollIntoView({ behavior: 'smooth' });
});

/* ============================================================
   INIT
============================================================ */
renderCart();

window.VeloraCart = { addItem, openDrawer, closeDrawer };
})();
