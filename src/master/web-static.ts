import { createReadStream } from "node:fs";
import { access, readFile, stat } from "node:fs/promises";
import type { ServerResponse } from "node:http";
import { basename, extname, resolve } from "node:path";
import { constants as fsConstants } from "node:fs";
import type { AppState } from "../shared/types.js";

const CONTENT_TYPES: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function contentTypeFor(path: string): string {
  return CONTENT_TYPES[extname(path).toLowerCase()] ?? "application/octet-stream";
}

function rootPath(): string {
  return resolve(process.cwd(), "dist/web");
}

export async function sendWebDocument(
  response: ServerResponse,
  payload: { state: AppState; runtime: unknown },
): Promise<boolean> {
  const indexPath = resolve(rootPath(), "index.html");

  try {
    await access(indexPath, fsConstants.R_OK);
    const source = await readFile(indexPath, "utf8");
    const bootstrap = JSON.stringify(payload).replace(/</g, "\\u003c");
    response.statusCode = 200;
    response.setHeader("content-type", "text/html; charset=utf-8");
    response.setHeader("cache-control", "no-cache");
    response.end(
      source.replace(
        "window.__PLUTO_BOOTSTRAP__ = { state: null, runtime: null };",
        `window.__PLUTO_BOOTSTRAP__ = ${bootstrap};`,
      ),
    );
    return true;
  } catch {
    return false;
  }
}

export async function trySendWebAsset(response: ServerResponse, pathname: string): Promise<boolean> {
  const root = rootPath();
  const normalizedPath = pathname === "/" ? "/index.html" : pathname;
  const assetPath = resolve(root, `.${normalizedPath}`);

  if (!assetPath.startsWith(root)) {
    return false;
  }

  try {
    await access(assetPath, fsConstants.R_OK);
    const info = await stat(assetPath);
    if (!info.isFile()) {
      return false;
    }

    response.statusCode = 200;
    response.setHeader("content-type", contentTypeFor(assetPath));
    response.setHeader("content-length", String(info.size));
    response.setHeader("cache-control", pathname.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "no-cache");
    response.setHeader("content-disposition", `inline; filename="${basename(assetPath)}"`);

    await new Promise<void>((resolveStream, rejectStream) => {
      const stream = createReadStream(assetPath);
      stream.on("error", rejectStream);
      response.on("close", resolveStream);
      stream.pipe(response);
    });

    return true;
  } catch {
    return false;
  }
}
