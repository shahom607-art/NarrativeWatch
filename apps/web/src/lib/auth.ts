import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

async function syncGoogleUser(email: string) {
  const res = await fetch(`${API_URL}/api/auth/oauth/google`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-OAuth-Sync-Secret": process.env.OAUTH_SYNC_SECRET ?? "",
    },
    body: JSON.stringify({ email }),
  });

  if (!res.ok) return null;
  return res.json() as Promise<{ token: string; user: { id: string; email: string } }>;
}

export const authOptions: NextAuthOptions = {
  providers: [
    ...(googleClientId && googleClientSecret
      ? [
          GoogleProvider({
            clientId: googleClientId,
            clientSecret: googleClientSecret,
          }),
        ]
      : []),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const res = await fetch(`${API_URL}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: credentials.email,
            password: credentials.password,
          }),
        });

        if (!res.ok) return null;
        const data = await res.json();
        return {
          id: data.user.id,
          email: data.user.email,
          accessToken: data.token,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/login",
  },
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === "google") {
        const email = profile?.email;
        const emailVerified = (profile as { email_verified?: boolean } | undefined)
          ?.email_verified;
        if (!email || !emailVerified) return false;
        const synced = await syncGoogleUser(email);
        return synced !== null;
      }
      return true;
    },
    async jwt({ token, user, account, profile }) {
      if (account?.provider === "google" && profile?.email) {
        const synced = await syncGoogleUser(profile.email);
        if (synced) {
          token.accessToken = synced.token;
          token.id = synced.user.id;
        }
      } else if (user) {
        token.accessToken = (user as { accessToken?: string }).accessToken;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
        (session as { accessToken?: string }).accessToken = token.accessToken as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
