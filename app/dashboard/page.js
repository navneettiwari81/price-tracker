"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function DashboardPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [newPrice, setNewPrice] = useState('');

  // Fetch products from the API
  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products');
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch products on initial component mount
  useEffect(() => {
    fetchProducts();
  }, []);

  // Handle entering edit mode
  const handleEdit = (product) => {
    setEditingId(product.id);
    setNewPrice(product.desiredPrice);
  };

  // Handle canceling edit mode
  const handleCancelEdit = () => {
    setEditingId(null);
    setNewPrice('');
  };

  // Handle updating the desired price
  const handleUpdate = async (id) => {
    try {
      const response = await fetch('/api/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, desiredPrice: newPrice }),
      });

      if (!response.ok) {
        throw new Error('Failed to update product');
      }

      await fetchProducts(); // Refresh the product list
      handleCancelEdit(); // Exit edit mode
    } catch (error) {
      console.error('Error updating product:', error);
    }
  };

  // Handle deleting a product
  const handleDelete = async (id) => {
    // Custom modal confirmation would be better, but window.confirm is simple for this example
    if (confirm('Are you sure you want to delete this product?')) {
      try {
        const response = await fetch('/api/products', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id }),
        });

        if (!response.ok) {
          throw new Error('Failed to delete product');
        }
        await fetchProducts(); // Refresh the product list
      } catch (error) {
        console.error('Error deleting product:', error);
      }
    }
  };


  if (loading) {
    return <div className="flex justify-center items-center h-screen text-lg">Loading tracked products...</div>;
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8 bg-gray-50 min-h-screen">
        <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Your Product Dashboard</h1>
            <div className="flex gap-4">
                <Link href="/" className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                    + Track New Product
                </Link>
            </div>
        </div>
        
        <div className="bg-white shadow-md rounded-lg overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
                <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current Price
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Desired Price
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Checked
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                </th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {products.length > 0 ? products.map((product) => (
                <tr key={product.id}>
                    <td className="px-6 py-4">
                        <a href={product.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-indigo-600 hover:text-indigo-800 break-words" title={product.title}>
                            {product.title}
                        </a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                    ₹{product.currentPrice?.toFixed(2) || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {editingId === product.id ? (
                        <input
                        type="number"
                        value={newPrice}
                        onChange={(e) => setNewPrice(e.target.value)}
                        className="w-28 px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    ) : (
                        `₹${product.desiredPrice?.toFixed(2)}`
                    )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(product.lastChecked).toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {editingId === product.id ? (
                        <div className="flex items-center gap-4">
                            <button onClick={() => handleUpdate(product.id)} className="text-green-600 hover:text-green-800">Save</button>
                            <button onClick={handleCancelEdit} className="text-gray-600 hover:text-gray-800">Cancel</button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-4">
                            <button onClick={() => handleEdit(product)} className="text-indigo-600 hover:text-indigo-800">Edit</button>
                            <button onClick={() => handleDelete(product.id)} className="text-red-600 hover:text-red-800">Delete</button>
                        </div>
                    )}
                    </td>
                </tr>
                )) : (
                    <tr>
                        <td colSpan="5" className="text-center py-10 text-gray-500">You are not tracking any products yet.</td>
                    </tr>
                )}
            </tbody>
            </table>
        </div>
    </div>
  );
}
