// logs/console.mjs <seconds>: load film.html, render one frame, print console errors (shader compile problems)
const { chromium } = require('playwright');
(async () => {
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--allow-file-access-from-files'] });
const p = await b.newPage(); const out = [];
p.on('console', (m) => { if (m.type() !== 'log') out.push(m.type() + ': ' + m.text().slice(0, 900)); }); p.on('pageerror', (e) => out.push('pageerror: ' + String(e).slice(0, 600)));
await p.goto('file://' + process.cwd() + '/film.html?capture=1&w=480&h=270'); await p.evaluate(() => window.READY);
for (const s of process.argv.slice(2)) await p.evaluate((f) => window.renderFrame(f), Math.round(+s * 24));
console.log(out.slice(0, 8).join('\n') || 'no console errors'); await b.close();
})();
