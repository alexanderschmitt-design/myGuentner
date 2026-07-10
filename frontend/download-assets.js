/**
 * Download Figma assets to local /images folder.
 * Run: node download-assets.js
 * Note: Figma CDN URLs expire after 7 days.
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const IMAGES_DIR = path.join(__dirname, 'images');
if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });

const assets = [
  ['c3581ed0-0933-469b-8bda-84968e3f9560', 'logo-myguentner.png'],
  ['7ede6192-6f11-4e70-9a59-5440af9b4900', 'icon-hamburger.png'],
  ['c6538bdb-b519-43d0-b3f8-1def295e0ebc', 'icon-chevron-down.png'],
  ['f52d00d3-d448-4d81-8e93-4bce5efb68e7', 'card-evaporator-dx.jpg'],
  ['2e0c9eed-03ed-4b79-b88e-3a108af33fb3', 'card-evaporator-pump.jpg'],
  ['1a31d7af-8091-4798-87ee-97ee11110f88', 'card-air-cooler.jpg'],
  ['593982ff-7505-4406-95e5-3e09f3746bb5', 'card-dry-cooler.jpg'],
  ['066aad21-fa42-4198-ac44-697280863e8d', 'card-condenser.jpg'],
  ['3076d463-df1a-4808-89c4-353613cf6814', 'card-gas-cooler.jpg'],
  ['7c879855-4ffc-4c55-bf86-c1ad53409122', 'icon-dx.png'],
  ['91d26f90-d999-4b41-867d-f3cfdd62f5c2', 'icon-fluid.png'],
  ['08148e24-bb92-481d-a0c6-8b5672914d68', 'icon-air.png'],
  ['d08f7fee-800d-4887-8f1a-7781ebd393ab', 'icon-fluid-2.png'],
  ['31d822a6-d573-4e89-8cae-740d237df727', 'icon-condensation.png'],
  ['e0fb55c9-071c-4921-9af5-959f924805ad', 'icon-co2.png'],
  ['d2a53cb6-0a5e-4f3d-a3b9-ba32a69b4203', 'icon-faq.png'],
  ['8235e3f2-6185-44d7-9cc4-c901fc725ced', 'icon-feedback.png'],
  ['693a4d68-02c4-4c21-9ee1-f1e0e5f85ef8', 'logo-guentner-footer.png'],
  ['ed1bac4b-d116-4078-b7f6-9fbd51b9a782', 'icon-download.png'],
  ['bb402dc8-9f5d-4c77-9c69-06211a76e10d', 'step-divider.png'],
];

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        download(res.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(dest); });
    }).on('error', (err) => { fs.unlink(dest, () => {}); reject(err); });
  });
}

async function main() {
  console.log(`Downloading ${assets.length} assets to ${IMAGES_DIR}...`);
  const results = await Promise.allSettled(
    assets.map(([id, name]) =>
      download(`https://www.figma.com/api/mcp/asset/${id}`, path.join(IMAGES_DIR, name))
        .then(p => { console.log(`  OK: ${name}`); return p; })
        .catch(e => { console.error(`  FAIL: ${name} - ${e.message}`); throw e; })
    )
  );
  const ok = results.filter(r => r.status === 'fulfilled').length;
  console.log(`\nDone: ${ok}/${assets.length} downloaded.`);
}

main();
