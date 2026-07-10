#!/usr/bin/env node
/**
 * Download category icons from Figma design and save locally
 * Run: node download-icons.js
 *
 * These are the exact icon assets from the UBQ Figma design (node 2317:87861)
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const IMAGES_DIR = path.join(__dirname, 'frontend', 'images');

const downloads = [
  // product/dx icon (Evaporator DX)
  { url: 'https://www.figma.com/api/mcp/asset/679b9fce-0fef-4fa6-b687-47632aa7a312', file: 'cat-icon-dx.png' },
  // product/fluid icon (Evaporator Pump, Dry cooler)
  { url: 'https://www.figma.com/api/mcp/asset/0addd164-04b4-4205-b45d-fc5a9c357f56', file: 'cat-icon-fluid.png' },
  // product/air icon (Air cooler)
  { url: 'https://www.figma.com/api/mcp/asset/73e18d26-ab08-4b0d-bc7f-fad5dd1afbf7', file: 'cat-icon-air.png' },
  // product/condensation icon (Condenser)
  { url: 'https://www.figma.com/api/mcp/asset/c32e5b11-8663-4d3f-9e28-ba67364d2841', file: 'cat-icon-condensation.png' },
  // product/co2 icon (Gas cooler)
  { url: 'https://www.figma.com/api/mcp/asset/663d857b-c947-4d54-8738-7330e9d908d7', file: 'cat-icon-co2.png' },
  // Mask/shape images (icon outlines)
  { url: 'https://www.figma.com/api/mcp/asset/2c41d1a9-c736-4a5d-8efe-91c1934da29c', file: 'cat-icon-mask-default.png' },
  { url: 'https://www.figma.com/api/mcp/asset/1c0c8d4f-fbfe-4a55-b177-cd933337f94e', file: 'cat-icon-mask-air.png' },
  { url: 'https://www.figma.com/api/mcp/asset/18d51485-f619-47f1-9291-2ec3d953c38f', file: 'cat-icon-mask-co2.png' },
];

function download(url, filepath) {
  return new Promise((resolve, reject) => {
    const follow = (u) => {
      const mod = u.startsWith('https') ? https : require('http');
      mod.get(u, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          follow(res.headers.location);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error('HTTP ' + res.statusCode));
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
    try {
      await download(img.url, dest);
      const size = fs.statSync(dest).size;
      console.log('  OK   ' + img.file + ' (' + Math.round(size/1024) + ' KB)');
    } catch(e) {
      console.log('  FAIL ' + img.file + ': ' + e.message);
    }
  }
  console.log('Done. Icons saved to frontend/images/');
}

main();
