import { chromium } from 'playwright';

async function simpleTest() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Listen for all events
  page.on('console', msg => console.log(`CONSOLE: ${msg.text()}`));
  page.on('pageerror', error => console.log(`ERROR: ${error.message}`));
  page.on('response', response => {
    if (!response.ok()) {
      console.log(`FAILED REQUEST: ${response.url()} - ${response.status()}`);
    } else {
      console.log(`SUCCESS: ${response.url()} - ${response.status()}`);
    }
  });
  
  try {
    console.log('Loading page...');
    await page.goto('http://localhost:5180', { timeout: 10000 });
    
    console.log('Page loaded, checking content...');
    const title = await page.title();
    console.log('Title:', title);
    
    const bodyText = await page.textContent('body');
    console.log('Body text (first 200 chars):', bodyText?.substring(0, 200));
    
    await page.screenshot({ path: 'test-screenshot.png' });
    console.log('Screenshot saved');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  await page.waitForTimeout(5000);
  await browser.close();
}

simpleTest();