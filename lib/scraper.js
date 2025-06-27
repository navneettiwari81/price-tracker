import { chromium } from 'playwright-core';

async function scrapeProduct(url) {
  if (!url) return null;

  console.log(`Attempting to scrape URL: ${url}`);
  let browser = null;

  try {
    let browserConfig;
    
    if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
      // Running on Vercel/Lambda - use dynamic import
      const { default: chromiumBinary } = await import('@sparticuz/chromium');
      
      // Get executable path
      const executablePath = await chromiumBinary.executablePath({
        forceDownload: false
      });
      
      browserConfig = {
        args: [
          ...chromiumBinary.args,
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--single-process',
          '--no-zygote',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ],
        executablePath,
        headless: true,
      };
    } else {
      // Running locally - use system chromium
      browserConfig = {
        headless: true,
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage'
        ]
      };
    }

    console.log('Launching browser...');
    browser = await chromium.launch(browserConfig);

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 720 }
    });
    
    const page = await context.newPage();

    console.log('Navigating to URL...');
    await page.goto(url, { 
      waitUntil: 'domcontentloaded', 
      timeout: 30000 
    });

    const { hostname } = new URL(url);
    let title, currentPrice;

    if (hostname.includes('amazon')) {
      console.log('Scraping Amazon...');
      const titleElement = await page.waitForSelector('#productTitle', { timeout: 10000 });
      title = await titleElement.innerText();

      const priceSelectors = [
        'span.a-price-whole', 
        '.a-price.a-text-price .a-offscreen', 
        '.a-price .a-offscreen'
      ];
      
      let priceText = '';
      for (const selector of priceSelectors) {
        const element = await page.$(selector);
        if (element) {
          priceText = await element.innerText();
          if (priceText) break;
        }
      }
      currentPrice = parseFloat(priceText.replace(/[^0-9.]/g, ''));

    } else if (hostname.includes('flipkart')) {
      console.log('Scraping Flipkart...');
      
      // Handle login pop-up
      try {
        const closeButtonSelector = 'button._2KpZ6l._2doB4z';
        await page.waitForSelector(closeButtonSelector, { timeout: 3000 });
        await page.click(closeButtonSelector);
        console.log('Login pop-up closed.');
      } catch (e) {
        console.log('No login pop-up found.');
      }

      // Wait a bit for page to load
      await page.waitForTimeout(2000);

      // Try to get title
      const titleSelectors = [
        'span.B_NuCI', 
        'span.VU-ZEz', 
        '.yhB1nd',
        'h1 span',
        '[data-testid="product-title"]'
      ];
      
      for (const selector of titleSelectors) {
        try {
          const element = await page.$(selector);
          if (element) {
            title = await element.innerText();
            if (title && title.trim()) {
              console.log(`Found title with selector ${selector}: ${title}`);
              break;
            }
          }
        } catch (e) {
          continue;
        }
      }
      
      // Try to get price
      const priceSelectors = [
        'div.Nx9bqj',
        'div._30jeq3._16Jk6d', 
        'div._30jeq3', 
        '.C-Vz-I ._16Jk6d',
        '[data-testid="price-mp-label"]',
        '._16Jk6d'
      ];
      
      let priceText = '';
      for (const selector of priceSelectors) {
        try {
          const element = await page.$(selector);
          if (element) {
            priceText = await element.innerText();
            if (priceText && priceText.trim()) {
              console.log(`Found price with selector ${selector}: ${priceText}`);
              break;
            }
          }
        } catch (e) {
          continue;
        }
      }

      if (priceText) {
        currentPrice = parseFloat(priceText.replace(/[^0-9.]/g, ''));
      }
    }

    if (!title || isNaN(currentPrice) || currentPrice === 0) {
      console.log(`Could not extract valid data. Title: ${title}, Price: ${currentPrice}`);
      return null;
    }

    console.log(`Successfully scraped - Title: ${title}, Price: ${currentPrice}`);
    return { title, currentPrice };

  } catch (error) {
    console.error(`Scraping failed: ${error.message}`);
    console.error(error.stack);
    return null;
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        console.error('Error closing browser:', e);
      }
    }
  }
}

export { scrapeProduct };