import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const ACTIVE_WINDOW_SECONDS = 20 * 60;
const SESSION_LIMIT = 24;

interface SessionIndexEntry {
  id: string;
  thread_name?: string;
  updated_at?: string;
}

interface LogThreadEntry {
  thread_id: string;
  last_ts: number;
}

export interface CodexSessionSummary {
  id: string;
  title: string;
  updatedAt: string | null;
  isActive: boolean;
  isAttached: boolean;
  transcriptPath: string | null;
}

function codexDir(): string {
  return join(homedir(), ".codex");
}

function toIsoFromUnixSeconds(value: number): string {
  return new Date(value * 1000).toISOString();
}

async function readSessionIndex(limit: number): Promise<SessionIndexEntry[]> {
  const filePath = join(codexDir(), "session_index.jsonl");
  if (!existsSync(filePath)) {
    return [];
  }

  const content = await readFile(filePath, "utf8");
  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return lines
    .slice(-limit)
    .reverse()
    .map((line) => {
      try {
        return JSON.parse(line) as SessionIndexEntry;
      } catch {
        return null;
      }
    })
    .filter((entry): entry is SessionIndexEntry => Boolean(entry?.id));
}

async function readActiveThreads(limit: number): Promise<LogThreadEntry[]> {
  const databasePath = join(codexDir(), "logs_1.sqlite");
  if (!existsSync(databasePath)) {
    return [];
  }

  const query = [
    "select thread_id, max(ts) as last_ts",
    "from logs",
    "where thread_id is not null",
    "group by thread_id",
    "order by last_ts desc",
    `limit ${limit};`,
  ].join(" ");

  try {
    const { stdout } = await execFileAsync("sqlite3", ["-json", databasePath, query]);
    if (!stdout.trim()) {
      return [];
    }

    return JSON.parse(stdout) as LogThreadEntry[];
  } catch {
    return [];
  }
}

async function findTranscriptPath(sessionId: string): Promise<string | null> {
  const archivesDir = join(codexDir(), "archived_sessions");
  if (existsSync(archivesDir)) {
    const matches = (await readdir(archivesDir)).find((entry) => entry.includes(sessionId));
    if (matches) {
      return join(archivesDir, matches);
    }
  }

  const sessionsDir = join(codexDir(), "sessions");
  if (existsSync(sessionsDir)) {
    const matches = (await readdir(sessionsDir)).find((entry) => entry.includes(sessionId));
    if (matches) {
      return join(sessionsDir, matches);
    }
  }

  return null;
}

export async function listCodexSessions(currentThreadId?: string | null): Promise<CodexSessionSummary[]> {
  const [recentSessions, activeThreads] = await Promise.all([
    readSessionIndex(SESSION_LIMIT),
    readActiveThreads(SESSION_LIMIT),
  ]);

  const merged = new Map<string, CodexSessionSummary>();
  const nowSeconds = Math.floor(Date.now() / 1000);

  for (const entry of recentSessions) {
    merged.set(entry.id, {
      id: entry.id,
      title: entry.thread_name?.trim() || `Thread ${entry.id.slice(0, 8)}`,
      updatedAt: entry.updated_at ?? null,
      isActive: false,
      isAttached: entry.id === currentThreadId,
      transcriptPath: null,
    });
  }

  for (const entry of activeThreads) {
    const existing = merged.get(entry.thread_id);
    const updatedAt = toIsoFromUnixSeconds(entry.last_ts);
    const isActive = nowSeconds - entry.last_ts <= ACTIVE_WINDOW_SECONDS;

    merged.set(entry.thread_id, {
      id: entry.thread_id,
      title: existing?.title ?? `Live thread ${entry.thread_id.slice(0, 8)}`,
      updatedAt: existing?.updatedAt && existing.updatedAt > updatedAt ? existing.updatedAt : updatedAt,
      isActive,
      isAttached: entry.thread_id === currentThreadId,
      transcriptPath: existing?.transcriptPath ?? null,
    });
  }

  const sessions = [...merged.values()]
    .sort((left, right) => {
      if (left.isAttached !== right.isAttached) {
        return left.isAttached ? -1 : 1;
      }
      if (left.isActive !== right.isActive) {
        return left.isActive ? -1 : 1;
      }
      return (right.updatedAt ?? "").localeCompare(left.updatedAt ?? "");
    })
    .slice(0, SESSION_LIMIT);

  const transcriptPaths = await Promise.all(sessions.map((session) => findTranscriptPath(session.id)));
  return sessions.map((session, index) => ({
    ...session,
    transcriptPath: transcriptPaths[index],
  }));
}
