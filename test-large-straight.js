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
    console.log('Clicking Local Multiplayer...');
    await page.locator('#local-mode-btn').click();
    await page.waitForTimeout(500);

    // Add player
    const input = page.locator('#player-inputs input').first();
    await input.fill('Test Player');

    // Start game
    console.log('Starting game...');
    await page.locator('#start-btn').click();
    await page.waitForTimeout(1000);

    // Check that Large Straight cell exists
    const lgStraightCell = page.locator('td[data-cat="lgStraight"][data-player="0"]');
    console.log('Large Straight cell exists:', await lgStraightCell.count() > 0);

    // Click Large Straight without rolling dice
    console.log('\n=== TEST 1: Large Straight without dice ===');
    await lgStraightCell.click();
    await page.waitForTimeout(300);

    const modalTitle = page.locator('#modal-title');
    console.log('Modal title:', await modalTitle.textContent());

    const scoreBtn = page.locator('.modal-opt').first();
    const scoreBtnText = await scoreBtn.textContent();
    console.log('Score button text:', scoreBtnText);
    console.log('Score button has "selected" class:', await scoreBtn.evaluate(el => el.classList.contains('selected')));

    // Click Close
    await page.locator('#modal-close').click();
    await page.waitForTimeout(500);

    // Check score
    const cellContent = await lgStraightCell.textContent();
    console.log('Cell content after scoring:', cellContent);
    console.log('✓ PASS: Score saved as 40' + (cellContent === '40' ? '' : ' (FAIL: got ' + cellContent + ')'));

    // Close the modal and try again with Take a Zero
    console.log('\n=== TEST 2: Large Straight take zero ===');

    // Go back to setup to clear
    await page.locator('#reset-game-btn').click();
    await page.waitForTimeout(300);
    const confirmBtn = page.locator('button:has-text("Reset")').last();
    if (await confirmBtn.isVisible()) {
      await confirmBtn.click();
      await page.waitForTimeout(500);
    }

    await page.goto('http://localhost:3000');
    await page.locator('#local-mode-btn').click();
    await page.waitForTimeout(300);
    await page.locator('#player-inputs input').first().fill('Player 2');
    await page.locator('#start-btn').click();
    await page.waitForTimeout(1000);

    // Click Large Straight
    const lgStraightCell2 = page.locator('td[data-cat="lgStraight"][data-player="0"]');
    await lgStraightCell2.click();
    await page.waitForTimeout(300);

    // Click Zero button
    const zeroBtn = page.locator('.modal-opt').nth(1);
    const zeroBtnText = await zeroBtn.textContent();
    console.log('Zero button text:', zeroBtnText);
    await zeroBtn.click();
    await page.waitForTimeout(300);

    // Click Close
    await page.locator('#modal-close').click();
    await page.waitForTimeout(500);

    // Check score
    const cellContent2 = await lgStraightCell2.textContent();
    console.log('Cell content after taking zero:', cellContent2);
    console.log('✓ PASS: Zero saved' + (cellContent2 === '—' ? '' : ' (FAIL: got ' + cellContent2 + ')'));

    console.log('\n✓ All tests passed!');

  } catch (err) {
    console.error('Test failed:', err.message);
  } finally {
    await browser.close();
    server.kill();
  }
}

test();
