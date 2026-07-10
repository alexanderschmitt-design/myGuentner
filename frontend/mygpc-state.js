/**
 * myGPC State — localStorage-basierter Wizard-State
 * --------------------------------------------------
 * Multi-Page-Vanilla-Wizard (index/thermodynamics/unit-selection/results/datasheet) braucht
 * einen Page-übergreifenden State. Wir nutzen localStorage als Persistence-Layer.
 *
 * State-Schema:
 *   productSection      number   1=Unit, 2=Bare coil
 *   productCategory     number   0..10 (API productCategory ID)
 *   productCategoryName string   Display-Name aus /productcategories
 *   architectureClass   string   A|B|C|D1|D2|E1|E2|F (siehe mygpc-class-config.js)
 *   unitInputData       object   Komplettes UnitInputData (~233 Felder, aus /defaultinputdata)
 *   foundUnits          array    FindUnitsResultOutputData[] (aus /findunits)
 *   inputDataMFCBinary  string   Aus /findunits-Response, gebraucht für /unitbidtext
 *   selectedUnit        object   Eine Zeile aus foundUnits[]
 *   unitSystem          number   0=SI, 1=US (Default 0)
 *   view                string   'basic' | 'expert' (Default 'expert')
 *
 * API:
 *   MyGPC.state.get(key) / set(key, val)
 *   MyGPC.state.snapshot() / restore(obj)
 *   MyGPC.state.reset()
 *   MyGPC.state.setCategory(section, category, name)    — auch architectureClass aktualisieren
 *   MyGPC.state.patchUid(patch)                          — partielles Update von unitInputData
 *
 * Stand: 2026-05-20
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'mygpc_state_v1';

  function readAll() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.warn('[mygpc.state] localStorage read failed:', e);
      return {};
    }
  }

  function writeAll(obj) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    } catch (e) {
      console.warn('[mygpc.state] localStorage write failed:', e);
    }
  }

  function get(key) {
    var s = readAll();
    return key == null ? s : s[key];
  }

  function set(key, val) {
    var s = readAll();
    s[key] = val;
    writeAll(s);
    fireChange(key, val);
  }

  function snapshot() {
    return readAll();
  }

  function restore(obj) {
    writeAll(obj || {});
    fireChange('__restore__', obj);
  }

  function reset() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* noop */ }
    fireChange('__reset__', null);
  }

  /**
   * Setzt Kategorie und leitet automatisch die architectureClass ab.
   * Erwartet, dass MyGPC.classConfig schon geladen ist.
   */
  function setCategory(section, category, name) {
    var s = readAll();
    s.productSection = section;
    s.productCategory = category;
    s.productCategoryName = name || null;
    if (typeof MyGPC !== 'undefined' && MyGPC.classConfig && MyGPC.classConfig.classOf) {
      s.architectureClass = MyGPC.classConfig.classOf(section, category);
    }
    // Wenn Kategorie wechselt: foundUnits / selectedUnit / MFC-Binary invalidieren,
    // weil sie sich auf alte Eingaben beziehen.
    s.foundUnits = null;
    s.inputDataMFCBinary = null;
    s.selectedUnit = null;
    s.unitInputData = null;  // wird beim nächsten /defaultinputdata-Call neu geladen
    writeAll(s);
    fireChange('productCategory', category);
  }

  /**
   * Partielles Update am unitInputData-Blob (z.B. wenn ein Form-Input geändert wird).
   * Object.assign-Patch, ohne null/undefined-Felder zu überschreiben.
   */
  function patchUid(patch) {
    var s = readAll();
    if (!s.unitInputData) s.unitInputData = {};
    Object.keys(patch).forEach(function (k) {
      s.unitInputData[k] = patch[k];
    });
    writeAll(s);
    fireChange('unitInputData', s.unitInputData);
  }

  // ============================================================
  // Change-Listener — primär für mygpc-bind.js (DOM-Re-Render)
  // ============================================================
  var listeners = [];

  function onChange(fn) {
    listeners.push(fn);
    return function () {
      listeners = listeners.filter(function (x) { return x !== fn; });
    };
  }

  function fireChange(key, val) {
    listeners.forEach(function (fn) {
      try { fn(key, val); } catch (e) { console.warn('[mygpc.state] listener error:', e); }
    });
  }

  // ============================================================
  // Export
  // ============================================================
  if (typeof window !== 'undefined') {
    window.MyGPC = window.MyGPC || {};
    window.MyGPC.state = {
      get: get,
      set: set,
      snapshot: snapshot,
      restore: restore,
      reset: reset,
      setCategory: setCategory,
      patchUid: patchUid,
      onChange: onChange,
      STORAGE_KEY: STORAGE_KEY
    };
  }
})();
