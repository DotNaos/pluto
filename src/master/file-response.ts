import { createReadStream } from "node:fs";
import { access, stat } from "node:fs/promises";
import type { ServerResponse } from "node:http";
import { basename, extname, isAbsolute, resolve } from "node:path";
import { constants as fsConstants } from "node:fs";

const CONTENT_TYPES: Record<string, string> = {
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
};

function contentTypeFor(path: string): string {
  return CONTENT_TYPES[extname(path).toLowerCase()] ?? "application/octet-stream";
}

function resolveRequestedPath(rawPath: string): string {
  const trimmed = rawPath.trim();
  return isAbsolute(trimmed) ? resolve(trimmed) : resolve(process.cwd(), trimmed);
}

export async function sendFileResponse(
  response: ServerResponse,
  rawPath: string,
  options?: { download?: boolean },
): Promise<void> {
  const resolvedPath = resolveRequestedPath(rawPath);

  await access(resolvedPath, fsConstants.R_OK);
  const info = await stat(resolvedPath);
  if (!info.isFile()) {
    throw new Error(`${basename(resolvedPath)} is not a regular file.`);
  }

  response.statusCode = 200;
  response.setHeader("content-type", contentTypeFor(resolvedPath));
  response.setHeader("content-length", String(info.size));
  response.setHeader(
    "content-disposition",
    `${options?.download ? "attachment" : "inline"}; filename="${basename(resolvedPath)}"`,
  );

  await new Promise<void>((resolveStream, rejectStream) => {
    const stream = createReadStream(resolvedPath);
    stream.on("error", rejectStream);
    response.on("close", resolveStream);
    stream.pipe(response);
  });
}
