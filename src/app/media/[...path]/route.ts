import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { safeMediaPath } from "@/lib/media";

const MIME: Record<string, string> = {
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
};

export async function GET(_req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path: parts } = await ctx.params;
  let abs: string;
  try {
    abs = safeMediaPath(parts.join("/"));
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
  let info;
  try {
    info = await stat(abs);
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
  if (!info.isFile()) return new NextResponse("Not found", { status: 404 });
  const ext = path.extname(abs).toLowerCase();
  const stream = Readable.toWeb(createReadStream(abs)) as ReadableStream;
  return new NextResponse(stream, {
    headers: {
      "Content-Type": MIME[ext] ?? "application/octet-stream",
      "Content-Length": String(info.size),
      "Cache-Control": "public, max-age=31536000, immutable",
      "Last-Modified": info.mtime.toUTCString(),
    },
  });
}
