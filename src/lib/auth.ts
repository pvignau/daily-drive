import NextAuth from "next-auth";
import Spotify from "next-auth/providers/spotify";
import { prisma } from "@/lib/db";

const SCOPES = [
  "user-read-recently-played",
  "user-top-read",
  "user-library-read",
  "user-read-playback-position",
  "playlist-read-private",
  "playlist-modify-public",
  "playlist-modify-private",
].join(" ");

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Spotify({
      clientId: process.env.SPOTIFY_CLIENT_ID!,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
      authorization: {
        url: "https://accounts.spotify.com/authorize",
        params: { scope: SCOPES },
      },
      checks: ["pkce", "state"],
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "spotify") return false;

      const spotifyProfile = profile as {
        id: string;
        display_name?: string;
        email?: string;
      };

      await prisma.user.upsert({
        where: { spotifyId: spotifyProfile.id },
        update: {
          accessToken: account.access_token!,
          refreshToken: account.refresh_token!,
          tokenExpiry: new Date(account.expires_at! * 1000),
          displayName: spotifyProfile.display_name,
          email: spotifyProfile.email,
        },
        create: {
          spotifyId: spotifyProfile.id,
          accessToken: account.access_token!,
          refreshToken: account.refresh_token!,
          tokenExpiry: new Date(account.expires_at! * 1000),
          displayName: spotifyProfile.display_name,
          email: spotifyProfile.email,
        },
      });

      return true;
    },
    async session({ session, token }) {
      if (token.spotifyId) {
        session.user.spotifyId = token.spotifyId as string;
      }
      return session;
    },
    async jwt({ token, account, profile }) {
      if (account && profile) {
        const spotifyProfile = profile as { id: string };
        token.spotifyId = spotifyProfile.id;
      }
      return token;
    },
  },
  pages: {
    signIn: "/",
  },
});
