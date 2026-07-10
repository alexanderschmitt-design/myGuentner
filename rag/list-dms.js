/**
 * DMS Inventory — Liste der aktuell auswählbaren DMS-Dokumente
 * --------------------------------------------------------------
 * Macht parallele Volltextsuchen mit produkt-typischen Stichworten
 * und sammelt alle Treffer mit Content. Ergänzt für jeden Treffer
 * Größe und MIME-Typ via HEAD-Request.
 *
 * Aufruf:
 *   node rag/list-dms.js                          # Default-Stichworte
 *   node rag/list-dms.js --queries="GFH,GVH,GHN"  # eigene Stichwortliste
 *   node rag/list-dms.js --output=dms-inventory.json   # JSON-Export
 *   node rag/list-dms.js --no-head                # ohne Filename-Resolution (schneller)
 *
 * Markiert mit ★ welche Dokumente bereits im RAG-Index sind.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const dms = require('./dms-connector');

const args = process.argv.slice(2);
const argFlag = (n) => args.includes('--' + n);
const argVal = (n, def) => {
  const a = args.find((x) => x.startsWith('--' + n + '='));
  return a ? a.split('=')[1] : def;
};

const QUERIES = (argVal('queries', 'manual,brochure,datasheet,GVH,GFH,GHN,GDS')).split(',').map(s => s.trim());
const PAGESIZE = parseInt(argVal('pageSize', '25'), 10);
const NO_HEAD = argFlag('no-head');
const OUTPUT = argVal('output', null);

function fmtBytes(n) {
  if (n == null) return '?';
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return Math.round(n / 1024) + ' KB';
  return (n / 1024 / 1024).toFixed(1) + ' MB';
}

function shortMime(ct) {
  if (!ct) return '?';
  const base = ct.split(';')[0].trim().toLowerCase();
  const map = {
    'application/pdf': 'PDF',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
    'application/msword': 'DOC',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
    'application/vnd.ms-excel': 'XLS',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPTX',
    'application/vnd.ms-powerpoint': 'PPT',
    'application/vnd.ms-outlook': 'MSG',  // .msg E-Mail
    'message/rfc822': 'EML',
    'text/html': 'HTML',
    'text/plain': 'TXT',
    'text/csv': 'CSV',
    'application/zip': 'ZIP',
    'image/png': 'PNG',
    'image/jpeg': 'JPG',
  };
  return map[base] || base.split('/')[1].toUpperCase();
}

(async () => {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  DMS-Inventory — was Sie aktuell auswählen können');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('Stichworte: ' + QUERIES.join(', '));
  console.log('PageSize:   ' + PAGESIZE + ' pro Stichwort');
  console.log('HEAD-Resolution: ' + (NO_HEAD ? 'aus' : 'an'));

  // RAG-Index laden, um schon-indexierte Docs zu markieren
  const indexedDmsIds = new Set();
  const docDbPath = path.join(__dirname, '..', 'uploads', '_documents.json');
  try {
    const docDb = JSON.parse(fs.readFileSync(docDbPath, 'utf-8'));
    docDb.documents.forEach((d) => {
      if (d.dmsMetadata && d.dmsMetadata.dmsId) indexedDmsIds.add(d.dmsMetadata.dmsId);
    });
    console.log('RAG-Index: ' + indexedDmsIds.size + ' Dokumente bereits indexiert');
  } catch (e) { /* file noch nicht da */ }

  // 1. Parallele Volltextsuchen
  console.log('\n[1/3] Sammle Treffer aus ' + QUERIES.length + ' Stichworten parallel ...');
  const allHits = new Map();
  await Promise.all(QUERIES.map(async (q) => {
    try {
      const r = await dms.searchDocuments({ fulltext: q, pageSize: PAGESIZE });
      r.items.forEach((it) => {
        if (it.mainContentUrl && !allHits.has(it.dmsId)) {
          allHits.set(it.dmsId, Object.assign({}, it, { foundVia: q }));
        }
      });
      console.log('   "' + q.padEnd(12) + '" → ' + r.items.length + ' Treffer');
    } catch (err) {
      console.log('   "' + q + '" Fehler: ' + err.message);
    }
  }));
  const hits = Array.from(allHits.values());
  console.log('\n→ ' + hits.length + ' eindeutige Dokumente mit Content gefunden');

  // 2. Optional Filename/Content-Type/Größe via Range-GET ergänzen
  // Range bytes=0-0 lädt nur 1 Byte, Server schickt aber den vollen
  // Content-Disposition mit Filename — viel günstiger als voller Download.
  if (!NO_HEAD) {
    console.log('\n[2/3] Lade Filename & MIME-Typ via Range-GET (parallel, ~200ms pro Aufruf) ...');
    const apiKey = (process.env.DMS_API_KEY || '').trim();
    let done = 0;
    await Promise.all(hits.map(async (hit) => {
      try {
        const url = hit.mainContentUrl.startsWith('http')
          ? hit.mainContentUrl
          : (dms.config.baseUrl + hit.mainContentUrl);
        const res = await fetch(url, {
          method: 'GET',
          headers: { Authorization: 'Bearer ' + apiKey, Range: 'bytes=0-0' },
          redirect: 'manual',
        });
        try { await res.body.cancel(); } catch (_) {}
        hit.contentType = res.headers.get('content-type') || null;
        // Content-Range: bytes 0-0/4699019 → echte Größe steht hinter dem Slash
        const cr = res.headers.get('content-range') || '';
        const totMatch = cr.match(/\/(\d+)$/);
        if (totMatch) {
          hit.sizeBytes = parseInt(totMatch[1], 10);
        } else {
          const cl = res.headers.get('content-length');
          hit.sizeBytes = cl ? parseInt(cl, 10) : null;
        }
        // Filename aus Content-Disposition
        const cd = res.headers.get('content-disposition') || '';
        const utf8m = cd.match(/filename\*=utf-8''([^;]+)/i);
        const plain = cd.match(/filename="?([^";]+)"?/i);
        if (utf8m) hit.filename = decodeURIComponent(utf8m[1].trim());
        else if (plain) hit.filename = plain[1].trim();
      } catch (e) { /* ignore */ }
      done++;
    }));
    console.log('   ✅ ' + done + ' Range-GETs durchgelaufen');
  }

  // 3. Sortieren: Version absteigend, dann dmsId
  hits.sort((a, b) => {
    const va = parseInt((a.versionId || '0').split('_')[0], 10);
    const vb = parseInt((b.versionId || '0').split('_')[0], 10);
    if (va !== vb) return vb - va;
    return (a.dmsId || '').localeCompare(b.dmsId || '');
  });

  // 4. Statistik nach Doc-Typ
  console.log('\n[3/3] Statistik nach Doc-Typ:\n');
  const byType = {};
  hits.forEach((h) => {
    const t = shortMime(h.contentType);
    if (!byType[t]) byType[t] = { count: 0, bytes: 0 };
    byType[t].count++;
    if (h.sizeBytes) byType[t].bytes += h.sizeBytes;
  });
  Object.keys(byType).sort((a, b) => byType[b].count - byType[a].count).forEach((t) => {
    const bar = '█'.repeat(Math.min(40, Math.round(byType[t].count / hits.length * 40)));
    console.log('   ' + t.padEnd(8) + ' ' + String(byType[t].count).padStart(4) + ' ' +
      bar.padEnd(40) + ' ' + fmtBytes(byType[t].bytes));
  });

  // Klassifikation des Doc-Typs anhand des Filename-Patterns
  // (Güntner-DMS speichert sehr viele Geschäftsdokumente — wir wollen für RAG
  //  nur die technischen Manuals)
  function classifyDocument(filename) {
    if (!filename) return { kind: 'unknown', icon: ' ' };
    const f = filename.toUpperCase();
    // Technische Manuals (höchste Priorität)
    if (/IOM[_\s]/i.test(filename))                 return { kind: 'manual',     icon: '📘' };
    if (/[_\s]MANUAL[_\s.\-]/i.test(filename))      return { kind: 'manual',     icon: '📘' };
    // Datenblätter — auch mit Underscore: "Data_sheet_..."
    if (/DATA[_\s]?SHEET|DATENBLATT/i.test(filename)) return { kind: 'datasheet', icon: '📊' };
    if (/BROCHURE|BROSCH/i.test(filename))          return { kind: 'brochure',   icon: '📄' };
    // Produktspezifische technische Dokumente (Konfigurationen, Drawings)
    if (/^(GACC|GADC|GASC|GFH|GVH|GHN|GMH|GWH|GDS|GHF|GFV|GFD|GHM|GVH|GACV|GAMC|GFDV|GCDV|GGDV)[\s_\-]/i.test(filename))
                                                    return { kind: 'product-doc', icon: '⚙️' };
    if (/^S\-G\w+/i.test(filename))                 return { kind: 'service',    icon: '🛠️' }; // Servicedokument
    if (/^JV\d/i.test(filename))                    return { kind: 'job-pkg',    icon: '📋' }; // Job-Paket / Drawing-Set
    // Geschäftsdokumente
    if (/^OC_|^OP\d|^OP26/.test(f))                 return { kind: 'order',      icon: '🧾' };
    if (/^FA\d|^FV\d/.test(f))                      return { kind: 'invoice',    icon: '💶' };
    if (/^GV\d/.test(f))                            return { kind: 'delivery',   icon: '📦' };
    return { kind: 'other', icon: ' ' };
  }
  // Pro Treffer Klassifikation anhängen
  hits.forEach(h => h.classification = classifyDocument(h.filename));

  // Klassifikations-Statistik
  const byKind = {};
  hits.forEach(h => {
    const k = h.classification.kind;
    byKind[k] = (byKind[k] || 0) + 1;
  });
  console.log('\n   Klassifikation nach Filename-Pattern:');
  const ICON_MAP = {
    'manual': '📘', 'datasheet': '📊', 'brochure': '📄',
    'product-doc': '⚙️', 'service': '🛠️', 'job-pkg': '📋',
    'order': '🧾', 'invoice': '💶', 'delivery': '📦',
    'other': '  ', 'unknown': '  '
  };
  Object.entries(byKind).sort((a, b) => b[1] - a[1]).forEach(([kind, count]) => {
    console.log('   ' + (ICON_MAP[kind] || '  ') + ' ' + kind.padEnd(12) + String(count).padStart(4));
  });

  // 5. Tabelle ausgeben — mit echtem Filename und Klassifikations-Icon
  console.log('\n  #    dmsId         Ver    Größe      Typ    Filename                                                  RAG');
  console.log('  ───  ────────────  ─────  ─────────  ─────  ──────────────────────────────────────────────────────── ───');
  hits.forEach((h, i) => {
    const num = String(i + 1).padStart(3, ' ');
    const ver = ('v' + (h.versionId || '?')).padEnd(5);
    const size = fmtBytes(h.sizeBytes).padStart(9);
    const type = shortMime(h.contentType).padEnd(5);
    let label;
    if (h.filename) {
      label = h.filename.length > 55 ? h.filename.slice(0, 52) + '…' : h.filename;
    } else {
      label = '(' + h.foundVia + ')';
    }
    label = label.padEnd(55);
    const rag = indexedDmsIds.has(h.dmsId) ? '★' : ' ';
    console.log('  ' + h.classification.icon + ' ' + num + '  ' + h.dmsId.padEnd(13) + ' ' + ver + '  ' + size + '  ' + type + '  ' + label + ' ' + rag);
  });

  // 6. JSON-Export
  if (OUTPUT) {
    const outPath = path.isAbsolute(OUTPUT) ? OUTPUT : path.join(__dirname, OUTPUT);
    fs.writeFileSync(outPath, JSON.stringify({
      generatedAt: new Date().toISOString(),
      queries: QUERIES,
      total: hits.length,
      stats: byType,
      items: hits.map((h) => ({
        dmsId: h.dmsId,
        version: h.versionId,
        filename: h.filename || null,
        classification: h.classification ? h.classification.kind : null,
        contentType: h.contentType,
        sizeBytes: h.sizeBytes,
        foundVia: h.foundVia,
        mainContentUrl: h.mainContentUrl,
        previewUrl: h.previewUrl,
        inRagIndex: indexedDmsIds.has(h.dmsId),
      })),
    }, null, 2));
    console.log('\n📄 JSON-Export: ' + path.relative(process.cwd(), outPath));
  }

  console.log('\n★ = bereits im RAG-Index');
  console.log('\nHinweis: Echter Filename wird erst beim GET-Download via /api/dms/content/:id sichtbar.');
  console.log('Browser-UI: http://localhost:3001/admin-documents.html → "Fetch DMS Information"');
})().catch((err) => {
  console.error('💥 Inventory abgebrochen:', err.message);
  process.exit(1);
});
