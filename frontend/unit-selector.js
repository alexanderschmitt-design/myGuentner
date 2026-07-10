/**
 * Unit-Selector — Dropdown-Menu auf `.input-integrated[data-unit-group]`
 * ----------------------------------------------------------------------
 * Beim Klick auf den Dropdown-Chevron eines Number-Inputs erscheint ein
 * Popover mit den verfügbaren Einheiten der jeweiligen Gruppe. Beim Klick
 * auf eine Einheit wird der numerische Wert konvertiert und das Unit-Label
 * aktualisiert. Vorbild: Desktop-GPC (siehe Screenshot).
 *
 * Nutzung im HTML:
 *   <div class="input-integrated" data-unit-group="pressure">
 *     <input type="number" value="1013">
 *     <span class="unit-label">mbar</span>
 *     <svg class="dropdown-icon" ...></svg>
 *   </div>
 *
 * Registriert sich automatisch beim DOMContentLoaded. Kein Init nötig.
 */
(function () {
  'use strict';

  // ============================================================
  // Konversions-Definitionen
  // Jede Gruppe hat einen Base-Unit; toBase/fromBase konvertieren dorthin bzw. zurück.
  // Temperatur hat einen Offset — deshalb Funktionen statt reinen Faktoren.
  // ============================================================
  var GROUPS = {
    power: {
      base: 'kW',
      units: {
        'W':      { toBase: function (v) { return v / 1000; },        fromBase: function (v) { return v * 1000; } },
        'kW':     { toBase: function (v) { return v; },               fromBase: function (v) { return v; } },
        'BTU/h':  { toBase: function (v) { return v * 0.000293071; }, fromBase: function (v) { return v / 0.000293071; } },
        'ton':    { toBase: function (v) { return v * 3.51685; },     fromBase: function (v) { return v / 3.51685; } },
        'MBH':    { toBase: function (v) { return v * 0.293071; },    fromBase: function (v) { return v / 0.293071; } }
      }
    },
    length: {
      base: 'mm',
      units: {
        'mm': { toBase: function (v) { return v; },        fromBase: function (v) { return v; } },
        'cm': { toBase: function (v) { return v * 10; },   fromBase: function (v) { return v / 10; } },
        'in': { toBase: function (v) { return v * 25.4; }, fromBase: function (v) { return v / 25.4; } }
      }
    },
    temperature: {
      base: '°C',
      units: {
        '°C': { toBase: function (v) { return v; },              fromBase: function (v) { return v; } },
        '°F': { toBase: function (v) { return (v - 32) * 5 / 9; }, fromBase: function (v) { return v * 9 / 5 + 32; } },
        'K':  { toBase: function (v) { return v - 273.15; },      fromBase: function (v) { return v + 273.15; } }
      }
    },
    tempDiff: {
      // Für Temperaturdifferenzen (Überhitzung, Unterkühlung) — kein Offset.
      base: 'K',
      units: {
        'K':  { toBase: function (v) { return v; },        fromBase: function (v) { return v; } },
        '°F': { toBase: function (v) { return v * 5 / 9; },  fromBase: function (v) { return v * 9 / 5; } },
        '°R': { toBase: function (v) { return v * 5 / 9; },  fromBase: function (v) { return v * 9 / 5; } }
      }
    },
    pressure: {
      base: 'mbar',
      units: {
        'mbar': { toBase: function (v) { return v; },           fromBase: function (v) { return v; } },
        'bar':  { toBase: function (v) { return v * 1000; },    fromBase: function (v) { return v / 1000; } },
        'Pa':   { toBase: function (v) { return v / 100; },     fromBase: function (v) { return v * 100; } },
        'kPa':  { toBase: function (v) { return v * 10; },      fromBase: function (v) { return v / 10; } },
        'psi':  { toBase: function (v) { return v * 68.9476; }, fromBase: function (v) { return v / 68.9476; } },
        'mmHg': { toBase: function (v) { return v * 1.33322; }, fromBase: function (v) { return v / 1.33322; } }
      }
    },
    volumeFlow: {
      base: 'm³/h',
      units: {
        'm³/s':  { toBase: function (v) { return v * 3600; },    fromBase: function (v) { return v / 3600; } },
        'm³/h':  { toBase: function (v) { return v; },           fromBase: function (v) { return v; } },
        'cfm':   { toBase: function (v) { return v * 1.69901; }, fromBase: function (v) { return v / 1.69901; } },
        'gpm':   { toBase: function (v) { return v * 0.227125; },fromBase: function (v) { return v / 0.227125; } },
        'l/s':   { toBase: function (v) { return v * 3.6; },     fromBase: function (v) { return v / 3.6; } },
        'l/min': { toBase: function (v) { return v * 0.06; },    fromBase: function (v) { return v / 0.06; } },
        'l/h':   { toBase: function (v) { return v / 1000; },    fromBase: function (v) { return v * 1000; } }
      }
    }
  };

  // Optional-Alias mit HTML-Entities, damit Autoren "m&sup3;/h" schreiben können.
  var UNIT_LABEL_ALIASES = {
    'm&sup3;/h': 'm³/h',
    'm&sup3;/s': 'm³/s',
    '&deg;C':    '°C',
    '&deg;F':    '°F',
    '&deg;R':    '°R'
  };

  // ============================================================
  // Popover-Handling — ein einziges globales Menü, das umpositioniert wird.
  // ============================================================
  var menu = null;
  var currentWrap = null;

  function createMenu() {
    if (menu) return menu;
    menu = document.createElement('div');
    menu.className = 'unit-menu';
    menu.setAttribute('role', 'listbox');
    menu.hidden = true;
    document.body.appendChild(menu);
    return menu;
  }

  function closeMenu() {
    if (menu) menu.hidden = true;
    currentWrap = null;
  }

  function openMenuFor(wrap) {
    var groupKey = wrap.getAttribute('data-unit-group');
    var group = GROUPS[groupKey];
    if (!group) return;

    var currentUnit = getCurrentUnit(wrap);
    var m = createMenu();
    m.innerHTML = '';

    Object.keys(group.units).forEach(function (unit) {
      var item = document.createElement('button');
      item.type = 'button';
      item.className = 'unit-menu-item' + (unit === currentUnit ? ' is-active' : '');
      item.setAttribute('data-unit', unit);
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', unit === currentUnit ? 'true' : 'false');
      item.innerHTML = (unit === currentUnit
        ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>'
        : '<span style="width:14px;display:inline-block;"></span>') +
        '<span>' + escapeHtml(unit) + '</span>';
      item.addEventListener('click', function (ev) {
        ev.stopPropagation();
        applyUnitChange(wrap, unit);
        closeMenu();
      });
      m.appendChild(item);
    });

    // Positionieren: unter dem Chevron, rechtsbündig zum Input.
    var rect = wrap.getBoundingClientRect();
    m.hidden = false;
    // Nach hidden=false ist offsetWidth verlässlich.
    var menuWidth = m.offsetWidth;
    var top = rect.bottom + window.scrollY + 4;
    var left = rect.right + window.scrollX - menuWidth;
    if (left < 8) left = 8;
    m.style.top = top + 'px';
    m.style.left = left + 'px';
    currentWrap = wrap;
  }

  // ============================================================
  // Helpers
  // ============================================================
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function normalizeUnitLabel(text) {
    var t = (text || '').trim();
    return UNIT_LABEL_ALIASES[t] || t;
  }

  function getCurrentUnit(wrap) {
    // 1) Explicit data-unit-current wins.
    var explicit = wrap.getAttribute('data-unit-current');
    if (explicit) return explicit;
    // 2) Aus dem .unit-label-Element ablesen.
    var labelEl = wrap.querySelector('.unit-label');
    if (labelEl) return normalizeUnitLabel(labelEl.textContent);
    return null;
  }

  function applyUnitChange(wrap, newUnit) {
    var groupKey = wrap.getAttribute('data-unit-group');
    var group = GROUPS[groupKey];
    if (!group) return;
    var oldUnit = getCurrentUnit(wrap);
    if (oldUnit === newUnit) return;

    var input = wrap.querySelector('input[type="number"], input:not([type])');
    var labelEl = wrap.querySelector('.unit-label');
    if (!input) return;

    var rawVal = parseFloat(input.value);
    if (!isNaN(rawVal) && group.units[oldUnit] && group.units[newUnit]) {
      var inBase = group.units[oldUnit].toBase(rawVal);
      var converted = group.units[newUnit].fromBase(inBase);
      // Runden: 4 signifikante Stellen ohne wissenschaftliche Notation.
      input.value = roundSmart(converted);
    }
    if (labelEl) labelEl.textContent = newUnit;
    wrap.setAttribute('data-unit-current', newUnit);

    // Event für andere Skripte, die auf Unit-Wechsel reagieren wollen.
    wrap.dispatchEvent(new CustomEvent('unit-change', {
      bubbles: true,
      detail: { group: groupKey, unit: newUnit, value: input.value }
    }));
  }

  function roundSmart(v) {
    if (v === 0) return 0;
    var abs = Math.abs(v);
    var decimals = abs >= 100 ? 1 : abs >= 10 ? 2 : abs >= 1 ? 3 : 4;
    return parseFloat(v.toFixed(decimals));
  }

  // ============================================================
  // Global-Click-Handler — Delegation auf .input-integrated[data-unit-group]
  // ============================================================
  document.addEventListener('click', function (ev) {
    var wrap = ev.target.closest('.input-integrated[data-unit-group]');
    if (wrap) {
      // Klicks im Input-Feld selbst öffnen das Menü nicht.
      if (ev.target.tagName === 'INPUT') return;
      ev.preventDefault();
      if (currentWrap === wrap) {
        closeMenu();
      } else {
        openMenuFor(wrap);
      }
      return;
    }
    // Klick außerhalb → schließen
    if (menu && !menu.hidden && !ev.target.closest('.unit-menu')) {
      closeMenu();
    }
  });

  // Escape schließt das Menü.
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && menu && !menu.hidden) closeMenu();
  });

  // Beim Scrollen/Resize neu positionieren oder schließen.
  window.addEventListener('scroll', closeMenu, true);
  window.addEventListener('resize', closeMenu);

  // Public API für den Fall, dass andere Skripte den aktuellen Wert in Base-Unit brauchen.
  window.UnitSelector = {
    getValueInBase: function (wrap) {
      var groupKey = wrap.getAttribute('data-unit-group');
      var group = GROUPS[groupKey];
      if (!group) return null;
      var unit = getCurrentUnit(wrap);
      var input = wrap.querySelector('input[type="number"], input:not([type])');
      if (!input || !group.units[unit]) return null;
      var v = parseFloat(input.value);
      if (isNaN(v)) return null;
      return group.units[unit].toBase(v);
    },
    GROUPS: GROUPS
  };
})();
