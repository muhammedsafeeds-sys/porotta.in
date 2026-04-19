import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  // Only protect the /admin routes
  if (req.nextUrl.pathname.startsWith('/admin')) {
    const basicAuth = req.headers.get('authorization');

    if (basicAuth) {
      const authValue = basicAuth.split(' ')[1];
      const [user, pwd] = atob(authValue).split(':');

      const adminPassword = process.env.ADMIN_PASSWORD || 'Safeed3030';
      if (user === 'admin' && pwd === adminPassword) {
        return NextResponse.next();
      }
    }
    
    // If not authenticated, trigger the browser's native login prompt
    return new NextResponse('Authentication required to access the Admin Panel', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Secure Admin Area"',
      },
    });
  }
}

export const config = {
  matcher: '/admin/:path*',
};
