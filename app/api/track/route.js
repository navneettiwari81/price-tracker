import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { scrapeProduct } from '../../../lib/scraper';

const productsFilePath = path.join(process.cwd(), 'data', 'products.json');

const dataDir = path.dirname(productsFilePath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export async function POST(request) {
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
      // Calculate the target price based on the percentage discount
      desiredPrice = product.currentPrice * (1 - value / 100);
    } else {
      desiredPrice = value;
    }

    let products = [];
    if (fs.existsSync(productsFilePath)) {
      const fileContents = fs.readFileSync(productsFilePath, 'utf-8');
      if (fileContents) products = JSON.parse(fileContents);
    }

    const newProduct = {
      id: Date.now().toString(),
      url,
      trackingType,
      desiredValue: value,
      desiredPrice, // This is the calculated target price
      title: product.title,
      initialPrice: product.currentPrice,
      currentPrice: product.currentPrice,
      lastChecked: new Date().toISOString(),
    };

    products.push(newProduct);
    fs.writeFileSync(productsFilePath, JSON.stringify(products, null, 2));

    return NextResponse.json({ message: 'Product tracking started', product: newProduct }, { status: 200 });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
}
