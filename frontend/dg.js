/* ============================================================
   dg.js — Data-grid runtime
   - Auto-injects filter + three-dot icons into <th> labels of
     <table class="dg dg--auto-headers">
   - Visual click-popovers for filter / column-menu (no real logic)
   - Wires up .dg-view-toggle (List / Grid)
   ============================================================ */

(function () {

  const ICON_FILTER = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="6" x2="20" y2="6"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="10" y1="18" x2="14" y2="18"/></svg>';
  const ICON_MENU   = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>';

  /* ---------- Auto-enhance headers on .dg--auto-headers tables ---------- */
  function autoEnhanceHeaders(table) {
    table.querySelectorAll('thead th').forEach(th => {
      if (th.querySelector('.dg-th-inner')) return;        // already enhanced
      if (th.dataset.dgSkip !== undefined) return;          // explicit skip (e.g. checkbox col)
      const label = th.textContent.trim();
      const labelHTML = th.innerHTML.trim();
      if (!label && !th.querySelector('input,svg')) return; // skip empty headers
      // Preserve any non-text children (e.g. <sub>) by reusing innerHTML as the label
      th.innerHTML = `
        <div class="dg-th-inner">
          <span class="dg-th-label">${labelHTML}</span>
          <button type="button" class="dg-icon-btn dg-filter-btn" aria-label="Filter">${ICON_FILTER}</button>
          <button type="button" class="dg-icon-btn dg-menu-btn"   aria-label="Column menu">${ICON_MENU}</button>
        </div>
      `;
    });
  }

  /* ---------- Click popovers ---------- */
  function buildFilterPopover(label) {
    const pop = document.createElement('div');
    pop.className = 'dg-popover';
    pop.innerHTML = `
      <h5>Filter: ${label}</h5>
      <label><input type="checkbox" checked> Equals</label>
      <label><input type="checkbox"> Contains</label>
      <label><input type="checkbox"> Starts with</label>
      <input type="text" placeholder="Filter value…">
      <div class="dg-pop-actions">
        <button type="button">Clear</button>
        <button type="button" class="primary">Apply</button>
      </div>
    `;
    return pop;
  }

  function buildMenuPopover(label) {
    const pop = document.createElement('div');
    pop.className = 'dg-popover';
    pop.innerHTML = `
      <h5>${label}</h5>
      <label><input type="checkbox" checked> Show column</label>
      <label><input type="radio" name="sort"> Sort A → Z</label>
      <label><input type="radio" name="sort"> Sort Z → A</label>
      <label><input type="radio" name="sort" checked> No sort</label>
      <label><input type="checkbox"> Pin to left</label>
      <label><input type="checkbox"> Auto-size</label>
    `;
    return pop;
  }

  function position(pop, btn) {
    const rect = btn.getBoundingClientRect();
    pop.style.left = (window.scrollX + rect.left) + 'px';
    pop.style.top  = (window.scrollY + rect.bottom + 6) + 'px';
  }

  let openPop = null;
  function close() {
    if (openPop) {
      openPop.classList.remove('open');
      openPop.remove();
      openPop = null;
    }
  }
  function openPopover(builder, btn, label) {
    close();
    const pop = builder(label);
    document.body.appendChild(pop);
    position(pop, btn);
    pop.classList.add('open');
    openPop = pop;
    setTimeout(() => document.addEventListener('click', dismiss, { once: true }), 0);
  }
  function dismiss(e) {
    if (openPop && !openPop.contains(e.target) && !e.target.closest('.dg-icon-btn')) {
      close();
    } else if (openPop) {
      document.addEventListener('click', dismiss, { once: true });
    }
  }

  function wireHeaderButtons(scope) {
    const root = scope || document;
    root.querySelectorAll('.dg .dg-filter-btn').forEach(btn => {
      if (btn.dataset.dgWired) return;
      btn.dataset.dgWired = '1';
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const th = btn.closest('th');
        const label = th && th.querySelector('.dg-th-label')
          ? th.querySelector('.dg-th-label').textContent.trim()
          : '';
        openPopover(buildFilterPopover, btn, label);
      });
    });
    root.querySelectorAll('.dg .dg-menu-btn').forEach(btn => {
      if (btn.dataset.dgWired) return;
      btn.dataset.dgWired = '1';
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const th = btn.closest('th');
        const label = th && th.querySelector('.dg-th-label')
          ? th.querySelector('.dg-th-label').textContent.trim()
          : '';
        openPopover(buildMenuPopover, btn, label);
      });
    });
  }

  /* ---------- View toggle (List / Grid) ----------
     Markup:
       <div class="dg-view-toggle" data-target="#someContainer">
         <button data-view="list" class="active">…List</button>
         <button data-view="grid">…Grid</button>
       </div>
     The target container gets `.dg-view-list` or `.dg-view-grid` toggled.
  */
  function wireViewToggles() {
    document.querySelectorAll('.dg-view-toggle').forEach(toggle => {
      const targetSel = toggle.getAttribute('data-target');
      const target = targetSel ? document.querySelector(targetSel) : toggle.parentElement;
      if (!target) return;
      // ensure default class is present
      if (!target.classList.contains('dg-view-list') && !target.classList.contains('dg-view-grid')) {
        target.classList.add('dg-view-list');
      }
      toggle.querySelectorAll('button[data-view]').forEach(b => {
        b.addEventListener('click', () => {
          toggle.querySelectorAll('button').forEach(x => x.classList.remove('active'));
          b.classList.add('active');
          target.classList.remove('dg-view-list', 'dg-view-grid');
          target.classList.add('dg-view-' + b.dataset.view);
          // Notify listeners (e.g. to lazy-render the grid view)
          target.dispatchEvent(new CustomEvent('dg:view-change', { detail: { view: b.dataset.view } }));
        });
      });
    });
  }

  /* ---------- Init ---------- */
  function init() {
    document.querySelectorAll('table.dg.dg--auto-headers').forEach(autoEnhanceHeaders);
    wireHeaderButtons(document);
    wireViewToggles();
  }

  // Re-run header-button wiring on demand (e.g. after dynamic re-render)
  window.dgRefresh = function (scope) {
    if (scope) {
      scope.querySelectorAll('table.dg.dg--auto-headers').forEach(autoEnhanceHeaders);
    }
    wireHeaderButtons(scope || document);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
