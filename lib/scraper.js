const puppeteer = require('puppeteer-core');

/**
 * Scrapes a given URL for product title and price using Puppeteer.
 * This version is configured to work reliably on Vercel's serverless environment.
 * @param {string} url The URL of the product page to scrape.
 * @returns {Promise<{title: string, currentPrice: number}|null>} An object with the product title and price, or null on failure.
 */
async function scrapeProduct(url) {
  if (!url) return null;

  console.log(`Attempting to scrape URL with Puppeteer: ${url}`);
  let browser = null;

  try {
    // Import chromium dynamically to handle different environments
    let chromium;
    let isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL;
    
    try {
      chromium = require('@sparticuz/chromium');
      console.log('Using @sparticuz/chromium');
    } catch (error) {
      console.log('@sparticuz/chromium not available');
      chromium = null;
    }

    // Launch browser with appropriate configuration
    let launchOptions;

    if (chromium && isProduction) {
      // Production/Vercel environment with @sparticuz/chromium
      console.log('Configuring for production environment');
      launchOptions = {
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
        ignoreHTTPSErrors: true,
      };
    } else {
      // Local development or fallback
      console.log('Configuring for local/fallback environment');
      launchOptions = {
        headless: true,
        ignoreHTTPSErrors: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding'
        ],
      };
      
      // For local development, try to find Chrome
      if (!isProduction) {
        const possiblePaths = [
          '/usr/bin/google-chrome-stable',
          '/usr/bin/google-chrome',
          '/usr/bin/chromium-browser',
          '/usr/bin/chromium',
          'google-chrome-stable',
          'google-chrome',
          'chromium-browser',
          'chromium'
        ];
        
        for (const path of possiblePaths) {
          try {
            launchOptions.executablePath = path;
            break;
          } catch (e) {
            continue;
          }
        }
      }
    }

    console.log('Launch options:', JSON.stringify(launchOptions, null, 2));
    browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();

    // Set user agent and viewport
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });

    // Navigate to the URL with timeout
    console.log(`Navigating to: ${url}`);
    await page.goto(url, { 
      waitUntil: 'domcontentloaded', 
      timeout: 60000 
    });

    const { hostname } = new URL(url);
    let title, currentPrice;

    if (hostname.includes('amazon')) {
      console.log('Scraping Amazon product...');
      await page.waitForSelector('#productTitle', { timeout: 15000 });
      title = await page.$eval('#productTitle', el => el.innerText.trim());

      const priceSelectors = ['span.a-price-whole', '.a-price.a-text-price .a-offscreen', '.a-price .a-offscreen'];
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
      console.log('Scraping Flipkart product...');
      
      // Handle login pop-up
      try {
        console.log('Checking for Flipkart login pop-up...');
        await page.waitForSelector('button._2KpZ6l._2doB4z', { timeout: 5000 });
        await page.click('button._2KpZ6l._2doB4z');
        console.log('Login pop-up found and closed.');
        await page.waitForTimeout(2000);
      } catch (e) {
        console.log('No login pop-up appeared, proceeding normally.');
      }
      
      // Wait for page to load
      await page.waitForTimeout(3000);
      
      // Try multiple title selectors
      const titleSelectors = [
        'span.B_NuCI', 
        'span.VU-ZEz', 
        '.yhB1nd', 
        'h1.x-product-title-label',
        '[data-testid="product-title"]',
        '.B_NuCI',
        'h1 span'
      ];
      
      for (const selector of titleSelectors) {
        try {
          const element = await page.$(selector);
          if (element) {
            title = await element.evaluate(el => el.innerText.trim());
            if (title && title.length > 0) {
              console.log(`Found title with selector: ${selector} - "${title}"`);
              break;
            }
          }
        } catch (e) {
          continue;
        }
      }
      
      // Try multiple price selectors
      const priceSelectors = [
        'div.Nx9bqj', 
        'div._30jeq3._16Jk6d', 
        'div._30jeq3', 
        '.C-Vz-I ._16Jk6d', 
        '._1_WHN1',
        'div._16Jk6d',
        '[data-testid="price"]',
        '._30jeq3._1_WHN1'
      ];
      
      let priceText = '';
      for (const selector of priceSelectors) {
        try {
          const element = await page.$(selector);
          if (element) {
            priceText = await element.evaluate(el => el.innerText.trim());
            if (priceText && priceText.length > 0) {
              console.log(`Found price with selector: ${selector} - "${priceText}"`);
              break;
            }
          }
        } catch (e) {
          continue;
        }
      }

      if (title && priceText) {
        console.log(`Flipkart Scraper: Found title "${title}" and price text "${priceText}"`);
        currentPrice = parseFloat(priceText.replace(/[^0-9.]/g, ''));
      } else {
        console.log(`All Flipkart selectors failed. Title Found: ${!!title}, Price Found: ${!!priceText}`);
        
        // Debug: Try to get page content for analysis
        try {
          const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 1000));
          console.log('Page content sample:', bodyText);
          
          // Try to find any element with price-like text
          const priceElements = await page.$$eval('*', elements => {
            return elements
              .filter(el => el.innerText && /₹[\d,]+/.test(el.innerText))
              .map(el => ({
                tagName: el.tagName,
                className: el.className,
                text: el.innerText.trim()
              }))
              .slice(0, 5);
          });
          console.log('Found price-like elements:', priceElements);
          
        } catch (debugError) {
          console.log('Could not get page content for debugging:', debugError.message);
        }
      }
    }

    if (!title || isNaN(currentPrice) || currentPrice === 0) {
      console.log('Could not extract valid title or price.');
      return null;
    }

    return { title, currentPrice };

  } catch (error) {
    console.error(`Scraping failed for ${url}. Error: ${error.message}`);
    console.error('Stack trace:', error.stack);
    return null;
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('Error closing browser:', closeError.message);
      }
    }
  }
}

module.exports = { scrapeProduct };