#!/usr/bin/env node
/**
 * Download product images from Figma and save locally
 * Run: node download-images.js
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const IMAGES_DIR = path.join(__dirname, 'frontend', 'images');

const downloads = [
  // Product card photos
  { url: 'https://www.figma.com/api/mcp/asset/0da1924e-0fe1-43b9-aaa6-8859b7f3348e', file: 'product-evaporator-dx.jpg' },
  { url: 'https://www.figma.com/api/mcp/asset/befb7e7f-9221-4945-a63d-0098e83a65b0', file: 'product-evaporator-pump.jpg' },
  { url: 'https://www.figma.com/api/mcp/asset/18bb39c1-ce96-4a59-8e81-4ef2673e51e1', file: 'product-aircooler.jpg' },
  { url: 'https://www.figma.com/api/mcp/asset/d73f1476-f777-4a2b-8168-99cb568c76cd', file: 'product-drycooler.jpg' },
  { url: 'https://www.figma.com/api/mcp/asset/7f394330-60fc-4294-839e-e1439fe76ba6', file: 'product-condenser.jpg' },
  { url: 'https://www.figma.com/api/mcp/asset/11fcd723-f3d4-48fa-a582-6e077a243190', file: 'product-gascooler.jpg' },
  // Category icons (from Figma mask images)
  { url: 'https://www.figma.com/api/mcp/asset/679b9fce-0fef-4fa6-b687-47632aa7a312', file: 'icon-product-dx.png' },
  { url: 'https://www.figma.com/api/mcp/asset/0addd164-04b4-4205-b45d-fc5a9c357f56', file: 'icon-product-fluid.png' },
  { url: 'https://www.figma.com/api/mcp/asset/73e18d26-ab08-4b0d-bc7f-fad5dd1afbf7', file: 'icon-product-air.png' },
  { url: 'https://www.figma.com/api/mcp/asset/c32e5b11-8663-4d3f-9e28-ba67364d2841', file: 'icon-product-condenser.png' },
  { url: 'https://www.figma.com/api/mcp/asset/18d51485-f619-47f1-9291-2ec3d953c38f', file: 'icon-product-co2.png' },
];

function download(url, filepath) {
  return new Promise((resolve, reject) => {
    const follow = (u) => {
      https.get(u, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          follow(res.headers.location);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          return;
        }
        const ws = fs.createWriteStream(filepath);
        res.pipe(ws);
        ws.on('finish', () => { ws.close(); resolve(); });
        ws.on('error', reject);
      }).on('error', reject);
    };
    follow(url);
  });
}

async function main() {
  if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });

  for (const img of downloads) {
    const dest = path.join(IMAGES_DIR, img.file);
    if (fs.existsSync(dest)) {
      console.log(`  SKIP ${img.file} (already exists)`);
      continue;
    }
    try {
      await download(img.url, dest);
      console.log(`  OK   ${img.file}`);
    } catch(e) {
      console.log(`  FAIL ${img.file}: ${e.message}`);
    }
  }
  console.log('Done.');
}

main();
