const { chromium } = require('playwright');
const { spawn } = require('child_process');

async function test() {
  const server = spawn('node', ['server.js'], { cwd: __dirname });
  await new Promise(r => setTimeout(r, 2000));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const consoleLogs = [];
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
    else consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', err => consoleErrors.push('PAGE ERROR: ' + err.message));

  try {
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(1500);

    console.log('\n--- Console Logs ---');
    consoleLogs.forEach(l => console.log(l));

    console.log('\n--- Console Errors ---');
    consoleErrors.forEach(e => console.log('ERROR:', e));

    const setupScreen = page.locator('#setup');
    const setupVisible = await setupScreen.isVisible();
    console.log('\nSetup screen visible:', setupVisible);

    const modeSelect = page.locator('#mode-select');
    const modeVisible = await modeSelect.isVisible();
    console.log('Mode select visible:', modeVisible);

    const setupDisplay = await setupScreen.evaluate(el => window.getComputedStyle(el).display);
    console.log('Setup screen display style:', setupDisplay);

    const setupClasses = await setupScreen.evaluate(el => el.className);
    console.log('Setup screen classes:', setupClasses);

    await page.screenshot({ path: 'debug-screen.png' });
    console.log('\nScreenshot saved to debug-screen.png');

  } catch (err) {
    console.error('Test failed:', err.message);
  } finally {
    await browser.close();
    server.kill();
  }
}

test();
