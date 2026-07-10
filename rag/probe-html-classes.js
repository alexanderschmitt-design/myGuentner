/**
 * probe-html-classes.js — Statischer HTML-Annotations-Check
 * ----------------------------------------------------------
 * Parsed thermodynamics.html (und in Zukunft unit-selection.html, …) und
 * verifiziert die data-gpc-classes-Annotationen gegen die erwartete
 * Sichtbarkeits-Matrix aus rag/gpc-field-mapping.md.
 *
 * Algorithmus: Stack-basiertes Token-Parsing.
 *   - <div/section/article data-gpc-(not-)classes=…> push auf Stack
 *   - </div> pop
 *   - <input/select/textarea data-gpc-field=…> → Constraints = Stack + eigene Attrs
 *
 * Output: Tabelle "Feld × Klasse" mit ✓/· (visible/hidden) für jede Kombination.
 *
 * Aufruf:  node rag/probe-html-classes.js [pfad/zur/datei.html]
 *          Default: frontend/thermodynamics.html
 */

const fs = require('fs');

const file = process.argv[2] || 'frontend/thermodynamics.html';
const html = fs.readFileSync(file, 'utf-8');

const CLASSES = ['A', 'B', 'C', 'D1', 'D2', 'E1', 'E2', 'F'];
const CONTAINER_TAGS = new Set(['div', 'section', 'article', 'fieldset', 'form']);
const FIELD_TAGS = new Set(['input', 'select', 'textarea']);
// Self-closing in HTML (kein </tag> erwartet)
const VOID_TAGS = new Set(['input', 'br', 'hr', 'img', 'meta', 'link']);

function color(c, s) {
  const codes = { red: 31, green: 32, yellow: 33, gray: 90, bold: 1 };
  return `\x1b[${codes[c] || 0}m${s}\x1b[0m`;
}

function tokenize(html) {
  // Strip comments
  const noComments = html.replace(/<!--[\s\S]*?-->/g, '');
  const re = /<(\/?)([a-zA-Z][\w-]*)\b([^>]*)>/g;
  const tokens = [];
  let m;
  while ((m = re.exec(noComments)) !== null) {
    tokens.push({
      pos: m.index,
      isClose: m[1] === '/',
      tag: m[2].toLowerCase(),
      attrs: m[3] || '',
      raw: m[0]
    });
  }
  return tokens;
}

function parseConstraintsFromAttrs(attrs) {
  const arr = [];
  const c1 = attrs.match(/data-gpc-classes="([^"]+)"/);
  const c2 = attrs.match(/data-gpc-not-classes="([^"]+)"/);
  if (c1) arr.push({ notList: false, list: c1[1].split(',').map(s => s.trim()) });
  if (c2) arr.push({ notList: true, list: c2[1].split(',').map(s => s.trim()) });
  return arr;
}

function getAttr(attrs, name) {
  const m = attrs.match(new RegExp(name + '="([^"]+)"'));
  return m ? m[1] : null;
}

function isVisibleForClass(constraints, cls) {
  for (const c of constraints) {
    if (c.notList) {
      if (c.list.indexOf(cls) >= 0) return false;
    } else {
      if (c.list.indexOf(cls) < 0) return false;
    }
  }
  return true;
}

function analyze(html) {
  const tokens = tokenize(html);
  const stack = []; // [{ tag, constraints }]
  const fields = []; // { field, constraints, tag, convert, enum, attrs }

  tokens.forEach(t => {
    if (t.isClose) {
      if (CONTAINER_TAGS.has(t.tag)) {
        // Pop until matching tag
        while (stack.length > 0 && stack[stack.length - 1].tag !== t.tag) {
          stack.pop();
        }
        if (stack.length > 0) stack.pop();
      }
      return;
    }

    // Open tag
    const isSelfClosing = VOID_TAGS.has(t.tag) || /\/\s*$/.test(t.attrs);
    const ownConstraints = parseConstraintsFromAttrs(t.attrs);
    const fieldName = getAttr(t.attrs, 'data-gpc-field');

    if (fieldName) {
      const allConstraints = stack.flatMap(s => s.constraints).concat(ownConstraints);
      fields.push({
        field: fieldName,
        constraints: allConstraints,
        tag: t.tag,
        convert: getAttr(t.attrs, 'data-gpc-convert'),
        enum: getAttr(t.attrs, 'data-gpc-enum'),
        pos: t.pos
      });
    }

    if (CONTAINER_TAGS.has(t.tag) && !isSelfClosing) {
      stack.push({ tag: t.tag, constraints: ownConstraints });
    }
  });

  return fields;
}

const fields = analyze(html);

console.log(color('bold', 'HTML-Annotations-Check: ' + file));
console.log(color('gray', `${fields.length} data-gpc-field Elemente gefunden\n`));

// Header
process.stdout.write('Feld'.padEnd(40));
CLASSES.forEach(c => process.stdout.write(c.padStart(4)));
process.stdout.write('  Tag      Convert\n');
console.log('-'.repeat(85));

// Aggregate per field-name: OR-visibility (visible if any element is visible)
const byField = {};
fields.forEach(f => {
  if (!byField[f.field]) byField[f.field] = { perClass: {}, tags: new Set(), converts: new Set(), elements: [] };
  byField[f.field].tags.add(f.tag);
  if (f.convert) byField[f.field].converts.add(f.convert);
  byField[f.field].elements.push(f);
  CLASSES.forEach(cls => {
    if (isVisibleForClass(f.constraints, cls)) byField[f.field].perClass[cls] = true;
  });
});

Object.keys(byField).sort().forEach(fieldName => {
  const entry = byField[fieldName];
  process.stdout.write(fieldName.padEnd(40));
  CLASSES.forEach(cls => {
    const v = entry.perClass[cls];
    process.stdout.write(v ? color('green', '   ✓') : color('gray', '   ·'));
  });
  process.stdout.write('  ' + [...entry.tags].join(',').padEnd(8));
  process.stdout.write(' ' + [...entry.converts].join(','));
  process.stdout.write('\n');
});

// === Erwartungs-Verifikation ===
const EXPECTATIONS = {
  thermalCapacity:           CLASSES,
  inputModeCapacity:         CLASSES,
  tC_Tolerance_L:            CLASSES,
  tC_Tolerance_H:            CLASSES,
  frostThickness:            ['A', 'B', 'C'],
  fluidID:                   ['A', 'B', 'C', 'D1', 'D2', 'E1', 'E2', 'F'],
  fluidTempEvap:             ['A', 'B'],
  fluidSuperHeating:         ['A'],
  fluidSubCooling:           ['A'],
  fluidTempCond:             ['A', 'C', 'D1', 'D2', 'E1', 'E2', 'F'],
  fluidPumpMode:             ['B'],
  fluidPumpRate:             ['B'],
  fluidVolConcentration:     ['C', 'E1'],
  fluidTempInlet:            ['C', 'D1', 'D2', 'E1', 'E2', 'F'],
  noOfCircuitsThermo:        ['D1'],
  isHotGasAuto:              ['D1'],
  fluidInputMode:            ['A', 'C', 'D2', 'E1', 'E2'],
  isMaxFluidPressureDropAuto: CLASSES,  // auch F nutzt es für Supercritic-AUTO
  fluidPressureDropMax:      ['A', 'B', 'C', 'D1', 'D2', 'E1', 'E2', 'F'],
  airTemperature:            CLASSES,
  airPressure:               ['A', 'B', 'C'],
  airRelHumidity:            ['D1', 'D2', 'E1', 'E2', 'F'],
  altitude:                  ['D1', 'D2', 'E1', 'E2', 'F'],
  capacitySensibleHeatOnly:  ['A', 'B', 'C'],
  isSupercritic:             ['F'],
  isSubcritic:               ['F'],
  fluidPressure:             ['F'],
  subcriticThermalCapacity:  ['F'],
  subcriticFluidTempInlet:   ['F'],
  subcriticFluidTempCond:    ['F'],
  subcriticIsHotGasAuto:     ['F'],
  subcriticFluidPressureDropMax: ['F'],
  isSubcriticMaxFluidPressureDropAuto: ['F'],
  subcriticAirTemperature:   ['F'],
  subcriticAirRelHumidity:   ['F']
};

console.log('\n' + color('bold', '=== Erwartungs-Verifikation ==='));
let pass = 0, fail = 0;
Object.keys(EXPECTATIONS).forEach(fieldName => {
  const expectedClasses = EXPECTATIONS[fieldName];
  const actual = byField[fieldName];
  if (!actual) {
    console.log(color('red', '[FAIL] ') + fieldName + ' — Feld nicht im HTML gefunden');
    fail++;
    return;
  }
  const actualClasses = CLASSES.filter(c => actual.perClass[c]);
  const expectedSet = new Set(expectedClasses);
  const actualSet = new Set(actualClasses);
  const missing = expectedClasses.filter(c => !actualSet.has(c));
  const extra = actualClasses.filter(c => !expectedSet.has(c));
  if (missing.length === 0 && extra.length === 0) {
    pass++;
  } else {
    fail++;
    let msg = fieldName + ' — actual=' + actualClasses.join(',') + ' expected=' + expectedClasses.join(',');
    if (missing.length) msg += '  missing: ' + missing.join(',');
    if (extra.length) msg += '  extra: ' + extra.join(',');
    console.log(color('red', '[FAIL] ') + msg);
  }
});

console.log('\n' + color('bold', `Summary: ${pass} OK / ${fail} FAIL`));
process.exit(fail === 0 ? 0 : 1);
