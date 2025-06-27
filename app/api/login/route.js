import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request) {
  try {
    const { password } = await request.json();
    const pagePassword = process.env.PAGE_PASSWORD;

    // Check if the password from the form matches the one in your .env file
    if (password === pagePassword) {
      // If it matches, set a secure, httpOnly cookie
      cookies().set('password-protected', password, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 24 * 7 // 1 week
      });
      return NextResponse.json({ success: true }, { status: 200 });
    } else {
      // If the password does not match, return an error
      return NextResponse.json({ success: false, message: 'Invalid password' }, { status: 401 });
    }
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ message: 'An internal server error occurred' }, { status: 500 });
  }
}
