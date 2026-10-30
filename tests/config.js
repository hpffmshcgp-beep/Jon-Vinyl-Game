// Shared test settings. Serve the repo root first:  python3 -m http.server 8765
const path = require('path'), fs = require('fs');
const ROOT = path.resolve(__dirname, '..');
const OUT = process.env.TEST_OUT || path.join(ROOT, 'test-output');
fs.mkdirSync(OUT, { recursive: true });
module.exports = {
  URL: process.env.GAME_URL || 'http://localhost:8765/dist/web/index.html',
  FILE_URL: 'file://' + path.join(ROOT, 'dist', 'Star-Crossed.html'),
  OUT: OUT + '/',
  DESK: { viewport: { width: 1280, height: 800 } },
  PHONE: { viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 },
};
