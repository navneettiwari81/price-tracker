import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Path to the JSON file that acts as our database
const productsFilePath = path.join(process.cwd(), 'data', 'products.json');

// Helper function to read products from the file
function getProducts() {
  if (!fs.existsSync(productsFilePath)) {
    return [];
  }
  const fileContents = fs.readFileSync(productsFilePath, 'utf-8');
  if (!fileContents) {
    return [];
  }
  return JSON.parse(fileContents);
}

// Helper function to write products to the file
function saveProducts(products) {
  fs.writeFileSync(productsFilePath, JSON.stringify(products, null, 2));
}

// GET request handler to fetch all products
export async function GET() {
  try {
    const products = getProducts();
    return NextResponse.json(products);
  } catch (error) {
    console.error('Failed to read products:', error);
    return NextResponse.json({ message: 'Error fetching products' }, { status: 500 });
  }
}

// PUT request handler to update a product's desired price
export async function PUT(request) {
  try {
    const { id, desiredPrice } = await request.json();
    if (!id || desiredPrice === undefined) {
      return NextResponse.json({ message: 'Product ID and desired price are required' }, { status: 400 });
    }

    const products = getProducts();
    const productIndex = products.findIndex(p => p.id === id);

    if (productIndex === -1) {
      return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }

    products[productIndex].desiredPrice = parseFloat(desiredPrice);
    saveProducts(products);

    return NextResponse.json(products[productIndex]);
  } catch (error) {
    console.error('Failed to update product:', error);
    return NextResponse.json({ message: 'Error updating product' }, { status: 500 });
  }
}

// DELETE request handler to remove a product
export async function DELETE(request) {
  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ message: 'Product ID is required' }, { status: 400 });
    }

    let products = getProducts();
    const initialLength = products.length;
    products = products.filter(p => p.id !== id);

    if (products.length === initialLength) {
      return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }

    saveProducts(products);

    return NextResponse.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Failed to delete product:', error);
    return NextResponse.json({ message: 'Error deleting product' }, { status: 500 });
  }
}
