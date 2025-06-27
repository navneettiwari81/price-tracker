import { NextResponse } from 'next/server';

export function middleware(request) {
  const path = request.nextUrl.pathname;

  // Get the password protection cookie
  const cookie = request.cookies.get('password-protected');
  const pagePassword = process.env.PAGE_PASSWORD;

  // If the user is trying to access the login page, let them through.
  if (path === '/login') {
    return NextResponse.next();
  }

  // If the cookie is missing or the value does not match the password,
  // we need to redirect them to the login page.
  if (!cookie || cookie.value !== pagePassword) {
    
    // IMPORTANT: We must allow the POST request to the login API to go through,
    // otherwise the user can never log in.
    if (path === '/api/login') {
      return NextResponse.next();
    }

    // For all other pages, redirect to the login page.
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // If the cookie is present and valid, allow the request to proceed.
  return NextResponse.next();
}

// This config applies the middleware to all routes except for static files
// and other internal Next.js assets.
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
