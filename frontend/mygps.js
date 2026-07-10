/* ============================================================
   myGPS — Shared runtime
   - Sub-category modal (on index.html)
   - Step-wizard renderer for wizard pages
   - Unit-system toggle (US default, SI optional)
   - Per-page query-param helpers
   ============================================================ */

(function () {

  /* ---------- Query-param helper ---------- */
  function getParams() {
    const p = new URLSearchParams(window.location.search);
    return {
      cat: p.get('cat') || 'evaporative',
      sub: p.get('sub') || ''
    };
  }

  function buildHref(file, cat, sub) {
    const q = new URLSearchParams();
    if (cat) q.set('cat', cat);
    if (sub) q.set('sub', sub);
    const qs = q.toString();
    return qs ? `${file}?${qs}` : file;
  }

  /* ---------- Unit-system toggle ---------- */
  const UNIT_KEY = 'mygps-unit-system';
  function getUnitSystem() {
    return localStorage.getItem(UNIT_KEY) || 'us';
  }
  function setUnitSystem(value) {
    localStorage.setItem(UNIT_KEY, value);
    document.documentElement.setAttribute('data-unit-system', value);
    document.querySelectorAll('[data-unit-options]').forEach(applyUnitOptions);
  }
  function applyUnitOptions(select) {
    const quantity = select.getAttribute('data-unit-options');
    const sys = getUnitSystem();
    const map = {
      capacity:    { us: ['MBH', 'tons'],  si: ['kW'] },
      temperature: { us: ['°F'],            si: ['°C'] },
      length:      { us: ['ft'],            si: ['m'] },
      flow:        { us: ['gpm'],           si: ['l/s'] },
      pressure:    { us: ['psi'],           si: ['bar'] },
      water_rate:  { us: ['$/1000 gal'],    si: ['$/m³'] },
      energy_rate: { us: ['$/kWh'],         si: ['$/kWh'] }
    };
    const opts = (map[quantity] && map[quantity][sys]) || [''];
    select.innerHTML = opts.map(o => `<option value="${o}">${o}</option>`).join('');
  }

  /* ---------- Step-wizard renderer for wizard pages ---------- */
  function renderStepWizard(currentStep) {
    const mount = document.querySelector('[data-mygps-stepwizard]');
    if (!mount || !window.MYGPS) return;
    const { cat, sub } = getParams();
    const steps = window.MYGPS.resolveSteps(cat, sub);
    const defs = window.MYGPS.STEP_DEFINITIONS;
    const currentIdx = steps.indexOf(currentStep);

    const inner = document.createElement('div');
    inner.className = 'step-wizard-inner';

    steps.forEach((id, i) => {
      const def = defs[id];
      if (!def) return;
      let stateClass = 'upcoming';
      if (i < currentIdx) stateClass = 'completed';
      if (i === currentIdx) stateClass = 'active';

      const a = document.createElement('a');
      a.href = buildHref(def.file, cat, sub);
      a.className = `step-item ${stateClass}`;
      a.innerHTML = `<span class="step-dot"></span><span class="step-label">${def.label}</span>`;
      inner.appendChild(a);

      if (i < steps.length - 1) {
        const c = document.createElement('div');
        c.className = `step-connector ${i < currentIdx ? 'completed' : ''}`;
        inner.appendChild(c);
      }
    });

    mount.innerHTML = '';
    const container = document.createElement('div');
    container.className = 'container';
    container.appendChild(inner);
    mount.appendChild(container);

    // Wire prev/next buttons that use [data-mygps-prev] / [data-mygps-next]
    document.querySelectorAll('[data-mygps-next]').forEach(el => {
      const next = steps[currentIdx + 1];
      if (next && defs[next]) {
        el.setAttribute('href', buildHref(defs[next].file, cat, sub));
      } else {
        el.style.display = 'none';
      }
    });
    document.querySelectorAll('[data-mygps-prev]').forEach(el => {
      const prev = steps[currentIdx - 1];
      if (prev && defs[prev]) {
        el.setAttribute('href', buildHref(defs[prev].file, cat, sub));
      } else {
        // Fall back to index
        el.setAttribute('href', 'index.html');
      }
    });

    // Title bar with category/sub-category
    const labels = window.MYGPS.resolveLabels(cat, sub);
    document.querySelectorAll('[data-mygps-category-label]').forEach(el => {
      el.textContent = labels.category + (labels.subcategory ? ' — ' + labels.subcategory : '');
    });
  }

  /* ---------- Boot ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    // Apply persisted unit-system on page load
    document.documentElement.setAttribute('data-unit-system', getUnitSystem());
    document.querySelectorAll('[data-unit-options]').forEach(applyUnitOptions);

    // Wire "Set all units of measure to ..." control
    document.querySelectorAll('[data-mygps-unit-toggle]').forEach(sel => {
      sel.value = getUnitSystem();
      sel.addEventListener('change', () => setUnitSystem(sel.value));
    });

    // Render step wizard if this is a wizard page
    const wizardMount = document.querySelector('[data-mygps-stepwizard]');
    if (wizardMount) {
      renderStepWizard(wizardMount.getAttribute('data-mygps-stepwizard'));
    }
  });

  // Expose helpers on window for inline scripts on wizard pages.
  window.MYGPS_RUNTIME = {
    getParams: getParams,
    buildHref: buildHref,
    getUnitSystem: getUnitSystem,
    setUnitSystem: setUnitSystem
  };

})();
