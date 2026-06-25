import { NextResponse } from "next/server";
import { ALLOWED_EMAIL_DOMAIN, OAUTH_STATE_COOKIE } from "@/lib/auth";

export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(new URL("/login?error=config", request.url));
  }

  const url = new URL(request.url);
  const state = crypto.randomUUID();
  const redirectUri = new URL("/api/auth/callback", url.origin).toString();
  const googleUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");

  googleUrl.searchParams.set("client_id", clientId);
  googleUrl.searchParams.set("redirect_uri", redirectUri);
  googleUrl.searchParams.set("response_type", "code");
  googleUrl.searchParams.set("scope", "openid email profile");
  googleUrl.searchParams.set("state", state);
  googleUrl.searchParams.set("hd", ALLOWED_EMAIL_DOMAIN);
  googleUrl.searchParams.set("prompt", "select_account");

  const response = NextResponse.redirect(googleUrl);
  response.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 10 * 60,
    path: "/"
  });
  return response;
}
