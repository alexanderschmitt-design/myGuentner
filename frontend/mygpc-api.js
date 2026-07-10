/**
 * myGPC API — Vanilla-Wrapper für die GPC.EU Customer API
 * --------------------------------------------------------
 * Wraps die 6 wichtigsten Endpoints unter /api/gpc-eu/* (siehe rag/gpceu-proxy.js).
 * Alle Calls gehen über den Express-Proxy (X-API-Key wird serverseitig injiziert).
 *
 * Endpoint-Liste (Phase 2 verifiziert via rag/probe-mapping.js):
 *   GET  /productcategories          — Step 1 (Category-Picker)
 *   GET  /defaultinputdata           — Step 2 init (UnitInputData-Defaults pro Kategorie)
 *   GET  /fluids                     — Step 2 (Medium-Dropdown, kategorie-gefiltert)
 *   POST /unitgroup                  — Step 3 (Series-Liste mit Validation per Kategorie+Inputs)
 *   POST /findunits                  — Step 4 (Result-Tabelle)
 *   POST /unitbidtext                — Step 5 (Datasheet-RTF)
 *   POST /unitfeatures               — Step 5 (Feature-Liste)
 *
 * Alle Aufrufe sind Promise-basiert. Fehler bubblen als Exceptions hoch.
 *
 * Stand: 2026-05-20
 */
(function () {
  'use strict';

  // Wenn auf gleicher Origin via Express-Static gerendert → /api/gpc-eu.
  // Bei Bedarf via globaler Variable override-bar.
  var BASE = (typeof window !== 'undefined' && window.MYGPC_API_BASE) || '/api/gpc-eu';
  var DEFAULT_LANG = 2;
  var DEFAULT_UNIT_SYSTEM = 0; // 0=SI, 1=US

  function buildUrl(path, query) {
    var url = BASE + '/' + String(path).replace(/^\/+/, '');
    if (query && typeof query === 'object') {
      var parts = [];
      Object.keys(query).forEach(function (k) {
        if (query[k] != null) parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(query[k]));
      });
      if (parts.length) url += '?' + parts.join('&');
    }
    return url;
  }

  function logErr(label, err) {
    console.error('[mygpc.api] ' + label + ' →', err);
  }

  async function getJson(path, query) {
    var url = buildUrl(path, query);
    var res = await fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' } });
    if (!res.ok) {
      var bodyText = await res.text().catch(function () { return ''; });
      var err = new Error('GET ' + path + ' → HTTP ' + res.status + ': ' + bodyText.slice(0, 200));
      err.status = res.status;
      throw err;
    }
    return res.json();
  }

  async function postJson(path, body, query) {
    var url = buildUrl(path, query);
    var res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(body || {})
    });
    // unitbidtext liefert RTF (text/plain), nicht JSON
    var contentType = res.headers.get('content-type') || '';
    if (!res.ok) {
      var bodyText = await res.text().catch(function () { return ''; });
      var err = new Error('POST ' + path + ' → HTTP ' + res.status + ': ' + bodyText.slice(0, 200));
      err.status = res.status;
      throw err;
    }
    if (contentType.indexOf('application/json') === 0 || contentType.indexOf('application/json') >= 0) {
      return res.json();
    }
    return res.text();
  }

  // ============================================================
  // Endpoint-Wrapper
  // ============================================================

  /** Liefert Array von { productsection, productCategory, productSectionName, productCategoryName }. */
  function productCategories(language) {
    return getJson('productcategories', { language: language || DEFAULT_LANG });
  }

  /** Liefert { success, message, content: UnitInputData (233 Felder) }. */
  function defaultInputData(productCategory) {
    return getJson('defaultinputdata', { productcategory: productCategory });
  }

  /** Liefert { success, message, content: [{ fluidID, fluidName, hasImpact, ... }] }. */
  function fluids(productCategory, languageID) {
    return getJson('fluids', { languageID: languageID || DEFAULT_LANG, productCategory: productCategory });
  }

  /** Liefert { success, message, content: [{ inputModeCapacityID, inputModeCapacityName }] }. */
  function inputCapacityModes() {
    return getJson('inputcapacitymodes');
  }

  /** Liefert { success, message, content: [{ nID, description }] }. */
  function fluidInputMode() {
    return getJson('fluidinputmode');
  }

  /**
   * POST /unitgroup — Series-Liste pro UnitInputData (mit Validation pro Series).
   * Liefert { success, content: [{ serieName, serieDescription, image, unitGroupID,
   *   validationResult, validationInfos, visible, ... }] }.
   */
  function unitGroup(unitInputData, languageID) {
    return postJson('unitgroup', unitInputData, { languageID: languageID || DEFAULT_LANG });
  }

  /**
   * POST /findunits — Result-Liste der passenden Geräte.
   * Liefert { success, foundUnits: FindUnitsResultOutputData[], inputDataMFCBinary, ... }.
   */
  function findUnits(unitInputData, opts) {
    opts = opts || {};
    var query = {
      languageID: opts.languageID || DEFAULT_LANG,
      unitSystem: opts.unitSystem != null ? opts.unitSystem : DEFAULT_UNIT_SYSTEM
    };
    if (opts.withFootnote != null) query.withFootnote = opts.withFootnote;
    return postJson('findunits', unitInputData, query);
  }

  /**
   * POST /unitbidtext — RTF-Text-Beschreibung des selektierten Geräts.
   * Body: { mfcInputData, mfcOutputData, signature } aus findunits + foundUnit.
   * Liefert ein RTF-String (text/plain).
   */
  function unitBidText(mfcInputData, mfcOutputData, signature, opts) {
    opts = opts || {};
    return postJson('unitbidtext', {
      mfcInputData: mfcInputData,
      mfcOutputData: mfcOutputData,
      signature: signature
    }, {
      languageID: opts.languageID || DEFAULT_LANG,
      unitSystem: opts.unitSystem != null ? opts.unitSystem : DEFAULT_UNIT_SYSTEM
    });
  }

  /**
   * POST /unitfeatures — Feature-Liste mit Beschreibungen.
   * Body: UnitInputData. Liefert { success, content: Feature[] }.
   */
  function unitFeatures(unitInputData, opts) {
    opts = opts || {};
    return postJson('unitfeatures', unitInputData, {
      languageID: opts.languageID || DEFAULT_LANG,
      unitSystem: opts.unitSystem != null ? opts.unitSystem : DEFAULT_UNIT_SYSTEM
    });
  }

  /** Health-Check via Proxy (kein GPC-API-Call, sondern Express-internal). */
  function health() {
    return getJson('health');
  }

  // ============================================================
  // Minimaler RTF→Plaintext-Stripper (für unitbidtext-Rendering)
  // ============================================================
  function rtfToPlain(rtf) {
    if (!rtf) return '';
    var s = String(rtf);
    s = s.replace(/^\{\\rtf[^}]*\}/, '');
    s = s.replace(/\\par\b/g, '\n').replace(/\\tab\b/g, '\t');
    s = s.replace(/\\'([0-9a-fA-F]{2})/g, function (_, hex) {
      var code = parseInt(hex, 16);
      if (code === 0xb0) return '°';
      if (code === 0xb3) return '³';
      if (code === 0xb2) return '²';
      return String.fromCharCode(code);
    });
    s = s.replace(/\\[a-zA-Z]+-?\d*\s?/g, '');
    s = s.replace(/[{}]/g, '');
    return s.trim();
  }

  // ============================================================
  // Export
  // ============================================================
  if (typeof window !== 'undefined') {
    window.MyGPC = window.MyGPC || {};
    window.MyGPC.api = {
      BASE: BASE,
      productCategories: productCategories,
      defaultInputData: defaultInputData,
      fluids: fluids,
      inputCapacityModes: inputCapacityModes,
      fluidInputMode: fluidInputMode,
      unitGroup: unitGroup,
      findUnits: findUnits,
      unitBidText: unitBidText,
      unitFeatures: unitFeatures,
      health: health,
      rtfToPlain: rtfToPlain
    };
  }
})();
