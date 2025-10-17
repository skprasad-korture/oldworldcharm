import { chromium } from 'playwright';

async function testCSSLoading() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Listen for network requests
  const failedRequests = [];
  page.on('response', response => {
    if (!response.ok()) {
      failedRequests.push({
        url: response.url(),
        status: response.status(),
        statusText: response.statusText()
      });
    }
  });
  
  try {
    console.log('Navigating to http://localhost:5173...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    
    // Check if CSS is loaded
    const stylesheets = await page.$$eval('link[rel="stylesheet"]', links => 
      links.map(link => ({ href: link.href, loaded: link.sheet !== null }))
    );
    
    console.log('Stylesheets found:', stylesheets);
    console.log('Failed requests:', failedRequests);
    
    // Take a screenshot
    await page.screenshot({ path: 'editor-screenshot.png' });
    console.log('Screenshot saved as editor-screenshot.png');
    
    // Check if the page loaded properly
    const title = await page.title();
    console.log('Page title:', title);
    
    // Check for any console errors
    const logs = [];
    page.on('console', msg => logs.push(msg.text()));
    
    await page.waitForTimeout(2000);
    console.log('Console logs:', logs);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  await browser.close();
}

testCSSLoading();