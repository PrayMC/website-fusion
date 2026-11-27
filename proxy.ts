import { NextResponse, type NextRequest } from 'next/server';

// A path with a broken % escape ("/api/players/%zz", "/img/item/%zz") fails Next's own decoding as a 500; answer it as
// the bad request it is
export function proxy(request: NextRequest) {
  try {
    decodeURIComponent(request.nextUrl.pathname);
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }
}

export const config = { matcher: ['/api/:path*', '/img/:path*'] };
