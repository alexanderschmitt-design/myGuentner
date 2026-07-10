/**
 * myGPC Bind — Generic Form ↔ State Binding-Engine
 * --------------------------------------------------
 * Walks die DOM nach data-gpc-*-Attributen ab und realisiert:
 *   1. Class-Visibility    — data-gpc-classes="A,B,C,D1,…" → element hidden wenn aktive Klasse nicht passt
 *   2. Expert-Visibility   — data-gpc-expert | .expert-field → hidden im Basic-View
 *   3. Conditional-Show    — data-gpc-show-if="<field>:<value>" → hidden wenn Bedingung nicht erfüllt
 *   4. Enum-Population     — data-gpc-enum="<key>" oder "fluids" → <option>s aus mygpc-class-config oder API
 *   5. Two-Way-Binding     — data-gpc-field="<apiProp>" → input ↔ state.unitInputData[apiProp]
 *   6. Conversion          — data-gpc-convert="W-kW|mbar-bar|bool-int|bool-invert" beim Lesen/Schreiben
 *
 * API:
 *   MyGPC.bind.init(root?)                — alles vorbereiten (Enums füllen, Visibility setzen, Felder binden)
 *   MyGPC.bind.refresh()                  — neu evaluieren (nach API-Call oder Klassen-Wechsel)
 *   MyGPC.bind.setExpertView(bool)        — Basic/Expert togglen
 *
 * Stand: 2026-05-20
 */
(function () {
  'use strict';

  var HIDDEN_CLASS = 'mygpc-hidden';
  var DISABLED_CLASS = 'mygpc-disabled';

  // Stelle sicher, dass die Hide-Klasse global wirkt — wird inline ergänzt, falls noch kein Stylesheet existiert.
  function ensureCss() {
    if (document.getElementById('mygpc-bind-style')) return;
    var s = document.createElement('style');
    s.id = 'mygpc-bind-style';
    s.textContent =
      '.' + HIDDEN_CLASS + '{display:none !important;}' +
      '.' + DISABLED_CLASS + '{opacity:0.5;pointer-events:none;}';
    document.head.appendChild(s);
  }

  /**
   * Liefert die aktuelle Architektur-Klasse aus dem State.
   */
  function currentClass() {
    var s = MyGPC.state.snapshot();
    return s.architectureClass || (s.productCategory != null ? MyGPC.classConfig.classOf(s.productSection || 1, s.productCategory) : null);
  }

  /**
   * Liefert das aktuelle UnitInputData-Objekt.
   */
  function currentUid() {
    return MyGPC.state.get('unitInputData') || {};
  }

  /**
   * Liefert den aktuellen View ('basic' | 'expert').
   * Nutzt den gleichen localStorage-Key wie die existierende Vanilla-View-Toggle-Logik.
   */
  function currentView() {
    try {
      // Existing Vanilla-Pages benutzen page-spezifische Keys; wir respektieren sie.
      return localStorage.getItem('gpc_thermo_view_v2')
        || localStorage.getItem('gpc_us_view_v2')
        || localStorage.getItem('gpc_view_v2')
        || 'expert';
    } catch (e) {
      return 'expert';
    }
  }

  function setHidden(el, hide) {
    if (hide) el.classList.add(HIDDEN_CLASS);
    else el.classList.remove(HIDDEN_CLASS);
  }

  function setDisabled(el, dis) {
    if (dis) {
      el.classList.add(DISABLED_CLASS);
      // input selbst auch disabled, damit es nicht im Submit landet
      var inputs = el.matches && el.matches('input,select,textarea') ? [el] : el.querySelectorAll('input,select,textarea');
      inputs.forEach(function (i) { i.disabled = true; });
    } else {
      el.classList.remove(DISABLED_CLASS);
      var inputs2 = el.matches && el.matches('input,select,textarea') ? [el] : el.querySelectorAll('input,select,textarea');
      inputs2.forEach(function (i) { i.disabled = false; });
    }
  }

  /**
   * Prüft Class-Match auf einem Element.
   */
  function isClassVisible(el, cls) {
    var classes = el.getAttribute('data-gpc-classes');
    var notClasses = el.getAttribute('data-gpc-not-classes');
    return MyGPC.classConfig.matchesClass(cls, classes, notClasses);
  }

  /**
   * Prüft Expert-Mode-Sichtbarkeit.
   */
  function isExpertVisible(el, view) {
    var isExpert = el.hasAttribute('data-gpc-expert') || el.classList.contains('expert-field') || el.classList.contains('us-expert-field');
    if (!isExpert) return true;
    return view === 'expert';
  }

  /**
   * Prüft show-if-Bedingung.
   */
  function isShowIfMet(el, uid) {
    var cond = el.getAttribute('data-gpc-show-if');
    if (!cond) return true;
    var parts = cond.split(':');
    var fieldName = parts[0].trim();
    var expectedRaw = parts.slice(1).join(':').trim();
    var actual = uid[fieldName];

    // Boolean-Vergleich
    if (expectedRaw === 'true') return actual === true || actual === 1;
    if (expectedRaw === 'false') return actual === false || actual === 0 || actual == null;
    // Numerischer Vergleich
    var n = Number(expectedRaw);
    if (!isNaN(n)) return actual === n;
    // String-Vergleich
    return String(actual) === expectedRaw;
  }

  /**
   * Prüft disable-if-Bedingung (Element bleibt sichtbar, ist aber gegraut/disabled).
   */
  function isDisabled(el, uid) {
    var cond = el.getAttribute('data-gpc-disable-if');
    if (!cond) return false;
    var parts = cond.split(':');
    var fieldName = parts[0].trim();
    var expectedRaw = parts.slice(1).join(':').trim();
    var actual = uid[fieldName];
    if (expectedRaw === 'true') return actual === true || actual === 1;
    if (expectedRaw === 'false') return actual === false || actual === 0 || actual == null;
    var n = Number(expectedRaw);
    if (!isNaN(n)) return actual === n;
    return String(actual) === expectedRaw;
  }

  /**
   * Hauptlogik: alle Elements mit data-gpc-classes / data-gpc-section / data-gpc-expert-Markierung
   * werden show/hide/disable.
   */
  function applyVisibility(root) {
    var cls = currentClass();
    var view = currentView();
    var uid = currentUid();
    root = root || document;

    // Sections + Felder
    var elements = root.querySelectorAll('[data-gpc-classes], [data-gpc-section], [data-gpc-show-if], [data-gpc-expert], .expert-field, .us-expert-field');
    elements.forEach(function (el) {
      var hide = false;
      if (!isClassVisible(el, cls)) hide = true;
      else if (!isExpertVisible(el, view)) hide = true;
      else if (!isShowIfMet(el, uid)) hide = true;
      setHidden(el, hide);

      // Disable-Logik nur wenn nicht eh schon hidden
      if (!hide) {
        setDisabled(el, isDisabled(el, uid));
      }
    });
  }

  /**
   * Befüllt <select>-Elemente, die ein data-gpc-enum-Attribut haben.
   * Quellen:
   *   - statische Enums aus mygpc-class-config (z.B. "motorTechnology")
   *   - "fluids" / "fluids-by-category" → dynamisch via API (kategorie-gefiltert)
   *   - "fluidinputmode" → dynamisch via API
   *   - "inputcapacitymodes" → dynamisch via API
   */
  async function populateEnums(root) {
    root = root || document;
    var selects = root.querySelectorAll('select[data-gpc-enum]');
    var cls = currentClass();
    var s = MyGPC.state.snapshot();

    for (var i = 0; i < selects.length; i++) {
      var sel = selects[i];
      var enumKey = sel.getAttribute('data-gpc-enum');
      if (sel.dataset.gpcEnumLoaded === '1') continue; // schon befüllt

      try {
        var options = await resolveEnumOptions(enumKey, cls, s.productCategory);
        if (!options || !options.length) continue;
        // Bestehende options behalten? Nein — wir ersetzen alle.
        sel.innerHTML = '';
        options.forEach(function (opt) {
          var optEl = document.createElement('option');
          optEl.value = String(opt.value);
          optEl.textContent = opt.label;
          sel.appendChild(optEl);
        });
        sel.dataset.gpcEnumLoaded = '1';
      } catch (e) {
        console.warn('[mygpc.bind] enum populate failed for "' + enumKey + '":', e);
      }
    }
  }

  async function resolveEnumOptions(enumKey, cls, productCategory) {
    var ENUMS = MyGPC.classConfig.ENUMS;

    // Statische Enums aus class-config
    if (ENUMS[enumKey]) {
      var spec = ENUMS[enumKey];
      if (spec.optionsByClass && cls && spec.optionsByClass[cls]) return spec.optionsByClass[cls];
      return spec.options || [];
    }

    // Dynamische API-Enums
    if (enumKey === 'fluids' || enumKey === 'fluids-by-category') {
      if (productCategory == null) return [];
      var r = await MyGPC.api.fluids(productCategory);
      var content = r && r.content;
      if (!Array.isArray(content)) return [];
      return content.map(function (f) {
        return { value: f.fluidID, label: f.fluidName + (f.hasImpact ? ' 🌿' : '') };
      });
    }
    if (enumKey === 'fluidinputmode') {
      var r2 = await MyGPC.api.fluidInputMode();
      var c2 = r2 && r2.content;
      if (!Array.isArray(c2)) return [];
      return c2.map(function (m) { return { value: m.nID, label: m.description }; });
    }
    if (enumKey === 'inputcapacitymodes') {
      var r3 = await MyGPC.api.inputCapacityModes();
      var c3 = r3 && r3.content;
      if (!Array.isArray(c3)) return [];
      return c3.map(function (m) { return { value: m.inputModeCapacityID, label: m.inputModeCapacityName }; });
    }

    console.warn('[mygpc.bind] Unknown enum key: "' + enumKey + '"');
    return [];
  }

  /**
   * Liest den aktuellen Wert eines Input-Elements typgerecht.
   */
  function readEl(el) {
    if (el.type === 'checkbox') return el.checked;
    if (el.type === 'radio') return el.checked ? el.value : null;
    if (el.type === 'number') {
      var v = el.value === '' ? null : Number(el.value);
      return Number.isFinite(v) ? v : null;
    }
    return el.value;
  }

  /**
   * Schreibt einen Wert in ein Input-Element typgerecht.
   */
  function writeEl(el, value) {
    if (el.type === 'checkbox') {
      el.checked = !!value;
    } else if (el.type === 'radio') {
      el.checked = String(el.value) === String(value);
    } else {
      el.value = value == null ? '' : String(value);
    }
  }

  /**
   * Two-Way-Binding: setze Werte aus uid in die Form, attach onchange-Listener.
   */
  function bindFields(root) {
    root = root || document;
    var uid = currentUid();

    var fields = root.querySelectorAll('[data-gpc-field]');
    fields.forEach(function (el) {
      var fieldName = el.getAttribute('data-gpc-field');
      var conv = el.getAttribute('data-gpc-convert');

      // Initial: API-Wert aus uid → UI
      if (uid && fieldName in uid) {
        var apiValue = uid[fieldName];
        var uiValue = MyGPC.classConfig.applyToUI(conv, apiValue);
        writeEl(el, uiValue);
      }

      // Listener attachen (idempotent: erst entfernen wenn schon dran)
      if (el.dataset.gpcBound === '1') return;
      el.dataset.gpcBound = '1';

      var evtName = (el.type === 'checkbox' || el.type === 'radio' || el.tagName === 'SELECT') ? 'change' : 'input';
      el.addEventListener(evtName, function () {
        var uiVal = readEl(el);
        var apiVal = MyGPC.classConfig.applyToAPI(conv, uiVal);
        var patch = {};
        patch[fieldName] = apiVal;
        MyGPC.state.patchUid(patch);
        // Re-evaluate visibility — show-if- und disable-if-Felder, die von diesem Feld abhängen
        applyVisibility(document);
      });
    });
  }

  /**
   * Setzt View-Mode und re-evaluiert.
   */
  function setExpertView(isExpert) {
    try { localStorage.setItem('gpc_view_v2', isExpert ? 'expert' : 'basic'); } catch (e) {}
    applyVisibility(document);
  }

  /**
   * Komplett-Refresh — nutzt aktuellen State.
   */
  function refresh() {
    applyVisibility(document);
    bindFields(document);
  }

  /**
   * Init — bereitet die ganze Page vor.
   * options.loadDefaults: wenn true und kein unitInputData im State → fetcht /defaultinputdata
   */
  async function init(options) {
    ensureCss();
    options = options || {};
    var s = MyGPC.state.snapshot();

    // 1. Falls noch kein UnitInputData im State, aber Kategorie gesetzt → fetchen
    if ((options.loadDefaults !== false) && !s.unitInputData && s.productCategory != null) {
      try {
        var res = await MyGPC.api.defaultInputData(s.productCategory);
        if (res && res.success && res.content) {
          MyGPC.state.set('unitInputData', res.content);
        } else {
          console.warn('[mygpc.bind] defaultInputData no success:', res && res.message);
        }
      } catch (e) {
        console.warn('[mygpc.bind] defaultInputData failed:', e);
      }
    }

    // 2. Enums populieren
    await populateEnums(document);

    // 3. Visibility setzen + Fields binden
    applyVisibility(document);
    bindFields(document);

    // 4. State-Change-Listener: bei externen Änderungen (z.B. Category-Switch) re-bind
    if (!init._stateListenerAttached) {
      MyGPC.state.onChange(function (key) {
        if (key === 'productCategory' || key === '__reset__' || key === '__restore__' || key === 'unitInputData') {
          refresh();
        }
      });
      init._stateListenerAttached = true;
    }

    return MyGPC.state.snapshot();
  }

  // ============================================================
  // Export
  // ============================================================
  if (typeof window !== 'undefined') {
    window.MyGPC = window.MyGPC || {};
    window.MyGPC.bind = {
      init: init,
      refresh: refresh,
      applyVisibility: applyVisibility,
      populateEnums: populateEnums,
      bindFields: bindFields,
      setExpertView: setExpertView,
      // Public utils:
      currentClass: currentClass,
      currentUid: currentUid,
      currentView: currentView
    };
  }
})();
