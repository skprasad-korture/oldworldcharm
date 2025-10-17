import { chromium } from 'playwright';

async function debugPage() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Listen for console messages
  page.on('console', msg => {
    console.log(`CONSOLE ${msg.type()}: ${msg.text()}`);
  });
  
  // Listen for page errors
  page.on('pageerror', error => {
    console.log(`PAGE ERROR: ${error.message}`);
  });
  
  // Listen for network failures
  page.on('response', response => {
    if (!response.ok()) {
      console.log(`NETWORK ERROR: ${response.url()} - ${response.status()}`);
    }
  });
  
  try {
    console.log('Navigating to http://localhost:5173...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    
    // Wait a bit and take screenshot
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'debug-screenshot.png' });
    
    console.log('Page loaded successfully, screenshot saved');
    
  } catch (error) {
    console.error('Error loading page:', error.message);
  }
  
  // Keep browser open for manual inspection
  console.log('Browser will stay open for 30 seconds for manual inspection...');
  await page.waitForTimeout(30000);
  
  await browser.close();
}

debugPage();