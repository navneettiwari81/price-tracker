import puppeteer from 'puppeteer-core';

async function scrapeProduct(url) {
  if (!url) return null;

  console.log(`Attempting to scrape URL: ${url}`);
  let browser = null;

  try {
    let browserConfig;
    
    if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
      console.log('Running in serverless environment');
      
      try {
        // Use the correct chromium package for serverless
        const chromium = await import('@sparticuz/chromium');
        
        // Configure chromium for serverless
        await chromium.default.font('https://raw.githack.com/googlei18n/noto-emoji/master/fonts/NotoColorEmoji.ttf');
        
        browserConfig = {
          args: [
            ...chromium.default.args,
            '--hide-scrollbars',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
          ],
          defaultViewport: chromium.default.defaultViewport,
          executablePath: await chromium.default.executablePath(),
          headless: chromium.default.headless,
          ignoreHTTPSErrors: true,
        };
        
        console.log('Chromium configured for serverless environment');
        
      } catch (chromiumError) {
        console.error('Failed to configure chromium for serverless:', chromiumError);
        throw chromiumError;
      }
    } else {
      // Running locally
      console.log('Running locally');
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
    browser = await puppeteer.launch(browserConfig);

    const page = await browser.newPage();

    // Set user agent and viewport
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 720 });

    console.log('Navigating to URL...');
    await page.goto(url, { 
      waitUntil: 'domcontentloaded', 
      timeout: 30000 
    });

    const { hostname } = new URL(url);
    let title, currentPrice;

    if (hostname.includes('amazon')) {
      console.log('Scraping Amazon...');
      
      await page.waitForSelector('#productTitle', { timeout: 10000 });
      title = await page.$eval('#productTitle', el => el.innerText.trim());

      const priceSelectors = [
        'span.a-price-whole', 
        '.a-price.a-text-price .a-offscreen', 
        '.a-price .a-offscreen'
      ];
      
      let priceText = '';
      for (const selector of priceSelectors) {
        try {
          priceText = await page.$eval(selector, el => el.innerText);
          if (priceText) break;
        } catch (e) {
          continue;
        }
      }
      currentPrice = parseFloat(priceText.replace(/[^0-9.]/g, ''));

    } else if (hostname.includes('flipkart')) {
      console.log('Scraping Flipkart...');
      
      // Handle login pop-up if present
      try {
        await page.waitForSelector('button._2KpZ6l._2doB4z', { timeout: 3000 });
        await page.click('button._2KpZ6l._2doB4z');
        console.log('Login pop-up closed.');
      } catch (e) {
        console.log('No login pop-up found.');
      }

      // Wait for page to load
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
            title = await page.evaluate(el => el.innerText.trim(), element);
            if (title) {
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
            priceText = await page.evaluate(el => el.innerText.trim(), element);
            if (priceText) {
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
      console.log(`Could not extract valid data. Title: ${title || 'N/A'}, Price: ${currentPrice || 'N/A'}`);
      return null;
    }

    console.log(`Successfully scraped - Title: ${title}, Price: ${currentPrice}`);
    return { title, currentPrice };

  } catch (error) {
    console.error(`Scraping failed: ${error.message}`);
    console.error('Full error:', error);
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