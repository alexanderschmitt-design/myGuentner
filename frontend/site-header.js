/* ============================================================
   site-header.js — single source of truth for the global header.
   Loaded on every page; renders into <header data-app-header>.
   Set data-active="<id>" on the marker to highlight a nav item.
   ============================================================ */

(function () {

  const NAV_ITEMS = [
    { id: 'overview',   label: 'Overview',     href: 'overview.html'  },
    { id: 'mygpc',      label: 'myGPC',        href: 'index.html'     },
    { id: 'spareparts', label: 'mySpareParts', href: 'spareparts.html'},
    { id: 'mytools',    label: 'myTools',      href: '#', dropdown: [
        { label: 'Adiabatic Efficiency Calculator',  href: 'adiabatic-calculator.html' }
    ]},
    { id: 'projects',   label: 'Projects',     href: 'projects.html'  },
    { id: 'favorites',  label: 'Favorites',    href: 'favorites.html' },
    { id: 'documents',  label: 'Documents',    href: 'documents.html' }
  ];

  const ICON_LOGO_BARS = '<svg class="logo-bars" width="32" height="20" viewBox="0 0 32 20"><rect x="0" y="6" width="3" height="8" rx="1" fill="#39EDB5"/><rect x="5" y="2" width="3" height="16" rx="1" fill="#39EDB5"/><rect x="10" y="4" width="3" height="12" rx="1" fill="#2DC8A0"/><rect x="15" y="0" width="3" height="20" rx="1" fill="#2AAE8C"/><rect x="20" y="6" width="3" height="8" rx="1" fill="#2896E0"/><rect x="25" y="3" width="3" height="14" rx="1" fill="#2666E0"/></svg>';
  const ICON_SEARCH = '<svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
  const ICON_STAR = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
  const ICON_BELL = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>';
  const ICON_CART = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>';
  const ICON_CHEVRON = '<svg class="avatar-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>';
  const ICON_CHEVRON_SM = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>';

  const REGION_KEY = 'mygpc_region';
  const REGIONS = ['EMEA/DE', 'APO/EN', 'NLA/EN'];

  function getRegion() {
    try {
      const v = localStorage.getItem(REGION_KEY);
      return REGIONS.indexOf(v) >= 0 ? v : 'EMEA/DE';
    } catch (e) { return 'EMEA/DE'; }
  }

  function setRegion(value) {
    if (REGIONS.indexOf(value) < 0) return;
    try { localStorage.setItem(REGION_KEY, value); } catch (e) {}
    // Update every header instance currently in the DOM (label + radio).
    document.querySelectorAll('[data-region-current]').forEach(el => { el.textContent = value; });
    document.querySelectorAll('[data-region-panel] input[type="radio"]').forEach(r => {
      r.checked = (r.value === value);
    });
    window.dispatchEvent(new CustomEvent('mygpc:region-change', { detail: { region: value } }));
  }

  function renderAvatarMenu(initials) {
    const fullName = 'Ovidiu Cosma';
    const currentRegion = getRegion();
    const regionRadios = REGIONS.map(r =>
      `<label><input type="radio" name="region" value="${r}"${r === currentRegion ? ' checked' : ''}> ${r}</label>`
    ).join('');
    const ICON_BOOKMARK = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>';
    const ICON_DOC      = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>';
    const ICON_WRENCH   = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>';
    const ICON_BOX      = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>';
    const ICON_EYE      = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
    const ICON_USERS    = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>';
    const ICON_FEEDBACK = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>';
    const ICON_HELP     = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
    const ICON_GLOBE    = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>';
    const ICON_LOGOUT   = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>';
    const ICON_CHEV_DN  = '<svg class="avatar-menu-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>';

    return `
      <div class="avatar-menu" data-avatar-menu role="menu">
        <div class="avatar-menu-header">
          <span class="avatar-menu-square">${initials}</span>
          <div>
            <div class="avatar-menu-name">${fullName}</div>
            <a href="#" class="avatar-menu-link-profile">View profile</a>
          </div>
        </div>
        <a class="avatar-menu-item" href="#">${ICON_BOOKMARK}<span class="avatar-menu-item-grow">Companies</span></a>
        <a class="avatar-menu-item" href="#">${ICON_DOC}<span class="avatar-menu-item-grow">Sales orders</span></a>
        <a class="avatar-menu-item" href="#">${ICON_WRENCH}<span class="avatar-menu-item-grow">Service orders</span></a>
        <a class="avatar-menu-item" href="product-manager.html">${ICON_BOX}<span class="avatar-menu-item-grow">Product Manager</span></a>
        <a class="avatar-menu-item" href="#">${ICON_EYE}<span class="avatar-menu-item-grow">Start demo</span></a>
        <a class="avatar-menu-item" href="customers-orders.html">${ICON_USERS}<span class="avatar-menu-item-grow">Customer orders</span></a>
        <div class="avatar-menu-divider"></div>
        <a class="avatar-menu-item" href="#">${ICON_FEEDBACK}<span class="avatar-menu-item-grow">Give feedback</span></a>
        <a class="avatar-menu-item" href="#">${ICON_HELP}<span class="avatar-menu-item-grow">Get help</span></a>
        <div class="avatar-menu-divider"></div>
        <button type="button" class="avatar-menu-item" data-region-toggle>
          ${ICON_GLOBE}
          <span class="avatar-menu-item-grow">Region</span>
          <span class="avatar-menu-item-aux" data-region-current>${currentRegion}</span>
          ${ICON_CHEV_DN}
        </button>
        <div class="avatar-menu-region" data-region-panel>
          ${regionRadios}
        </div>
        <div class="avatar-menu-divider"></div>
        <a class="avatar-menu-item" href="#">${ICON_LOGOUT}<span class="avatar-menu-item-grow">Log out</span></a>
      </div>
    `;
  }

  function renderNav(active) {
    return NAV_ITEMS.map(item => {
      const isActive = item.id === active ? ' class="active"' : '';
      if (item.dropdown) {
        const subs = item.dropdown.map(s => `<a href="${s.href}">${s.label}</a>`).join('');
        return `<div class="header-nav-item header-nav-has-dropdown${item.id === active ? ' active' : ''}">
          <a href="${item.href}" class="header-nav-trigger">${item.label} ${ICON_CHEVRON_SM}</a>
          <div class="header-nav-dropdown">${subs}</div>
        </div>`;
      }
      return `<a href="${item.href}"${isActive}>${item.label}</a>`;
    }).join('');
  }

  function renderHeader(host) {
    const active = host.getAttribute('data-active') || '';
    const initials = host.getAttribute('data-avatar') || 'AS';
    const homeHref = 'overview.html';
    host.innerHTML = `
      <div class="header-inner">
        <div class="header-left">
          <a href="${homeHref}" class="logo">
            ${ICON_LOGO_BARS}
            <span class="logo-text"><span class="logo-my">my</span><span class="logo-name">Güntner</span></span>
          </a>
          <div class="search-bar">
            ${ICON_SEARCH}
            <input type="text" placeholder="Search or quickly jump to a page">
          </div>
        </div>
        <div class="header-right">
          <nav class="header-nav">${renderNav(active)}</nav>
          <div class="header-divider"></div>
          <div class="header-icons">
            <a href="favorites.html" class="header-icon" aria-label="Favorites">${ICON_STAR}</a>
            <button type="button" class="header-icon header-icon-bell" aria-label="Notifications">
              ${ICON_BELL}
              <span class="header-icon-badge">3</span>
            </button>
            <a href="cart.html" class="header-icon header-cart" aria-label="Cart">
              ${ICON_CART}
              <span class="header-cart-label">Cart</span>
              <span class="header-cart-count" data-cart-count hidden>0</span>
            </a>
          </div>
          <div class="user-avatar-wrap">
            <button type="button" class="user-avatar">
              ${ICON_CHEVRON}
              <span class="avatar-initials">${initials}</span>
            </button>
            ${renderAvatarMenu(initials)}
          </div>
        </div>
      </div>
    `;

    // Wire nav dropdown toggle
    host.querySelectorAll('.header-nav-has-dropdown > .header-nav-trigger').forEach(trigger => {
      trigger.addEventListener('click', e => {
        e.preventDefault();
        const item = trigger.parentElement;
        const wasOpen = item.classList.contains('open');
        host.querySelectorAll('.header-nav-has-dropdown.open').forEach(o => o.classList.remove('open'));
        if (!wasOpen) item.classList.add('open');
      });
    });

    // Wire avatar menu toggle
    const avatarBtn = host.querySelector('.user-avatar');
    const avatarMenu = host.querySelector('[data-avatar-menu]');
    if (avatarBtn && avatarMenu) {
      avatarBtn.addEventListener('click', e => {
        e.stopPropagation();
        avatarMenu.classList.toggle('open');
      });
      avatarMenu.addEventListener('click', e => {
        // Stop bubbling to the document-level dismissal handler;
        // individual handlers (region toggle, links) still fire.
        e.stopPropagation();
      });
      // Region sub-toggle
      const regionToggle = avatarMenu.querySelector('[data-region-toggle]');
      const regionPanel  = avatarMenu.querySelector('[data-region-panel]');
      const regionLabel  = avatarMenu.querySelector('[data-region-current]');
      if (regionToggle && regionPanel) {
        regionToggle.addEventListener('click', e => {
          e.preventDefault();
          e.stopPropagation();
          regionToggle.classList.toggle('is-expanded');
          regionPanel.classList.toggle('open');
        });
        regionPanel.querySelectorAll('input[type="radio"]').forEach(r => {
          r.addEventListener('change', () => {
            if (r.checked) setRegion(r.value);
          });
        });
        regionPanel.addEventListener('click', e => e.stopPropagation());
      }
    }

    // Outside click + Escape closes everything
    document.addEventListener('click', e => {
      if (!host.contains(e.target)) {
        host.querySelectorAll('.header-nav-has-dropdown.open').forEach(o => o.classList.remove('open'));
        if (avatarMenu) avatarMenu.classList.remove('open');
      }
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        host.querySelectorAll('.header-nav-has-dropdown.open').forEach(o => o.classList.remove('open'));
        if (avatarMenu) avatarMenu.classList.remove('open');
      }
    });
  }

  function updateCartBadges() {
    if (!window.Cart) return;
    const n = window.Cart.count();
    document.querySelectorAll('[data-cart-count]').forEach(el => {
      el.textContent = n;
      el.hidden = n === 0;
    });
  }

  function wireCart() {
    if (!window.Cart) return;
    updateCartBadges();
    window.Cart.onChange(updateCartBadges);
  }

  function init() {
    document.querySelectorAll('[data-app-header]').forEach(renderHeader);

    // Auto-load cart.js so the cart-count badge works on every page.
    if (window.Cart) {
      wireCart();
    } else {
      const s = document.createElement('script');
      s.src = 'cart.js';
      s.onload = wireCart;
      document.head.appendChild(s);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
