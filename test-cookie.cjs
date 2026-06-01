const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();

  // Intercept ALL responses and log set-cookie headers
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('login') || url.includes('api/')) {
      const headers = response.headers();
      const setCookie = headers['set-cookie'];
      console.log(`\n[${response.status()}] ${url}`);
      if (setCookie) {
        console.log('  Set-Cookie:', setCookie);
      } else {
        console.log('  Set-Cookie: (none)');
      }
    }
  });

  // Also intercept requests to add logging
  page.on('request', (request) => {
    const url = request.url();
    if (url.includes('login') || url.includes('api/')) {
      console.log(`[REQUEST] ${request.method()} ${url}`);
    }
  });

  console.log('=== Starting login flow test ===');
  await page.goto('https://route-commerce-platform.vercel.app/login', { waitUntil: 'domcontentloaded' });
  console.log('Page loaded:', page.url());

  await page.waitForTimeout(1000);

  await page.fill('#email', 'kylemart@gmail.com');
  await page.fill('#password', 'Test123456!');

  console.log('Form filled, submitting...');
  await page.click('button[type="submit"]');

  // Wait for response
  await page.waitForTimeout(5000);

  console.log('\n=== Final State ===');
  console.log('URL:', page.url());

  const cookies = await context.cookies();
  console.log('Cookies:', cookies.length);
  cookies.forEach(c => {
    console.log(`  ${c.name}=${c.value.substring(0, 30)}... (domain=${c.domain}, path=${c.path})`);
  });

  await browser.close();
})().catch(console.error);