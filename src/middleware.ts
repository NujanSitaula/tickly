import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Minimal middleware: pass through all routes. Locale is read from cookie in getRequestConfig.
// next-intl's createMiddleware was rewriting routes and causing /login to 404.
export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)'],
};
