const fs = require('fs');
const { JSDOM } = require('jsdom');
const path = require('path');

(async () => {
  const root = process.cwd();
  const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const dom = new JSDOM(indexHtml, { runScripts: 'dangerously', resources: 'usable', url: 'http://localhost:8000/?dev' });
  const { window } = dom;
  // Mock window.crypto.subtle digest for tests if not present
  if (!window.crypto || !window.crypto.subtle) {
    window.crypto = {
      subtle: {
        digest: async (alg, data) => {
          const buf = new Uint8Array(32);
          return buf.buffer;
        }
      }
    };
  }
  // Load scripts manually
  const scripts = [
    'js/data.js', 'js/logic.js', 'js/auth.js', 'js/charts.js', 'js/ui.js', 'js/tests.js'
  ];
  for (const s of scripts) {
    const code = fs.readFileSync(path.join(root, s), 'utf8');
    try {
      const scriptEl = dom.window.document.createElement('script');
      scriptEl.textContent = code;
      dom.window.document.head.appendChild(scriptEl);
    } catch (err) {
      console.error('Error injecting', s, err);
    }
  }
  // Wait for scripts to initialize
  await new Promise((r) => setTimeout(r, 200));

  try {
    const res = dom.window.EcoTests.runAllTests();
    console.log('runAllTests result:', res);
  } catch (err) {
    console.error('Tests execution error:', err);
  }
})();
