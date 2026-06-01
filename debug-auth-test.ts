import { chromium } from 'playwright';

async function debugAuth() {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // First, login
  console.log('Navigating to login page...');
  await page.goto('https://route-commerce-platform.vercel.app/login');

  console.log('Filling login form...');
  await page.fill('#email', 'kylemart@gmail.com');
  await page.fill('#password', 'Test123456!');

  console.log('Clicking sign in...');
  const response = await page.click('button[type="submit"]');

  // Wait for network to settle
  await page.waitForLoadState('networkidle').catch(() => {});

  console.log('Current URL after wait:', page.url());

  // Get any error messages
  const errorText = await page.$eval('[role="alert"]', el => el.textContent).catch(() => null);
  if (errorText) console.log('Error message:', errorText);

  const pageContent = await page.content();
  if (pageContent.includes('Access Denied')) {
    console.log('*** ACCESS DENIED PAGE DETECTED ***');
  }

  // Check cookies
  const cookies = await context.cookies();
  console.log('Cookies:', cookies.map(c => `${c.name}=${c.value.slice(0, 30)}...`));

  // Try to visit debug-auth page
  console.log('Navigating to /admin/debug-auth...');
  try {
    const response = await page.goto('https://route-commerce-platform.vercel.app/admin/debug-auth', { timeout: 10000 });
    console.log('Response status:', response?.status());
    console.log('Response URL:', page.url());
    const content = await page.content();
    console.log('Page content (first 2000 chars):', content.slice(0, 2000));
  } catch (e) {
    console.log('Error:', e);
  }

  await browser.close();
}

debugAuth().catch(console.error);