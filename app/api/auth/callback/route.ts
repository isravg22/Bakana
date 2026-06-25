import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSessionToken, isAllowedEmail, OAUTH_STATE_COOKIE, SESSION_COOKIE } from "@/lib/auth";

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
};

type GoogleUserInfo = {
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

function loginRedirect(request: Request, error: string) {
  return NextResponse.redirect(new URL(`/login?error=${error}`, request.url));
}

export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret || !process.env.AUTH_SECRET) {
    return loginRedirect(request, "config");
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieStore = await cookies();
  const savedState = cookieStore.get(OAUTH_STATE_COOKIE)?.value;

  if (!code || !state || !savedState || state !== savedState) {
    const response = loginRedirect(request, "state");
    response.cookies.delete(OAUTH_STATE_COOKIE);
    return response;
  }

  const redirectUri = new URL("/api/auth/callback", url.origin).toString();
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri
    })
  });

  const token = await tokenResponse.json() as GoogleTokenResponse;
  if (!tokenResponse.ok || !token.access_token) {
    return loginRedirect(request, "google");
  }

  const userResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${token.access_token}` }
  });
  const user = await userResponse.json() as GoogleUserInfo;

  if (!userResponse.ok || !user.email || !user.email_verified || !isAllowedEmail(user.email)) {
    return loginRedirect(request, "domain");
  }

  const sessionToken = await createSessionToken({
    email: user.email,
    name: user.name || user.email,
    picture: user.picture
  });

  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.delete(OAUTH_STATE_COOKIE);
  response.cookies.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 8,
    path: "/"
  });
  return response;
}
