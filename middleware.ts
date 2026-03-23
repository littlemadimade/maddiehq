import { withAuth } from "next-auth/middleware";

const publicPaths = ["/good-morning", "/login", "/signup"];

export default withAuth(
  function middleware() {},
  {
    callbacks: {
      authorized: ({ req, token }) => {
        const pathname = req.nextUrl.pathname;

        if (publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
          return true;
        }

        return !!token;
      }
    },
    pages: {
      signIn: "/login"
    }
  }
);

export const config = {
  matcher: ["/((?!api/auth|api/register|_next/static|_next/image|favicon.ico).*)"]
};
