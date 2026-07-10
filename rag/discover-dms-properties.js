/**
 * DMS Property Discovery — schlägt Mapping für die Frontend-Filter vor
 * --------------------------------------------------------------------
 * Lädt das DMS-Source-Schema (alle ~238 Properties), prüft pro Property,
 * wie viele distinkte Werte es gibt, und klassifiziert sie:
 *
 *   filter-perfect   3–50 distinkte Werte, string-artig → Dropdown-Kandidat
 *   filter-many      50–500 Werte → Autocomplete-fähig
 *   filter-too-many  >500 Werte → Volltext-Suche
 *   numeric          Werte sind primär Zahlen/Datum → kein Dropdown-Kandidat
 *   no-data          Property leer / kein Wert in der Stichprobe
 *
 * Output:
 *   - Konsole: sortierte Tabelle
 *   - rag/dms-property-mapping.json mit Vorschlag für Frontend-Mapping
 *
 * Aufruf:
 *   node rag/discover-dms-properties.js               # Top 30 (priorisiert)
 *   node rag/discover-dms-properties.js --limit=60    # mehr probieren
 *   node rag/discover-dms-properties.js --all         # alle (kann ~5 Min dauern)
 *   node rag/discover-dms-properties.js --clear-cache # Cache leeren und neu
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const dms = require('./dms-connector');

// ---------------------------------------------------------------------------
// CLI-Argumente
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const argFlag = (name) => args.includes('--' + name);
const argVal = (name, def) => {
  const arg = args.find((a) => a.startsWith('--' + name + '='));
  return arg ? arg.split('=')[1] : def;
};

const LIMIT = argFlag('all') ? Infinity : parseInt(argVal('limit', '30'), 10);
const CLEAR_CACHE = argFlag('clear-cache');
const VERBOSE = argFlag('verbose');

const CACHE_FILE = path.join(__dirname, '.dms-property-cache.json');
const OUTPUT_FILE = path.join(__dirname, 'dms-property-mapping.json');

// ---------------------------------------------------------------------------
// Heuristik: welche Property-Namen sind wahrscheinlich Filter-relevant?
// ---------------------------------------------------------------------------
const FILTER_KEYWORDS_HIGH = [
  'series', 'family', 'group', 'category', 'product', 'document',
  'brand', 'modell', 'model', 'serie', 'familie', 'gruppe', 'kategorie',
  'type', 'class', 'klasse', 'language', 'sprache', 'status', 'state',
  'doc.*type', 'dokumenttyp', 'dokumentart', 'art',
];
const FILTER_KEYWORDS_LOW = [
  'date', 'datum', 'time', 'created', 'modified', 'erstell',
  'id', 'number', 'amount', 'preis', 'price', 'currency',
];

function priorityScore(displayName) {
  if (!displayName) return 0;
  const lower = displayName.toLowerCase();
  let score = 0;
  for (const kw of FILTER_KEYWORDS_HIGH) {
    if (new RegExp(kw, 'i').test(lower)) score += 10;
  }
  for (const kw of FILTER_KEYWORDS_LOW) {
    if (new RegExp(kw, 'i').test(lower)) score -= 3;
  }
  return score;
}

// ---------------------------------------------------------------------------
// Cache (Property-Facets sind teuer, ~1s pro Call)
// ---------------------------------------------------------------------------
function loadCache() {
  if (CLEAR_CACHE && fs.existsSync(CACHE_FILE)) fs.unlinkSync(CACHE_FILE);
  if (fs.existsSync(CACHE_FILE)) {
    try { return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8')); }
    catch (e) { return {}; }
  }
  return {};
}
function saveCache(cache) {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf-8');
}

// ---------------------------------------------------------------------------
// Klassifikation eines Property-Sets
// ---------------------------------------------------------------------------
function classify(values) {
  if (!values || values.length === 0) return 'no-data';

  const numericRatio = values.filter(function(v) {
    const s = String(v.value || v.label || v).trim();
    return /^[\d.,\-+e]+$/i.test(s) || /^\d{4}-\d{2}-\d{2}/.test(s);
  }).length / values.length;

  if (numericRatio > 0.7) return 'numeric';
  if (values.length <= 50) return 'filter-perfect';
  if (values.length <= 500) return 'filter-many';
  return 'filter-too-many';
}

function extractValues(facetResponse) {
  // d.velop d.3one liefert Facet-Counts in unterschiedlicher Form.
  // Wir tasten uns durch die wahrscheinlichsten Pfade.
  if (!facetResponse) return [];
  if (Array.isArray(facetResponse)) return facetResponse;
  if (Array.isArray(facetResponse.facets)) return facetResponse.facets;
  if (Array.isArray(facetResponse.values)) return facetResponse.values;
  if (Array.isArray(facetResponse.items)) return facetResponse.items;
  if (facetResponse._embedded) {
    if (Array.isArray(facetResponse._embedded.facets)) return facetResponse._embedded.facets;
    if (Array.isArray(facetResponse._embedded.values)) return facetResponse._embedded.values;
  }
  return [];
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
(async () => {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  DMS Property Discovery');
  console.log('═══════════════════════════════════════════════════════════════');

  // 1. Source-Schema laden
  console.log('\n[1/3] Lade Source-Schema (/source)…');
  const source = await dms.getSourceDefinition();
  const allProps = source.properties || [];
  console.log('   ✅ ' + allProps.length + ' Properties geladen (Source: "' + source.displayName + '")');

  // 2. Properties priorisieren
  const sorted = allProps
    .map(function(p) { return Object.assign({}, p, { priority: priorityScore(p.displayName) }); })
    .sort(function(a, b) { return b.priority - a.priority; });

  console.log('\n   Top-Priorisierung (heuristisch nach Property-Namen):');
  sorted.slice(0, 12).forEach(function(p) {
    const arrow = p.priority > 0 ? '↑' : (p.priority < 0 ? '↓' : ' ');
    console.log('   ' + arrow + ' [' + String(p.priority).padStart(3) + '] ' +
      (p.type || '?').padEnd(8) + ' ' + p.displayName);
  });
  if (LIMIT < sorted.length) {
    console.log('   … (Probe limitiert auf Top-' + LIMIT + ', --all für alle)');
  }

  // 3. Pro Property Facet-Werte holen
  const cache = loadCache();
  const candidates = sorted.slice(0, Math.min(LIMIT, sorted.length));
  console.log('\n[2/3] Lade Facet-Werte für ' + candidates.length + ' Properties (parallel, mit Cache)…');

  // Sequenzieller Lauf statt Promise.all — Retry-Logic skaliert besser
  // wenn der Server eh hakt, und parallele 500er stressen ihn unnötig.
  const results = [];
  let serverIssueCount = 0;
  for (const prop of candidates) {
    if (cache[prop.key]) {
      results.push(Object.assign({}, prop, cache[prop.key], { fromCache: true }));
      continue;
    }
    try {
      const facets = await dms.getFacetValues(prop.key);
      const values = extractValues(facets);
      const result = {
        valueCount: values.length,
        sampleValues: values.slice(0, 5).map(function(v) {
          if (typeof v === 'string') return v;
          return v.label || v.value || v.name || JSON.stringify(v).slice(0, 60);
        }),
        classification: classify(values),
      };
      cache[prop.key] = result;
      results.push(Object.assign({}, prop, result, { fromCache: false }));
    } catch (err) {
      const isServerErr = /HTTP 5\d\d/.test(err.message);
      if (isServerErr) serverIssueCount++;
      const result = {
        valueCount: 0,
        sampleValues: [],
        classification: isServerErr ? 'server-error' : 'error',
        error: err.message.slice(0, 120),
      };
      cache[prop.key] = result;
      results.push(Object.assign({}, prop, result, { fromCache: false }));
      // Wenn der Server systematisch 500 liefert, brechen wir nach 3 Fehlversuchen ab,
      // um nicht für nichts ~5 Min zu warten.
      if (serverIssueCount >= 3) {
        console.warn('\n   ⚠ Mehrere 500-Fehler — DMS-Facet-API scheint deaktiviert oder fehlerhaft.');
        console.warn('     Breche Discovery ab, schreibe Mapping-Vorschlag aus Heuristik.\n');
        break;
      }
    }
  }

  saveCache(cache);
  console.log('   ✅ Fertig (' + results.filter(function(r) { return r.fromCache; }).length +
    ' aus Cache, ' + results.filter(function(r) { return !r.fromCache; }).length + ' frisch)');

  // 4. Auswertung
  console.log('\n[3/3] Klassifikation:\n');

  const byClass = {
    'filter-perfect':  results.filter(function(r) { return r.classification === 'filter-perfect'; }),
    'filter-many':     results.filter(function(r) { return r.classification === 'filter-many'; }),
    'filter-too-many': results.filter(function(r) { return r.classification === 'filter-too-many'; }),
    'numeric':         results.filter(function(r) { return r.classification === 'numeric'; }),
    'no-data':         results.filter(function(r) { return r.classification === 'no-data'; }),
    'server-error':    results.filter(function(r) { return r.classification === 'server-error'; }),
    'error':           results.filter(function(r) { return r.classification === 'error'; }),
  };

  // Fallback: wenn Facet-API systematisch 500 liefert, basiere Mapping-Vorschlag
  // ausschließlich auf Property-Namen-Heuristik. Klar gekennzeichnet im Output.
  const facetApiBroken = byClass['server-error'].length >= results.length / 2;
  if (facetApiBroken) {
    console.log('⚠ DMS Facet-API liefert systematisch 500 — Mapping-Vorschlag basiert nur auf Property-Namen.\n');
  }

  function printSection(label, items, icon) {
    if (items.length === 0) return;
    console.log(icon + ' ' + label + ' (' + items.length + '):');
    items.forEach(function(r) {
      const sample = r.sampleValues && r.sampleValues.length > 0
        ? '  ↳ "' + r.sampleValues.slice(0, 3).join('", "') + '"' + (r.valueCount > 3 ? ' …' : '')
        : '';
      console.log('  • ' + r.displayName.padEnd(45) + ' [' + (r.type || '?').padEnd(8) + '] ' +
        String(r.valueCount).padStart(4) + ' Werte');
      if (sample) console.log(sample);
      if (r.error) console.log('     ⚠ ' + r.error.slice(0, 80));
    });
    console.log('');
  }

  printSection('Filter-perfect (Dropdown-Kandidaten — 3–50 Werte)', byClass['filter-perfect'], '🎯');
  printSection('Filter-many (Autocomplete-fähig — 50–500 Werte)', byClass['filter-many'], '🔍');
  printSection('Filter-too-many (Volltext)', byClass['filter-too-many'], '📚');
  if (VERBOSE) {
    printSection('Numerisch / Datum (kein Filter-Kandidat)', byClass['numeric'], '🔢');
    printSection('No-data (in Stichprobe leer)', byClass['no-data'], '∅');
    printSection('Fehler', byClass['error'], '⚠');
  }

  // 5. Mapping-Vorschlag schreiben
  // Wenn die Facet-API kaputt ist, fallen wir auf Heuristik zurück:
  // Top-Properties mit hoher Priorität + heuristisch zugeordnetem Frontend-Slot
  const heuristicCandidates = sorted
    .slice(0, 20)
    .filter(function(p) { return p.priority > 0 && p.type === 'String'; })
    .map(function(p) {
      return {
        propertyKey: p.key,
        displayName: p.displayName,
        type: p.type,
        priority: p.priority,
        suggestedFrontendField: heuristicFrontendField(p.displayName),
      };
    });

  const mapping = {
    generatedAt: new Date().toISOString(),
    repository: dms.config.repositoryId,
    source: source.displayName,
    propertiesAnalyzed: results.length,
    propertiesTotal: allProps.length,
    facetApiAvailable: !facetApiBroken,
    serverErrors: byClass['server-error'].length,
    suggestedFilters: byClass['filter-perfect'].map(function(r) {
      return {
        propertyKey: r.key,
        displayName: r.displayName,
        type: r.type,
        valueCount: r.valueCount,
        sampleValues: r.sampleValues,
        suggestedFrontendField: heuristicFrontendField(r.displayName),
      };
    }),
    autocompleteFilters: byClass['filter-many'].map(function(r) {
      return {
        propertyKey: r.key,
        displayName: r.displayName,
        type: r.type,
        valueCount: r.valueCount,
      };
    }),
    heuristicCandidates: heuristicCandidates,
    notes: facetApiBroken
      ? [
          'DMS Facet-API lieferte systematisch HTTP 500 — kein Mapping aus echten Daten möglich.',
          'heuristicCandidates basiert nur auf Property-Namen.',
          'Bitte den DMS-Admin um (a) eine Korrektur des /dmsobjectPropFacet-Endpoints oder',
          '(b) die korrekte Aufrufsyntax für /srm/?sourceid=...&sourceproperties=...',
          'Cache liegt in rag/.dms-property-cache.json — `--clear-cache` löscht ihn.',
        ]
      : [
          'Filter-perfect = direkter Dropdown im Frontend-Modal',
          'Filter-many = Autocomplete-Input',
          'Hänge `--all` an, um alle ' + allProps.length + ' Properties zu prüfen.',
          'Cache liegt in rag/.dms-property-cache.json — `--clear-cache` löscht ihn.',
        ],
  };
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(mapping, null, 2), 'utf-8');
  console.log('\n📄 Mapping-Vorschlag geschrieben: ' + path.relative(process.cwd(), OUTPUT_FILE));
  if (facetApiBroken) {
    console.log('   → ' + heuristicCandidates.length + ' Heuristik-Kandidaten (Facet-API down)');
    console.log('\n   Top-Vorschläge:');
    heuristicCandidates.slice(0, 6).forEach(function(c) {
      console.log('     • ' + c.displayName.padEnd(40) + (c.suggestedFrontendField ? '→ ' + c.suggestedFrontendField : ''));
    });
  } else {
    console.log('   → ' + mapping.suggestedFilters.length + ' Dropdown-Kandidaten, ' +
      mapping.autocompleteFilters.length + ' Autocomplete-Kandidaten');
  }
})().catch(function(err) {
  console.error('\n💥 Discovery abgebrochen:', err);
  process.exit(1);
});

/** Heuristik: welcher Frontend-Filter-Slot passt am besten zu diesem Property-Namen? */
function heuristicFrontendField(displayName) {
  if (!displayName) return null;
  const lower = displayName.toLowerCase();
  if (/series|serie/i.test(lower))   return 'productSeries';
  if (/family|familie/i.test(lower)) return 'productFamily';
  if (/group|gruppe/i.test(lower))   return 'productGroup';
  if (/category|kategorie/i.test(lower)) return 'productCategory';
  if (/level/i.test(lower))          return 'productLevel';
  if (/document.*type|doc.*type|dokument.*art|dokumenttyp/i.test(lower)) return 'docType';
  if (/language|sprache/i.test(lower)) return 'language';
  return null;
}
