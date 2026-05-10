const { chromium } = require('playwright');
const { spawn } = require('child_process');

async function test() {
  const server = spawn('node', ['server.js'], { cwd: __dirname });
  await new Promise(r => setTimeout(r, 2000));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push('PAGE ERROR: ' + err.message));

  try {
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(500);

    // Click Local Multiplayer
    console.log('Clicking Local Multiplayer...');
    await page.locator('#local-mode-btn').click();
    await page.waitForTimeout(500);

    // Enter player name
    await page.locator('#player-inputs input').first().fill('Test');

    // Start game
    console.log('Starting game...');
    await page.locator('#start-btn').click();
    await page.waitForTimeout(1000);

    // Find Ones cell
    const onesCell = page.locator('td[data-cat="ones"][data-player="0"]');
    console.log('Ones cell exists:', await onesCell.count() > 0);
    console.log('Ones cell visible:', await onesCell.isVisible());

    // Click Ones cell
    console.log('Clicking Ones cell...');
    await onesCell.click();
    await page.waitForTimeout(500);

    // Check if modal appeared
    const modal = page.locator('#modal-overlay');
    const modalHidden = await modal.evaluate(el => el.classList.contains('hidden'));
    console.log('Modal hidden:', modalHidden);
    console.log('Modal visible:', await modal.isVisible());

    const modalTitle = page.locator('#modal-title');
    const titleText = await modalTitle.textContent();
    console.log('Modal title:', titleText);

    const modalOpts = page.locator('.modal-opt');
    console.log('Modal option buttons:', await modalOpts.count());

    const firstOpt = page.locator('.modal-opt').first();
    if (await firstOpt.count() > 0) {
      console.log('First option text:', await firstOpt.textContent());
    }

    console.log('\n--- Errors ---');
    if (errors.length > 0) {
      errors.forEach(e => console.log(e));
    } else {
      console.log('No errors');
    }

  } catch (err) {
    console.error('Test failed:', err.message);
  } finally {
    await browser.close();
    server.kill();
  }
}

test();
