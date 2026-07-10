/**
 * myGPC Impact — Kumulativer Impact-Score über den Wizard hinweg
 * ---------------------------------------------------------------
 * Liefert einen Score von 0.8 (Base) bis ~3.4 (max), basierend auf
 * impact-freundlichen Entscheidungen in unitInputData. Der Score
 * wird auf jeder Wizard-Page identisch berechnet — die Engine ist
 * stateless gegenüber der Page, nur abhängig vom UnitInputData-Blob.
 *
 * Score-Modell (Phase 3 — Accessory-Weights rebalanced, neue Rules nach 4 Screenshots 2026-05-24):
 *   Base:                                          0.8
 *   + 0.9  Refrigerant with low GWP (fluid.hasImpact)
 *   + 0.85 Motor technology = EC (motorTechnology=2)
 *   + 0.85 Higher efficiency class (efficiencyClass != "--")
 *   + 0.8  Defrosting = Air defrost (defrosting=80)         ┐
 *   + 0.6  Defrosting = Hotgas (defrosting=264)             │ exklusiv,
 *   + 0.6  Defrosting = Warm brine (defrosting=265)         ┘ nur eine kann firen
 *   + 0.25 Güntner Streamer (airHoseConnectionInclStreamer=1 / GuentnerStreamer=1)
 *   + 0.2  0-10V signal required, only EC (enableForMounting=1)        — NEU
 *   + 0.15 Coil Defender (coil_Defender=1)
 *   + 0.1  Speed controller (controllerType in 3/7/10)
 *   + 0.1  Fan ring heater (fanRingHeater=1)                            — NEU
 *
 * Verifikation gegen Screenshot Unit-Selection (2026-05-23):
 *   0.8 base + 0.9 (CO2 R744) + 0.85 (EC) + 0.85 (Efficiency A) + 0.8 (Air defrost) = 4.2 ✓
 * Default cat=0 (Evap DX, alles Default = Cost-opt + "--" + Air defrost): 0.8+0.9+0.8 = 2.5
 * Maximum (alle Treffer, Air defrost-Pfad): 4.2 + 0.25+0.2+0.15+0.1+0.1 = 5.0 → 5 grüne Sterne.
 *
 * API:
 *   MyGPC.impact.computeScore(uid, ctx?) → { score, breakdown }
 *   MyGPC.impact.renderRatingBar({valueId?, starsId?}) → { score, breakdown }
 *   MyGPC.impact.init({valueId?, starsId?}) → setup + State-Listener
 *   MyGPC.impact.loadFluidImpactMap(productCategory) → Promise<Map<Number, Boolean>>
 *   MyGPC.impact.IMPACT_RULES (Array — kann von außen erweitert werden)
 *   MyGPC.impact.BASE_SCORE (0.8)
 *
 * Stand: 2026-05-23
 */
(function () {
  'use strict';

  var BASE_SCORE = 0.8;

  // Reihenfolge der Rules: nach Page + dann nach Wertigkeit, damit
  // die Tooltip-Breakdown sinnvoll von oben nach unten gelesen werden kann.
  var IMPACT_RULES = [
    // -------- Thermodynamics --------
    {
      id: 'fluid',
      label: 'Refrigerant with low GWP',
      page: 'thermodynamics',
      delta: 0.9,
      predicate: function (uid, ctx) {
        if (!uid || uid.fluidID == null) return false;
        var fid = Number(uid.fluidID);
        if (!Number.isFinite(fid)) return false;
        return ctx && ctx.fluidImpactMap && ctx.fluidImpactMap.get(fid) === true;
      }
    },

    // -------- Unit Selection — Options --------
    {
      id: 'motorTech',
      label: 'EC fan technology (energy-efficient)',
      page: 'unit-selection',
      delta: 0.85,
      predicate: function (uid) {
        // PDF #186: 2 = EC (electronically commutated)
        return Number(uid && uid.motorTechnology) === 2;
      }
    },
    {
      id: 'efficiencyClass',
      label: 'Higher efficiency class (A++/A+/A/B/…)',
      page: 'unit-selection',
      delta: 0.85,
      predicate: function (uid) {
        var ec = uid && uid.efficiencyClass;
        // Default "--" oder leer = no filter; jeder andere Wert = aktivierter Filter
        return !!ec && ec !== '--' && ec !== '' && ec !== 'No filter defined';
      }
    },

    // -------- Defrosting (exklusive Werte — pro Unit nur einer aktiv) --------
    // Im Live-UI-Dropdown haben "Air defrost", "Hotgas defrost" und "Warm brine defrost"
    // ein 🌿-Icon. Electric-Varianten (258/263/339) und "User-defined" sind nicht impact-friendly.
    {
      id: 'defrostAir',
      label: 'Air defrost (no energy required)',
      page: 'unit-selection',
      delta: 0.8,
      predicate: function (uid) {
        return Number(uid && uid.defrosting) === 80;  // PDF #49: 80 = Air defrost
      }
    },
    {
      id: 'defrostHotgas',
      label: 'Hotgas defrost (reuses compressor waste heat)',
      page: 'unit-selection',
      delta: 0.6,
      predicate: function (uid) {
        return Number(uid && uid.defrosting) === 264;  // PDF #49: 264 = Hotgas
      }
    },
    {
      id: 'defrostBrine',
      label: 'Warm brine defrost (reuses waste heat)',
      page: 'unit-selection',
      delta: 0.6,
      predicate: function (uid) {
        return Number(uid && uid.defrosting) === 265;  // PDF #49: 265 = Warm brine
      }
    },

    // -------- Unit Selection — Accessories (mit 🌿 in Live-UI markiert) --------
    {
      id: 'streamer',
      label: 'Güntner Streamer (extended air throw)',
      page: 'unit-selection',
      delta: 0.25,
      predicate: function (uid) {
        if (!uid) return false;
        return Number(uid.airHoseConnectionInclStreamer) === 1
            || Number(uid.GuentnerStreamer) === 1;
      }
    },
    {
      id: 'zeroToTenVSignal',
      label: '0–10V signal required (only EC, enables speed control)',
      page: 'unit-selection',
      delta: 0.2,
      predicate: function (uid) {
        // PDF #63 EnableForMounting: für AirCooler → 1 = "0-10V signal required (only EC!)"
        // Property kann je nach Backend enableForMounting oder EnableForMounting heißen
        if (!uid) return false;
        return Number(uid.enableForMounting) === 1 || Number(uid.EnableForMounting) === 1;
      }
    },
    {
      id: 'coilDefender',
      label: 'Coil Defender (full powder-coating, extended life)',
      page: 'unit-selection',
      delta: 0.15,
      predicate: function (uid) {
        if (!uid) return false;
        return Number(uid.coil_Defender) === 1 || Number(uid.Coil_Defender) === 1;
      }
    },

    // -------- Unit Selection — Terminal Box / Controller --------
    {
      id: 'speedController',
      label: 'Speed controller (variable fan RPM)',
      page: 'unit-selection',
      delta: 0.1,
      predicate: function (uid) {
        // PDF #42: 3=Continuous (EC/sinus/phase-cut), 7=GMM EC, 10=GMM EC w/ remote display
        var ct = Number(uid && uid.controllerType);
        return ct === 3 || ct === 7 || ct === 10;
      }
    },
    {
      id: 'fanRingHeater',
      label: 'Fan ring heater (reliability in cold conditions)',
      page: 'unit-selection',
      delta: 0.1,
      predicate: function (uid) {
        // PDF #73 FanRingHeater: bool-as-int (0=no, 1=yes). Property-Case kann variieren.
        if (!uid) return false;
        return Number(uid.fanRingHeater) === 1 || Number(uid.FanRingHeater) === 1;
      }
    }
  ];

  // Page-scoped Cache — wird in init() / loadFluidImpactMap() befüllt
  var _fluidImpactMap = new Map();
  var _listenerAttached = false;

  function loadFluidImpactMap(productCategory) {
    if (productCategory == null) {
      _fluidImpactMap = new Map();
      return Promise.resolve(_fluidImpactMap);
    }
    if (!window.MyGPC || !MyGPC.api || !MyGPC.api.fluids) {
      console.warn('[mygpc/impact] MyGPC.api not available — loadFluidImpactMap skipped');
      return Promise.resolve(_fluidImpactMap);
    }
    return MyGPC.api.fluids(productCategory, 2).then(function (fr) {
      _fluidImpactMap = new Map();
      if (fr && fr.content && Array.isArray(fr.content)) {
        fr.content.forEach(function (f) {
          // Numerisches Keying — Dropdown-Value ist String, API-Value ist Int.
          _fluidImpactMap.set(Number(f.fluidID), !!f.hasImpact);
        });
      }
      return _fluidImpactMap;
    }).catch(function (e) {
      console.warn('[mygpc/impact] fluids load failed:', e);
      return _fluidImpactMap;
    });
  }

  function computeScore(uid, ctx) {
    var realCtx = ctx || { fluidImpactMap: _fluidImpactMap };
    var breakdown = [];
    var score = BASE_SCORE;
    if (!uid) return { score: score, breakdown: breakdown };
    IMPACT_RULES.forEach(function (rule) {
      var match = false;
      try { match = !!rule.predicate(uid, realCtx); } catch (_) { /* ignore rule errors */ }
      if (match) {
        score += rule.delta;
        breakdown.push({ id: rule.id, label: rule.label, delta: rule.delta, page: rule.page });
      }
    });
    return { score: score, breakdown: breakdown };
  }

  function renderStars(filled) {
    var html = '';
    for (var i = 1; i <= 5; i++) {
      var color = i <= filled ? '#00c897' : '#d8d8d8';
      html += '<svg width="24" height="24" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" fill="' + color + '"/></svg>';
    }
    return html;
  }

  function renderRatingBar(opts) {
    opts = opts || {};
    var valueId = opts.valueId || 'mygpc-rating-value';
    var starsId = opts.starsId || 'mygpc-rating-stars';
    var uid = (window.MyGPC && MyGPC.state) ? (MyGPC.state.get('unitInputData') || {}) : {};
    var result = computeScore(uid);

    var valueEl = document.getElementById(valueId);
    var starsEl = document.getElementById(starsId);
    if (valueEl) valueEl.textContent = result.score.toFixed(1);
    if (starsEl) starsEl.innerHTML = renderStars(Math.round(result.score));

    // Tooltip mit Breakdown — auf dem .rating-bar-Container
    var host = (valueEl && valueEl.closest('.rating-bar')) || (starsEl && starsEl.closest('.rating-bar'));
    if (host) {
      var lines = ['Impact rating: ' + result.score.toFixed(1) + ' / 5.0', 'Base: ' + BASE_SCORE.toFixed(1)];
      if (result.breakdown.length === 0) {
        lines.push('(No impact-friendly choices selected yet)');
      } else {
        result.breakdown.forEach(function (b) {
          lines.push('+' + b.delta.toFixed(1) + ' · ' + b.label);
        });
      }
      host.title = lines.join('\n');
    }

    return result;
  }

  function init(opts) {
    opts = opts || {};
    if (!window.MyGPC || !MyGPC.state) {
      console.warn('[mygpc/impact] MyGPC.state not available — init aborted');
      return Promise.resolve(null);
    }
    var s = MyGPC.state.snapshot();
    var p = s.productCategory != null
      ? loadFluidImpactMap(s.productCategory)
      : Promise.resolve(new Map());

    return p.then(function () {
      renderRatingBar(opts);
      if (!_listenerAttached) {
        MyGPC.state.onChange(function (key, val) {
          if (key === 'productCategory') {
            // Andere Kategorie → fluidImpactMap neu laden, dann rendern
            loadFluidImpactMap(val).then(function () { renderRatingBar(opts); });
          } else if (key === 'unitInputData' || key === '__restore__') {
            renderRatingBar(opts);
          }
        });
        _listenerAttached = true;
      }
      return computeScore(MyGPC.state.get('unitInputData') || {});
    });
  }

  if (typeof window !== 'undefined') {
    window.MyGPC = window.MyGPC || {};
    window.MyGPC.impact = {
      BASE_SCORE: BASE_SCORE,
      IMPACT_RULES: IMPACT_RULES,
      loadFluidImpactMap: loadFluidImpactMap,
      computeScore: computeScore,
      renderRatingBar: renderRatingBar,
      renderStars: renderStars,
      init: init
    };
  }
})();
