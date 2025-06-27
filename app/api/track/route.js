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

export async function POST(request) {
  const client = await getRedisClient();
  try {
    const body = await request.json();
    const { url, trackingType, value } = body;

    if (!url || !trackingType || !value) {
      return NextResponse.json({ message: 'URL, tracking type, and value are required' }, { status: 400 });
    }

    const product = await scrapeProduct(url);
    if (!product) {
      return NextResponse.json({ message: 'Could not scrape product information. Please check the URL.' }, { status: 500 });
    }

    let desiredPrice;
    if (trackingType === 'percentage') {
      desiredPrice = product.currentPrice * (1 - value / 100);
    } else {
      desiredPrice = value;
    }

    const productsJSON = await client.get('products');
    const products = productsJSON ? JSON.parse(productsJSON) : [];

    const newProduct = {
      id: Date.now().toString(),
      url,
      trackingType,
      desiredValue: value,
      desiredPrice,
      title: product.title,
      initialPrice: product.currentPrice,
      currentPrice: product.currentPrice,
      lastChecked: new Date().toISOString(),
    };

    products.push(newProduct);
    await client.set('products', JSON.stringify(products));

    return NextResponse.json({ message: 'Product tracking started', product: newProduct }, { status: 200 });

  } catch (error) {
    console.error('Error in track API:', error);
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  } finally {
      if (client.isOpen) {
        await client.quit();
      }
  }
}
