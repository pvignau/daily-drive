import Link from "next/link";

const MESSAGES: Record<string, string> = {
  Configuration: "Server configuration error. Please try again later.",
  AccessDenied: "Access denied. You may not be authorized to use this app yet.",
  Verification: "The login link is invalid or has expired.",
  Default: "Something went wrong during sign in. Please try again.",
};

export default async function AuthError({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const message = MESSAGES[error ?? ""] ?? MESSAGES.Default;

  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-4">
      <div className="text-center max-w-md">
        <div className="text-5xl mb-6">⚠️</div>
        <h1 className="text-2xl font-bold mb-3">Sign in failed</h1>
        <p className="text-spotify-lightgray mb-2">{message}</p>
        {error === "AccessDenied" && (
          <p className="text-spotify-gray text-sm mb-6">
            This app is in alpha — only registered Spotify developer accounts
            can sign in for now.
          </p>
        )}
        <Link
          href="/"
          className="inline-block mt-4 bg-spotify-green hover:bg-green-400 text-black font-bold py-2 px-6 rounded-full transition-colors"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
