#!/usr/bin/env node
/**
 * Build GPC.EU UnitInputData parameter reference from the official PDF documentation.
 *
 * Reads:  rag/UnitInputData_Documentation_2026.1.pdf
 * Writes: rag/gpc-parameters.json   — canonical machine-readable reference
 *         rag/gpc-parameters.md     — generated human-readable reference
 */
const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

const PDF_PATH  = path.join(__dirname, 'UnitInputData_Documentation_2026.1.pdf');
const TXT_PATH  = path.join(__dirname, 'UnitInputData_Documentation_2026.1.txt');
const JSON_PATH = path.join(__dirname, 'gpc-parameters.json');
const MD_PATH   = path.join(__dirname, 'gpc-parameters.md');

// Order matters: longer literals must come first so the alternation matches greedily within the alt.
const UNITS = [
  'VolPercent', 'WorkDays', 'Degree_C', 'kg_per_h', 'm3_per_h',
  'Percent', 'K_TD', 'mbar', 'None', 'DMS', 'dBA', 'bar', 'mm', 'Pa',
  'K', 'W', 'm',
];
const DATATYPES = ['Int32', 'Int64', 'Double', 'Boolean', 'String', 'List`1'];
const GROUPS    = ['Thermodynamics', 'Options', 'Limitations', 'Startpage', 'Recalculation', 'Hydro', 'Extras', 'UnitSelection', 'Unknown'];

const PRODUCT_CATEGORY_NAMES = {
  0:  'DX evaporator (Cold)',
  1:  'Flooded evaporator (Cold)',
  2:  'Air cooler / brine (Cold)',
  3:  'Condenser (Warm)',
  4:  'Brine cooler / dry cooler (Warm)',
  5:  'Sub cooler (Warm)',
  6:  'Oil cooler (Warm)',
  7:  'Gas cooler (Warm)',
  10: 'CO2 gas cooler (Warm)',
};

const escapeRegex = s => s.replace(/[.*+?^${}()|[\]\\`]/g, '\\$&');

// Manual enum tables for properties whose PDF rendering breaks the generic value/description split,
// or whose enums are documented under a sibling property name.
const ENUM_OVERRIDES = {
  PowerSupply: [
    { value: '0',  description: 'no constraint' },
    { value: '3',  description: '115V 1~ 60Hz' },
    { value: '4',  description: '208-230V 1~ 60Hz' },
    { value: '5',  description: '208-230V 3~ 60Hz' },
    { value: '6',  description: '230V 1~ 50Hz' },
    { value: '7',  description: '380V 1~ 50Hz' },
    { value: '8',  description: '380V 3~ 60Hz' },
    { value: '9',  description: '400V 3~ 50Hz' },
    { value: '10', description: '400V 3~ 60Hz' },
    { value: '11', description: '460V 1~ 60Hz' },
    { value: '12', description: '460V 3~ 60Hz' },
    { value: '13', description: '575V 3~ 60Hz' },
    { value: '14', description: '230V 3~ 50Hz' },
    { value: '15', description: '230V 3~ 60Hz' },
    { value: '16', description: '230V 1~ 60Hz' },
    { value: '18', description: '110V 1~ 50Hz' },
    { value: '19', description: '110V 1~ 60Hz' },
  ],
  // MotorTechnology (#140) has no enum table in the PDF — the documented values are listed
  // for SwitchCabinetMotorTechnology (#186), and the live API uses the same value set.
  MotorTechnology: [
    { value: '-1', description: 'All fan motor technologies are considered' },
    { value: '-2', description: 'The fan motor technology is energy optimized' },
    { value: '-3', description: 'The fan motor technology is cost optimized' },
    { value: '1',  description: 'The motor technology is AC' },
    { value: '2',  description: 'The motor technology is EC (electronically commutated)' },
  ],
};

function applyEnumOverride(name, enums) {
  if (ENUM_OVERRIDES[name]) return ENUM_OVERRIDES[name].map(e => ({ ...e, _override: true }));
  return enums;
}

function findNameUnitBoundary(text) {
  const nameRe = /^[A-Za-z_][A-Za-z0-9_]*$/;
  const candidates = [];
  for (let L = 1; L < text.length; L++) {
    const namePart = text.slice(0, L);
    if (!nameRe.test(namePart)) continue;
    const rest = text.slice(L);
    for (const unit of UNITS) {
      if (rest.startsWith(unit)) {
        const after = rest.slice(unit.length);
        if (after.length === 0 || /^[A-Z]/.test(after)) {
          candidates.push({ name: namePart, unit, total: L + unit.length });
        }
      }
    }
  }
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => (b.total - a.total) || (b.unit.length - a.unit.length));
  return candidates[0];
}

const UNITS_RE     = UNITS.map(escapeRegex).join('|');
const DATATYPES_RE = DATATYPES.map(escapeRegex).join('|');
const GROUPS_RE    = GROUPS.join('|');

async function ensureText() {
  if (fs.existsSync(TXT_PATH)) return fs.readFileSync(TXT_PATH, 'utf8');
  const data = await pdf(fs.readFileSync(PDF_PATH));
  fs.writeFileSync(TXT_PATH, data.text);
  return data.text;
}

function splitIntoRecords(text) {
  const lines = text.split(/\r?\n/);
  const records = [];
  let currentSeq = 0;
  let buffer = [];

  const isPageHeader = (l) =>
    /^\s*NameUsedUnitInfoTextDatatypeGroup\s*$/.test(l) ||
    /^\s*Version:\s*GPC\.EU\s*Customer/.test(l) ||
    /^\s*UnitInputData\s+Attribute\s+Documentation/.test(l);

  for (const line of lines) {
    if (isPageHeader(line)) continue;

    const expected = currentSeq + 1;
    const startRe = new RegExp(`^${expected}([A-Za-z_])`);
    if (startRe.test(line)) {
      if (currentSeq > 0) records.push({ seq: currentSeq, raw: buffer.join('\n') });
      currentSeq = expected;
      buffer = [line.replace(new RegExp(`^${expected}`), '')];
    } else {
      buffer.push(line);
    }
  }
  if (currentSeq > 0) records.push({ seq: currentSeq, raw: buffer.join('\n') });
  return records;
}

function parseRecord({ seq, raw }) {
  // Step 1: locate the line containing the DataType+Group anchor (always adjacent literals).
  const tgInline = new RegExp(`(${DATATYPES_RE})(${GROUPS_RE})`);
  const lines = raw.split('\n');
  let tgIdx = -1, datatype = null, group = null, tgLineMatch = null;
  for (let i = 0; i < lines.length; i++) {
    const m = tgInline.exec(lines[i]);
    if (m) { tgIdx = i; datatype = m[1]; group = m[2]; tgLineMatch = m; break; }
  }
  if (tgIdx < 0) return { seq, raw, _error: 'No DataType+Group marker found' };

  // Header lines = lines up to and including the one that holds DataType+Group; trim that line at the anchor.
  const headerLines = lines.slice(0, tgIdx + 1).map(l => l);
  const tgPos = headerLines[headerLines.length - 1].indexOf(datatype + group);
  headerLines[headerLines.length - 1] = headerLines[headerLines.length - 1].slice(0, tgPos);
  const enumPart = lines.slice(tgIdx + 1).join('\n');

  // Step 2: locate the Name+Unit boundary on the naive join (no separator).
  // Regex-driven lazy/greedy both fail on different cases:
  //   - Lazy stops at first valid pair: e.g. (Miniu, m) + uppercase 'R' wins over (MiniumRequiredSubcooling, K_TD).
  //   - Greedy stops at latest valid pair: e.g. (FluidPressurem, bar) wins over (FluidPressure, mbar).
  // Explicit scan: enumerate all valid (name, unit) pairs, pick the one with the LONGEST total span,
  // tie-broken by longest unit. InfoText must start with an uppercase letter (sentence start) or be empty.
  const headerNaive = headerLines.join('');
  const nu = findNameUnitBoundary(headerNaive);
  if (!nu) return { seq, raw, headerNaive, _error: 'No Name+Unit boundary found' };
  const { name, unit: unitRaw } = nu;
  const nameUnitEnd = name.length + unitRaw.length;

  // Step 3: rebuild InfoText from header lines using SPACE joins. Lines (or portions) entirely within
  // the Name+Unit prefix are dropped; lines after the boundary become word-broken InfoText.
  let cum = 0;
  const infoTextParts = [];
  for (const ln of headerLines) {
    const lnStart = cum;
    const lnEnd = cum + ln.length;
    if (lnEnd <= nameUnitEnd) {
      // entire line is in Name+Unit prefix → skip
    } else if (lnStart >= nameUnitEnd) {
      infoTextParts.push(ln);
    } else {
      infoTextParts.push(ln.slice(nameUnitEnd - lnStart));
    }
    cum = lnEnd;
  }
  const infoText = infoTextParts.join(' ').replace(/\s+/g, ' ').trim();

  const enumLines = enumPart.split('\n').map(s => s.trim()).filter(Boolean);
  let enums = [];
  // Order matters: try LONGER literal alternates BEFORE shorter ones. "TRUE"/"FALSE" before [A-Z];
  // "A++"/"A+" before "A". "No filter defined" is the only multi-word literal.
  const enumValueRe = /^(No filter defined|TRUE|FALSE|A\+\+|A\+|-?\d+|[A-Z])(.*)$/;
  for (const line of enumLines) {
    const em = enumValueRe.exec(line);
    if (em) {
      enums.push({ value: em[1], description: em[2].trim() });
    } else if (enums.length > 0) {
      enums[enums.length - 1].description = (enums[enums.length - 1].description + ' ' + line).trim();
    } else {
      enums.push({ value: null, description: line });
    }
  }

  // Property-specific enum overrides — these properties have value/description collision patterns
  // (description starts with digit) that the generic parser can't disambiguate without knowing the value set.
  enums = applyEnumOverride(name, enums);

  return {
    seq,
    name,
    unit: unitRaw === 'None' ? null : unitRaw,
    datatype,
    group,
    description: infoText,
    enums,
  };
}

function extractProductCategoryHints(description) {
  // "ProductCategory = 0, 1, 2", "ProductCategory 3", "ProductCategory = 3 or 6"
  const hits = [];
  const re = /ProductCategory\s*(?:=|is)?\s*((?:\d+\s*(?:,|or|to|\/|and|\s)?\s*)+)/gi;
  let m;
  while ((m = re.exec(description)) !== null) {
    const nums = m[1].match(/\d+/g);
    if (nums) hits.push(...nums.map(n => parseInt(n, 10)));
  }
  return Array.from(new Set(hits)).sort((a, b) => a - b);
}

function buildMarkdown(out) {
  const groups = [...new Set(out.parameters.map(p => p.group))].sort();
  const byGroup = groups.map(g => ({
    group: g,
    params: out.parameters.filter(p => p.group === g).sort((a, b) => a.name.localeCompare(b.name)),
  }));

  const lines = [];
  lines.push(`# GPC.EU UnitInputData — Parameter Reference`);
  lines.push('');
  lines.push(`> **Quelle:** \`${out.source}\` — Version ${out.version}`);
  lines.push(`> **Generiert:** ${out.generated}  · ${out.count} Properties`);
  lines.push(`> **Erzeugt von:** \`rag/build-gpc-parameters.js\` aus \`rag/gpc-parameters.json\` — Markdown nicht von Hand editieren.`);
  lines.push('');
  lines.push(`Dieses Dokument ist die kanonische, API-zentrische Referenz für das \`UnitInputData\`-Schema der **GPC.EU Customer API**. Pro Property: offizielle Beschreibung, Datentyp, Einheit, Group-Kategorie, vollständiger Enum-Werte-Set. Die UI-zentrische Sicht (welche Form-Felder welche Properties bedienen) liegt in \`rag/gpc-field-mapping.md\`.`);
  lines.push('');

  // Index by group
  lines.push(`## Inhalt — nach Group`);
  lines.push('');
  for (const g of groups) {
    const count = out.parameters.filter(p => p.group === g).length;
    lines.push(`- [${g}](#${g.toLowerCase()}) — ${count}`);
  }
  lines.push('');

  // Alphabetical index
  lines.push(`## Alphabetischer Index`);
  lines.push('');
  const allSorted = [...out.parameters].sort((a, b) => a.name.localeCompare(b.name));
  // Three columns
  const cols = 3;
  const rows = Math.ceil(allSorted.length / cols);
  lines.push(`| | | |`);
  lines.push(`|---|---|---|`);
  for (let r = 0; r < rows; r++) {
    const cells = [];
    for (let c = 0; c < cols; c++) {
      const idx = c * rows + r;
      const p = allSorted[idx];
      cells.push(p ? `[\`${p.name}\`](#${anchor(p.name)})` : '');
    }
    lines.push(`| ${cells.join(' | ')} |`);
  }
  lines.push('');

  // Per-group sections
  for (const { group, params } of byGroup) {
    lines.push(`---`);
    lines.push('');
    lines.push(`## ${group}`);
    lines.push('');
    if (group === 'Unknown') {
      lines.push(`> Die Group **Unknown** sammelt Properties, die im offiziellen Dokumentations-Tool nicht gruppiert wurden — die meisten sind **Accessory-Flags** (0/1) oder **Controller-/SwitchCabinet-Sub-Properties**. Sie sind also nicht „unwichtig", nur uneinheitlich gepflegt.`);
      lines.push('');
    }
    for (const p of params) {
      lines.push(`### \`${p.name}\``);
      lines.push('');
      const meta = [
        `**#${p.seq}**`,
        `Type: \`${p.datatype}\``,
        `Unit: ${p.unit ? '`' + p.unit + '`' : '—'}`,
        `Group: \`${p.group}\``,
      ];
      if (p.productCategories && p.productCategories.length) {
        const labels = p.productCategories.map(c => `\`${c}\``).join(', ');
        meta.push(`ProductCategory: ${labels}`);
      }
      lines.push(meta.join(' · '));
      lines.push('');
      lines.push(p.description || '_(keine Beschreibung)_');
      lines.push('');
      if (p.enums && p.enums.length) {
        lines.push(`| Value | Description |`);
        lines.push(`|---|---|`);
        for (const e of p.enums) {
          const v = e.value === null ? '_(continuation)_' : `\`${e.value}\``;
          lines.push(`| ${v} | ${escapeMd(e.description)} |`);
        }
        lines.push('');
      }
    }
  }

  return lines.join('\n');
}

function anchor(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
function escapeMd(s) {
  return (s || '').replace(/\|/g, '\\|');
}

(async () => {
  const text = await ensureText();
  const records = splitIntoRecords(text);
  console.log(`Found ${records.length} record blocks`);

  const parsed = records.map(parseRecord);
  const errors = parsed.filter(p => p._error);
  console.log(`Parsed: ${parsed.length}, errors: ${errors.length}`);
  errors.forEach(e => console.log(`  #${e.seq}: ${e._error}`));

  const enriched = parsed.map(p => {
    if (p._error) return p;
    const cats = extractProductCategoryHints(p.description);
    return { ...p, productCategories: cats.length ? cats : null };
  });

  // Sanity: sequence gaps
  const seqs = new Set(enriched.map(p => p.seq));
  const gaps = [];
  const maxSeq = Math.max(...seqs);
  for (let i = 1; i <= maxSeq; i++) if (!seqs.has(i)) gaps.push(i);
  console.log(`Max seq: ${maxSeq}, gaps: ${gaps.length ? gaps.join(', ') : 'none'}`);

  const byGroup = enriched.reduce((a, p) => { a[p.group || 'INVALID'] = (a[p.group || 'INVALID'] || 0) + 1; return a; }, {});
  const byType  = enriched.reduce((a, p) => { a[p.datatype || 'INVALID'] = (a[p.datatype || 'INVALID'] || 0) + 1; return a; }, {});
  console.log('By group:', byGroup);
  console.log('By datatype:', byType);

  const out = {
    source: 'UnitInputData_Documentation_2026.1.pdf',
    version: 'GPC.EU Customer 2026.1-310',
    generated: new Date().toISOString(),
    count: enriched.length,
    productCategoryNames: PRODUCT_CATEGORY_NAMES,
    parameters: enriched,
  };

  fs.writeFileSync(JSON_PATH, JSON.stringify(out, null, 2));
  console.log(`Wrote ${JSON_PATH} (${(fs.statSync(JSON_PATH).size / 1024).toFixed(1)} KB)`);

  fs.writeFileSync(MD_PATH, buildMarkdown(out));
  console.log(`Wrote ${MD_PATH} (${(fs.statSync(MD_PATH).size / 1024).toFixed(1)} KB)`);
})();
