import { NextResponse } from 'next/server';
import { createClient } from 'redis';
import { scrapeProduct } from '../../../lib/scraper';

// Helper function to create and connect a Redis client
async function getRedisClient() {
  const client = createClient({
    url: process.env.REDIS_URL
  });
  client.on('error', (err) => console.error('Redis Client Error', err));
  await client.connect();
  return client;
}

// This is the function Vercel will call on your schedule
export async function GET() {
  console.log('Vercel Cron Job started...');
  const client = await getRedisClient();

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  try {
    const productsJSON = await client.get('products');
    const products = productsJSON ? JSON.parse(productsJSON) : [];
    
    if (products.length === 0) {
      console.log('No products to check in Redis.');
      await client.quit();
      return NextResponse.json({ status: 'No products to check.' });
    }

    const updatedProducts = await Promise.all(products.map(async (product) => {
      console.log(`Checking price for: ${product.title || product.url}`);
      const scrapedData = await scrapeProduct(product.url);

      if (product.trackingType === 'percentage') {
          product.desiredPrice = product.initialPrice * (1 - product.desiredValue / 100);
      }

      let notifiedThisRun = false;
      if (scrapedData && scrapedData.currentPrice <= product.desiredPrice) {
        if (!product.lastNotifiedPrice || product.lastNotifiedPrice > scrapedData.currentPrice) {
          console.log(`PRICE DROP! For ${product.title}.`);
          
          let message;
          if (product.trackingType === 'percentage') {
              message = `<b>Price Drop!</b>\n\n<b>${product.title}</b> dropped by <b>${product.desiredValue}%</b> or more! \n\nNew Price: <b>₹${scrapedData.currentPrice}</b>\n<a href="${product.url}">Click here to buy!</a>`;
          } else {
              message = `<b>Price Drop!</b>\n\n<b>${product.title}</b> is now <b>₹${scrapedData.currentPrice}</b> (Desired: ₹${product.desiredPrice}).\n\n<a href="${product.url}">Click here to buy!</a>`;
          }

          // Send Telegram Notification via fetch
          const encodedMessage = encodeURIComponent(message);
          const url = `https://api.telegram.org/bot${botToken}/sendMessage?chat_id=${chatId}&text=${encodedMessage}&parse_mode=HTML`;
          await fetch(url);
          
          notifiedThisRun = true;
        }
      }

      return {
        ...product,
        currentPrice: scrapedData ? scrapedData.currentPrice : product.currentPrice,
        lastNotifiedPrice: notifiedThisRun ? scrapedData.currentPrice : product.lastNotifiedPrice,
        lastChecked: new Date().toISOString()
      };
    }));

    // Save the updated products array back to Redis
    await client.set('products', JSON.stringify(updatedProducts));
    
    console.log('Vercel Cron Job finished successfully.');
    return NextResponse.json({ status: 'ok' });

  } catch (error) {
    console.error('Vercel Cron Job failed:', error);
    return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
  } finally {
      if (client.isOpen) {
        await client.quit();
      }
  }
}
