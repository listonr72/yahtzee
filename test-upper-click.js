const { chromium } = require('playwright');
const { spawn } = require('child_process');

async function test() {
  const server = spawn('node', ['server.js'], { cwd: __dirname });
  await new Promise(r => setTimeout(r, 2000));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto('http://localhost:3000');

    // Click Local Multiplayer
    await page.locator('#local-mode-btn').click();
    await page.waitForTimeout(500);

    // Enter player and start
    await page.locator('#player-inputs input').first().fill('Test');
    await page.locator('#start-btn').click();
    await page.waitForTimeout(1000);

    // Click Ones cell
    const onesCell = page.locator('td[data-cat="ones"][data-player="0"]');
    console.log('Initial cell content:', await onesCell.textContent());

    await onesCell.click();
    await page.waitForTimeout(300);

    // Click button for "3 Ones" (should be button index 3, value=3)
    const button3 = page.locator('.modal-opt').nth(3);
    console.log('Button 3 text:', await button3.textContent());

    await button3.click();
    await page.waitForTimeout(300);

    // Click Close to save
    const closeBtn = page.locator('#modal-close');
    console.log('Close button visible:', await closeBtn.isVisible());

    await closeBtn.click();
    await page.waitForTimeout(500);

    // Check if score was saved
    const finalContent = await onesCell.textContent();
    console.log('Final cell content:', finalContent);
    console.log('✓ PASS: Ones score saved' + (finalContent === '3' ? '' : ' (FAIL: got ' + finalContent + ')'));

  } catch (err) {
    console.error('Test failed:', err.message);
  } finally {
    await browser.close();
    server.kill();
  }
}

test();
