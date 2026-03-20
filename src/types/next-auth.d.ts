import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      spotifyId?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}
