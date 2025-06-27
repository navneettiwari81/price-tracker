"use client";

import { useState } from 'react';
import Link from 'next/link';

export default function HomePage() {
  const [url, setUrl] = useState('');
  const [trackingType, setTrackingType] = useState('fixed'); // 'fixed' or 'percentage'
  const [value, setValue] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('Tracking product...');

    try {
      const response = await fetch('/api/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, trackingType, value: parseFloat(value) }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`Success! Tracking product: ${data.product.title}`);
        setUrl('');
        setValue('');
      } else {
        setMessage(`Error: ${data.message}`);
      }
    } catch (error) {
      setMessage('An error occurred. Please try again.');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md dark:bg-gray-800">
        <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Track a Product</h1>
            <Link href="/dashboard" className="text-sm font-semibold text-indigo-600 hover:text-indigo-500">
                Go to Dashboard →
            </Link>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="url" className="text-sm font-medium text-gray-700 dark:text-gray-300">Product URL</label>
            <input
              type="url"
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              className="w-full px-3 py-2 mt-1 text-gray-900 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
              placeholder="https://www.amazon.in/..."
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tracking Type</label>
            <select
              value={trackingType}
              onChange={(e) => setTrackingType(e.target.value)}
              className="w-full px-3 py-2 mt-1 text-gray-900 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="fixed">Fixed Price</option>
              <option value="percentage">Percentage Discount</option>
            </select>
          </div>
          <div>
            <label htmlFor="value" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {trackingType === 'fixed' ? 'Desired Price (₹)' : 'Desired Discount (%)'}
            </label>
            <input
              type="number"
              id="value"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              required
              className="w-full px-3 py-2 mt-1 text-gray-900 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
              placeholder={trackingType === 'fixed' ? '1500.00' : '20'}
              step="0.01"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-4 py-2 font-bold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Tracking...' : 'Start Tracking'}
          </button>
        </form>
        {message && <p className="mt-4 text-center text-gray-600 dark:text-gray-400">{message}</p>}
      </div>
    </main>
  );
}
