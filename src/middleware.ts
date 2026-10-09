import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = ["/workshop", "/map"];

function isProtected(path: string) {
  return PROTECTED.some((p) => path === p || path.startsWith(`${p}/`));
}

function toLogin(request: NextRequest) {
  const login = request.nextUrl.clone();
  login.pathname = "/login";
  login.search = "";
  login.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(login);
}

export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // 還沒設定 Supabase：需要登入的頁面先導到登入頁，那裡會顯示設定說明。
  if (!url || !key) return isProtected(request.nextUrl.pathname) ? toLogin(request) : NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtected(request.nextUrl.pathname)) return toLogin(request);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|landing.html|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
