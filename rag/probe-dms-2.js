/**
 * Probe Runde 2 — Fokussiert auf Prod + Bearer
 * Zeigt den vollen JSON-Body von /source, /srm/, repository-root
 * und versucht über die HAL-Links das echte Object-URL-Pattern zu finden.
 */
require('dotenv').config();

const BASE = process.env.DMS_BASE_URL_PROD || 'https://dms-prod.guentner.com';
const REPO = 'cffcc398-5466-586f-921f-4655e26f70e0';
const KEY = (process.env.DMS_API_KEY || '').trim();
const SAMPLE = 'P002925864';

const headers = {
  Authorization: `Bearer ${KEY}`,
  Accept: 'application/hal+json, application/json, */*',
  'User-Agent': 'myGPC-DMS-Probe/0.2',
};

async function get(url, opts = {}) {
  const res = await fetch(url, { method: 'GET', headers, redirect: 'manual', ...opts });
  const ct = res.headers.get('content-type') || '';
  let body = null;
  if (res.status < 400 && ct.includes('json')) {
    body = await res.json();
  } else if (ct.includes('json') || ct.startsWith('text/')) {
    body = await res.text();
  }
  return { status: res.status, contentType: ct, body, location: res.headers.get('location') };
}

function pretty(obj, max = 4000) {
  const s = JSON.stringify(obj, null, 2);
  return s.length > max ? s.slice(0, max) + '\n…[truncated, ' + (s.length - max) + ' more chars]' : s;
}

(async () => {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Probe Runde 2 — Strukturen lesen, Object-URL finden');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // ────────────────────────────────────────────────────────────────────
  // 1. Repository-Root — listet Service-Links (search, source, …)
  // ────────────────────────────────────────────────────────────────────
  console.log('━━━ 1. Repository-Root: GET /dms/r/{repo} ━━━');
  const r1 = await get(`${BASE}/dms/r/${REPO}`);
  console.log(`HTTP ${r1.status}  ${r1.contentType}`);
  console.log(pretty(r1.body, 2500));

  // ────────────────────────────────────────────────────────────────────
  // 2. Source-Liste — listet alle Sources (Object-Definitionen)
  //    Wichtig: Hier finden wir den Source-Identifier, den wir für /o2/{src}/{key}/{val} brauchen
  // ────────────────────────────────────────────────────────────────────
  console.log('\n━━━ 2. Sources: GET /dms/r/{repo}/source ━━━');
  const r2 = await get(`${BASE}/dms/r/${REPO}/source`);
  console.log(`HTTP ${r2.status}  ${r2.contentType}`);

  if (r2.body && typeof r2.body === 'object') {
    // Top-Level-Keys
    console.log('Top-Level-Keys:', Object.keys(r2.body).join(', '));

    // Versuche, eine Source-Liste zu finden
    const sources =
      r2.body._embedded?.sources ||
      r2.body._embedded?.['dmsobjectdef'] ||
      r2.body.sources ||
      [];

    if (Array.isArray(sources) && sources.length > 0) {
      console.log(`\n→ ${sources.length} Source(s) gefunden:`);
      for (const s of sources.slice(0, 20)) {
        const id = s.id || s.identifier || s.name;
        const display = s.displayName || s.title || s.label || '';
        const props = s._embedded?.objectdef?.properties || s.properties || s._links;
        console.log(`   • ${id}  "${display}"`);
        if (props && typeof props === 'object') {
          const propKeys = Array.isArray(props) ? props.map(p => p.id || p.name) : Object.keys(props);
          console.log(`     properties: ${propKeys.slice(0, 12).join(', ')}${propKeys.length > 12 ? '…' : ''}`);
        }
      }
    } else {
      console.log('Body-Auszug (erste 3000 Zeichen):');
      console.log(pretty(r2.body, 3000));
    }
  }

  // ────────────────────────────────────────────────────────────────────
  // 3. Search-Service-Definition — listet Such-Form / verfügbare Properties
  // ────────────────────────────────────────────────────────────────────
  console.log('\n━━━ 3. Search-Definition: GET /dms/r/{repo}/srm/ ━━━');
  const r3 = await get(`${BASE}/dms/r/${REPO}/srm/`);
  console.log(`HTTP ${r3.status}  ${r3.contentType}`);
  if (r3.body && typeof r3.body === 'object') {
    console.log('Top-Level-Keys:', Object.keys(r3.body).join(', '));
    console.log(pretty(r3.body, 3000));
  }

  // ────────────────────────────────────────────────────────────────────
  // 4. Echter Such-Aufruf — versucht den ersten Treffer zu kriegen
  // ────────────────────────────────────────────────────────────────────
  console.log('\n━━━ 4. Erster echter Such-Aufruf: GET /srm/?objectdefinitionids=… ━━━');
  // Wir probieren mehrere Query-Varianten, weil das Format pro d.velop-Installation variiert
  const searchTries = [
    `${BASE}/dms/r/${REPO}/srm/?pagesize=3`,
    `${BASE}/dms/r/${REPO}/srm/search?pagesize=3`,
    `${BASE}/dms/r/${REPO}/srm/?fulltext=manual&pagesize=3`,
  ];
  for (const url of searchTries) {
    const r = await get(url);
    console.log(`HTTP ${r.status}  ${r.contentType}  ← ${url}`);
    if (r.status === 200 && r.body && typeof r.body === 'object') {
      const items = r.body._embedded?.items || r.body._embedded?.dmsobjects || r.body.items || [];
      console.log(`   → ${Array.isArray(items) ? items.length : '?'} Treffer im Body`);
      if (Array.isArray(items) && items[0]) {
        console.log('   Erster Treffer (gekürzt):');
        console.log('   ' + pretty(items[0], 1500).split('\n').join('\n   '));
      } else {
        console.log('   ' + pretty(r.body, 1200).split('\n').join('\n   '));
      }
      break; // genug Info, abbrechen
    } else if (r.body) {
      console.log(`   Fehler-Body: ${typeof r.body === 'string' ? r.body.slice(0, 200) : JSON.stringify(r.body).slice(0, 200)}`);
    }
  }

  // ────────────────────────────────────────────────────────────────────
  // 5. Versuch direkt nach SAMPLE-dmsId zu suchen
  // ────────────────────────────────────────────────────────────────────
  console.log(`\n━━━ 5. Nach Sample-dmsId "${SAMPLE}" suchen ━━━`);
  const dmsIdSearches = [
    `${BASE}/dms/r/${REPO}/srm/?fulltext=${SAMPLE}`,
    `${BASE}/dms/r/${REPO}/srm/?properties[dmsId]=${SAMPLE}`,
    `${BASE}/dms/r/${REPO}/srm/?dmsId=${SAMPLE}`,
  ];
  for (const url of dmsIdSearches) {
    const r = await get(url);
    console.log(`HTTP ${r.status}  ${r.contentType}  ← ${url.replace(BASE, '…')}`);
    if (r.status === 200 && r.body) {
      const items = r.body._embedded?.items || r.body._embedded?.dmsobjects || r.body.items || [];
      const count = Array.isArray(items) ? items.length : 0;
      console.log(`   → ${count} Treffer`);
      if (count > 0) {
        console.log('   Erster Treffer:');
        console.log('   ' + pretty(items[0], 1500).split('\n').join('\n   '));
        // Wenn der Treffer einen _links.mainblob oder ähnliches hat, ist das das echte Object-URL!
        const links = items[0]._links || {};
        if (Object.keys(links).length > 0) {
          console.log('\n   🔑 _links im Treffer (← das sind die wahren URL-Patterns!):');
          for (const [rel, link] of Object.entries(links)) {
            console.log(`      ${rel.padEnd(20)} → ${link.href || link}`);
          }
        }
        break;
      }
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════\n');
})().catch(err => {
  console.error('Probe abgebrochen:', err);
  process.exit(1);
});
