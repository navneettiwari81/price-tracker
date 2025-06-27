import { NextResponse } from 'next/server';
import { createClient } from 'redis';

// Helper function to create and connect a Redis client
async function getRedisClient() {
  const client = createClient({
    url: process.env.REDIS_URL
  });
  client.on('error', (err) => console.error('Redis Client Error', err));
  await client.connect();
  return client;
}

// GET request handler to fetch all products from Redis
export async function GET() {
  const client = await getRedisClient();
  try {
    const productsJSON = await client.get('products');
    const products = productsJSON ? JSON.parse(productsJSON) : [];
    return NextResponse.json(products);
  } catch (error) {
    console.error('Failed to read products from Redis:', error);
    return NextResponse.json({ message: 'Error fetching products' }, { status: 500 });
  } finally {
    await client.quit();
  }
}

// PUT request handler to update a product in Redis
export async function PUT(request) {
  const client = await getRedisClient();
  try {
    const { id, trackingType, value } = await request.json();
    if (!id || !trackingType || value === undefined) {
      return NextResponse.json({ message: 'ID, tracking type, and value are required' }, { status: 400 });
    }

    const productsJSON = await client.get('products');
    const products = productsJSON ? JSON.parse(productsJSON) : [];
    const productIndex = products.findIndex(p => p.id === id);

    if (productIndex === -1) {
      return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }

    const productToUpdate = products[productIndex];
    productToUpdate.trackingType = trackingType;
    productToUpdate.desiredValue = parseFloat(value);
    
    if (trackingType === 'percentage') {
      productToUpdate.desiredPrice = productToUpdate.initialPrice * (1 - parseFloat(value) / 100);
    } else {
      productToUpdate.desiredPrice = parseFloat(value);
    }

    products[productIndex] = productToUpdate;
    await client.set('products', JSON.stringify(products));

    return NextResponse.json(products[productIndex]);
  } catch (error) {
    console.error('Failed to update product in Redis:', error);
    return NextResponse.json({ message: 'Error updating product' }, { status: 500 });
  } finally {
    await client.quit();
  }
}

// DELETE request handler to remove a product from Redis
export async function DELETE(request) {
  const client = await getRedisClient();
  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ message: 'Product ID is required' }, { status: 400 });
    }
    
    const productsJSON = await client.get('products');
    let products = productsJSON ? JSON.parse(productsJSON) : [];
    const initialLength = products.length;
    products = products.filter(p => p.id !== id);

    if (products.length === initialLength) {
      return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }

    await client.set('products', JSON.stringify(products));

    return NextResponse.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Failed to delete product from Redis:', error);
    return NextResponse.json({ message: 'Error deleting product' }, { status: 500 });
  } finally {
    await client.quit();
  }
}
