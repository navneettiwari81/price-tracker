const playwright = require('playwright-aws-lambda');

/**
 * Scrapes a given URL for product title and price using Playwright.
 * This version is configured to work reliably on Vercel's serverless environment.
 * @param {string} url The URL of the product page to scrape.
 * @returns {Promise<{title: string, currentPrice: number}|null>} An object with the product title and price, or null on failure.
 */
async function scrapeProduct(url) {
  if (!url) return null;

  console.log(`Attempting to scrape URL with Playwright: ${url}`);
  let browser = null;

  try {
    // Launch browser optimized for AWS Lambda/Vercel
    browser = await playwright.launchChromium({
      headless: true,
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();

    // Navigate to the URL with a long timeout
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    const { hostname } = new URL(url);
    let title, currentPrice;

    if (hostname.includes('amazon')) {
      const titleElement = await page.waitForSelector('#productTitle', { timeout: 15000 });
      title = await titleElement.innerText();

      const priceSelectors = ['span.a-price-whole', '.a-price.a-text-price .a-offscreen', '.a-price .a-offscreen'];
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
      // Handle login pop-up
      try {
        console.log('Checking for Flipkart login pop-up...');
        const closeButtonSelector = 'button._2KpZ6l._2doB4z';
        await page.waitForSelector(closeButtonSelector, { timeout: 5000 });
        await page.click(closeButtonSelector);
        console.log('Login pop-up found and closed.');
      } catch (e) {
        console.log('No login pop-up appeared, proceeding normally.');
      }
      
      const titleSelectors = ['span.B_NuCI', 'span.VU-ZEz', '.yhB1nd'];
      for (const selector of titleSelectors) {
          const element = await page.$(selector);
          if (element) {
              title = await element.innerText();
              if(title) break;
          }
      }
      
      const priceSelectors = ['div.Nx9bqj','div._30jeq3._16Jk6d', 'div._30jeq3', '.C-Vz-I ._16Jk6d'];
      let priceText = '';
       for (const selector of priceSelectors) {
          const element = await page.$(selector);
          if (element) {
              priceText = await element.innerText();
              if(priceText) break;
          }
      }

      if (title && priceText) {
          console.log(`Flipkart Scraper: Found title "${title}" and price text "${priceText}"`);
          currentPrice = parseFloat(priceText.replace(/[^0-9.]/g, ''));
      } else {
           console.log(`All Flipkart selectors failed. Title Found: ${!!title}, Price Found: ${!!priceText}. Check page structure.`);
      }
    }

    if (!title || isNaN(currentPrice) || currentPrice === 0) {
      console.log('Could not extract valid title or price.');
      return null;
    }

    return { title, currentPrice };

  } catch (error) {
    console.error(`Scraping failed for ${url}. Error: ${error.message}`);
    return null;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

module.exports = { scrapeProduct };