import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runUpdateForUser } from "@/lib/user-update";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await prisma.user.findMany({ where: { pauseUpdates: false } });

  if (users.length === 0) {
    return NextResponse.json({ message: "No users to process" });
  }

  const today = new Date().getDay(); // 0=Sun, 6=Sat

  const results = await Promise.allSettled(
    users.map(async (user) => {
      // VULN-04: validate activeDays before use
      const activeDays = user.activeDays
        .split(",")
        .map(Number)
        .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);

      if (!activeDays.includes(today)) {
        return { userId: user.spotifyId, status: "skipped" };
      }

      const { playlistId } = await runUpdateForUser(user.spotifyId, console.log);
      return { userId: user.spotifyId, status: "ok", playlistId };
    })
  );

  // VULN-08: sanitize error details — log full error server-side only
  const summary = results.map((r, i) => {
    if (r.status === "fulfilled") {
      return { user: users[i].spotifyId, ...r.value };
    } else {
      console.error(`Error for user ${users[i].spotifyId}:`, r.reason);
      return { user: users[i].spotifyId, status: "error" };
    }
  });

  return NextResponse.json({ processed: users.length, results: summary });
}
