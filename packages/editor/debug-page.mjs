import { chromium } from 'playwright';

async function debugPage() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Listen for all console messages
  page.on('console', msg => {
    console.log(`CONSOLE ${msg.type()}: ${msg.text()}`);
  });
  
  // Listen for page errors
  page.on('pageerror', error => {
    console.log(`PAGE ERROR: ${error.message}`);
    console.log(`STACK: ${error.stack}`);
  });
  
  // Listen for ALL network requests
  page.on('response', response => {
    const url = response.url();
    const status = response.status();
    console.log(`NETWORK: ${status} ${url}`);
    
    if (!response.ok()) {
      console.log(`❌ FAILED: ${url} - ${status}`);
    }
    
    // Check for CSS files specifically
    if (url.includes('.css') || url.includes('styles')) {
      console.log(`🎨 CSS REQUEST: ${status} ${url}`);
    }
  });
  
  try {
    console.log('Navigating to http://localhost:5179...');
    await page.goto('http://localhost:5179', { waitUntil: 'networkidle' });
    
    // Check if CSS is loaded
    const stylesheets = await page.$$eval('link[rel="stylesheet"]', links => 
      links.map(link => ({ href: link.href, loaded: !!link.sheet }))
    );
    console.log('STYLESHEETS:', stylesheets);
    
    // Check for style tags
    const styleTags = await page.$$eval('style', styles => 
      styles.map(style => ({ content: style.textContent?.substring(0, 100) + '...' }))
    );
    console.log('STYLE TAGS:', styleTags);
    
    // Check computed styles on body
    const bodyStyles = await page.evaluate(() => {
      const body = document.body;
      const computed = window.getComputedStyle(body);
      return {
        backgroundColor: computed.backgroundColor,
        fontFamily: computed.fontFamily,
        margin: computed.margin,
        padding: computed.padding
      };
    });
    console.log('BODY COMPUTED STYLES:', bodyStyles);
    
    // Take screenshot
    await page.screenshot({ path: 'debug-screenshot.png' });
    console.log('Screenshot saved as debug-screenshot.png');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  // Keep browser open for inspection
  console.log('Browser staying open for 60 seconds...');
  await page.waitForTimeout(60000);
  
  await browser.close();
}

debugPage();