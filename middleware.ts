import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Rotas públicas que não precisam de autenticação
  const publicRoutes = ["/login", "/", "/api/auth"];
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Páginas protegidas - redirecionar para login se não autenticado
  const protectedPages = ["/dashboard"];
  const isProtectedPage = protectedPages.some((route) => pathname.startsWith(route));

  if (isProtectedPage) {
    const token = request.headers.get("authorization")?.replace("Bearer ", "") || 
                  request.cookies.get("sb-auth-token")?.value;

    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // APIs protegidas - deixar passar, cada rota valida com withAuth
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
