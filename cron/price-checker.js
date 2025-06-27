const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { scrapeProduct } = require('../lib/scraper.js');

// Load environment variables from .env.local at the project root
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env.local') });

const productsFilePath = path.join(__dirname, '..', 'data', 'products.json');
const botToken = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

/**
 * Sends a notification message to your Telegram bot.
 * @param {string} message The HTML-formatted message to send.
 */
async function sendTelegramNotification(message) {
  if (!botToken || !chatId) {
    console.error('Telegram Bot Token or Chat ID is missing. Please check your .env.local file.');
    return;
  }
  
  // The message needs to be URL-encoded to be sent correctly via a GET request
  const encodedMessage = encodeURIComponent(message);
  const url = `https://api.telegram.org/bot${botToken}/sendMessage?chat_id=${chatId}&text=${encodedMessage}&parse_mode=HTML`;

  try {
    await axios.get(url);
    console.log('Telegram notification sent successfully!');
  } catch (error) {
    console.error('Failed to send Telegram notification:', error.message);
    if (error.response) {
      console.error('Telegram API Response:', error.response.data);
    }
  }
}

/**
 * Main function to check prices of all tracked products.
 */
async function checkPrices() {
  console.log('Starting price check process...');

  if (!fs.existsSync(productsFilePath)) {
    console.log('No products file found. Exiting.');
    return;
  }

  const fileContents = fs.readFileSync(productsFilePath, 'utf-8');
  let products;
  try {
    products = JSON.parse(fileContents);
  } catch (e) {
    console.error("Could not parse products.json. It might be empty or corrupted.", e);
    return;
  }

  if (products.length === 0) {
    console.log('Product list is empty. Nothing to check.');
    return;
  }

  // Use map to create a new array of updated products
  const updatedProducts = await Promise.all(products.map(async (product) => {
    console.log(`Checking price for: ${product.title || product.url}`);
    const scrapedData = await scrapeProduct(product.url);

    // --- UPDATED LOGIC ---
    // We no longer remove the product. We just update it.
    let notifiedThisRun = product.notifiedThisRun || false;

    if (scrapedData && scrapedData.currentPrice <= product.desiredPrice) {
      // Only send notification if we haven't already sent one for this specific price drop instance
      if (!product.lastNotifiedPrice || product.lastNotifiedPrice > scrapedData.currentPrice) {
        console.log(`PRICE DROP! For ${product.title}. New price: ₹${scrapedData.currentPrice}, Desired: ₹${product.desiredPrice}`);
        const message = `<b>Price Drop!</b>\n\n<b>${product.title}</b> is now <b>₹${scrapedData.currentPrice}</b> (Desired: ₹${product.desiredPrice}).\n\n<a href="${product.url}">Click here to buy!</a>`;
        await sendTelegramNotification(message);
        notifiedThisRun = true;
      } else {
        console.log(`Price for ${product.title} is still low, but notification for ₹${product.lastNotifiedPrice} was already sent.`);
      }
    } else if (scrapedData) {
      console.log(`Checked ${product.title}. Current price ₹${scrapedData.currentPrice} is still above the desired ₹${product.desiredPrice}.`);
    } else {
      console.log(`Could not scrape data for ${product.title}. It might be out of stock or the page is unavailable.`);
    }

    // Return the updated product object for the new array
    return {
      ...product,
      currentPrice: scrapedData ? scrapedData.currentPrice : product.currentPrice,
      lastNotifiedPrice: notifiedThisRun ? scrapedData.currentPrice : product.lastNotifiedPrice,
      lastChecked: new Date().toISOString()
    };
  }));

  // Write the updated list of all products back to the file
  fs.writeFileSync(productsFilePath, JSON.stringify(updatedProducts, null, 2));
  console.log('Price check process complete.');
}

// Execute the main function
checkPrices();
