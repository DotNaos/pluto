import {
  Children,
  cloneElement,
  isValidElement,
  startTransition,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import {
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  Expand,
  LoaderCircle,
  Mic,
  Orbit,
  PanelsTopLeft,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  UserRound,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface MessageRecord {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
  runId?: string;
}

interface RunRecord {
  id: string;
  messageId: string;
  commandIds: string[];
}

interface CommandRecord {
  id: string;
  runId: string;
  type: "workspace.read_file" | "workspace.write_file" | "process.run";
  status: "pending_approval" | "queued" | "accepted" | "running" | "completed" | "failed" | "cancelled";
  payload: Record<string, unknown>;
  stdout?: string;
  stderr?: string;
  error?: string;
}

export interface AppState {
  permissionMode: "default" | "full-access";
  messages: MessageRecord[];
  runs: RunRecord[];
  commands: CommandRecord[];
  events: { id: string }[];
}

export interface RuntimeState {
  model: string | null;
  availableModels: string[];
  account: { type: string; email?: string } | null;
}

interface MessageEventPayload {
  messageId: string;
  role: "user" | "assistant";
  text: string;
  createdAt?: string;
  contextId?: string;
  runId?: string;
}

interface CommandStatusEventPayload {
  commandId: string;
  runId: string;
  status: CommandRecord["status"];
  error?: string;
}

interface CommandOutputEventPayload {
  commandId: string;
  runId: string;
  stream: "stdout" | "stderr";
  chunk: string;
  stdout: string;
  stderr: string;
  status: CommandRecord["status"];
}

type ResourceKind = "image" | "pdf" | "file";

interface ViewerState {
  kind: ResourceKind;
  title: string;
  src: string;
}

function escapePathTarget(target: string, download = false): string {
  const raw = target.trim();
  if (/^(https?:|data:|mailto:)/i.test(raw)) {
    return raw;
  }

  if (raw === "/" || raw.startsWith("/admin") || raw.startsWith("/api/")) {
    return raw;
  }

  const params = new URLSearchParams({ path: raw });
  if (download) {
    params.set("download", "1");
  }
  return `/api/file?${params.toString()}`;
}

function fileNameFromTarget(target: string): string {
  const trimmed = target.trim();
  try {
    if (/^https?:\/\//i.test(trimmed)) {
      return new URL(trimmed).pathname.split("/").filter(Boolean).pop() ?? trimmed;
    }
  } catch {
    return trimmed;
  }

  return trimmed.split(/[\\/]/).filter(Boolean).pop() ?? trimmed;
}

function detectResourceKind(target: string): ResourceKind | null {
  const name = fileNameFromTarget(target).toLowerCase();
  if (/\.(png|jpe?g|gif|webp|svg)$/i.test(name)) {
    return "image";
  }
  if (/\.pdf$/i.test(name)) {
    return "pdf";
  }
  if (/\.(md|txt|json|csv|yml|yaml|log|patch|diff|zip|tar|gz|tgz)$/i.test(name)) {
    return "file";
  }
  if (/^(\/Users\/|\/private\/|\/var\/|\/tmp\/|\.{1,2}\/)/.test(target.trim())) {
    return "file";
  }
  return null;
}

function extensionBadge(target: string): string {
  const match = fileNameFromTarget(target).match(/\.([a-z0-9]+)$/i);
  return match ? match[1].slice(0, 4) : "file";
}

type ResourceTokenProps = {
  kind: ResourceKind;
  target: string;
  label: string;
  onPreview: (viewer: ViewerState) => void;
  inline?: boolean;
};

function ResourceToken({ kind, target, label, onPreview, inline = false }: ResourceTokenProps) {
  const inlineHref = escapePathTarget(target);
  const href = kind === "file" ? escapePathTarget(target, true) : inlineHref;
  const title = label || fileNameFromTarget(target);

  if (inline) {
    return (
      <a
        className="underline decoration-stone-600 underline-offset-4 transition hover:text-stone-100"
        href={href}
        rel="noreferrer noopener"
        target="_blank"
      >
        {label || title}
      </a>
    );
  }

  return (
    <article className="overflow-hidden rounded-[1.75rem] border border-white/8 bg-white/[0.03] shadow-[0_20px_48px_rgba(0,0,0,0.22)]">
      <header className="flex flex-col gap-3 border-b border-white/8 bg-white/[0.025] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <span className="inline-flex h-6 items-center rounded-full border border-white/10 bg-white/[0.04] px-2.5 font-[var(--font-mono)] text-[0.68rem] uppercase tracking-[0.18em] text-stone-300">
            {kind}
          </span>
          <p className="truncate text-sm font-medium text-stone-100">{title}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="secondary">
            <a href={href} rel="noreferrer noopener" target="_blank">
              <ArrowUpRight className="h-4 w-4" />
              Open
            </a>
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              onPreview({
                kind,
                title,
                src: kind === "file" ? href : inlineHref,
              })
            }
          >
            <Expand className="h-4 w-4" />
            Full
          </Button>
        </div>
      </header>
      {kind === "image" ? (
        <div className="p-3">
          <img
            alt={title}
            className="block max-h-[34rem] w-full rounded-[1.35rem] bg-black/25 object-contain"
            loading="lazy"
            src={inlineHref}
          />
        </div>
      ) : null}
      {kind === "pdf" ? (
        <div className="p-3">
          <iframe className="block min-h-[32rem] w-full rounded-[1.35rem] bg-[#111]" src={inlineHref} title={title} />
        </div>
      ) : null}
      {kind === "file" ? (
        <div className="flex items-center gap-4 p-4">
          <div className="grid h-12 w-12 place-items-center rounded-[1.15rem] border border-white/8 bg-white/[0.05] font-[var(--font-mono)] text-xs uppercase tracking-[0.18em] text-stone-300">
            {extensionBadge(target)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-stone-100">{title}</p>
            <p className="truncate text-xs text-stone-400">{fileNameFromTarget(target)}</p>
          </div>
        </div>
      ) : null}
    </article>
  );
}

function isResourceTokenElement(
  child: unknown,
): child is React.ReactElement<ResourceTokenProps, typeof ResourceToken> {
  return isValidElement(child) && child.type === ResourceToken;
}

function MarkdownMessage({
  text,
  onPreview,
}: {
  text: string;
  onPreview: (viewer: ViewerState) => void;
}) {
  return (
    <div className="markdown-body grid gap-4 text-[1.06rem] leading-8 text-stone-100">
      <ReactMarkdown
        rehypePlugins={[rehypeKatex, rehypeHighlight]}
        remarkPlugins={[remarkGfm, remarkMath]}
        components={{
          h1: ({ className, ...props }) => <h1 className={cn("font-[var(--font-display)] text-5xl leading-none tracking-tight", className)} {...props} />,
          h2: ({ className, ...props }) => <h2 className={cn("font-[var(--font-display)] text-4xl leading-none tracking-tight", className)} {...props} />,
          h3: ({ className, ...props }) => <h3 className={cn("font-[var(--font-display)] text-2xl leading-tight", className)} {...props} />,
          p: ({ children }) => {
            const childNodes = Children.toArray(children);
            if (childNodes.length === 1 && isResourceTokenElement(childNodes[0])) {
              return cloneElement(childNodes[0], { inline: false });
            }

            return (
              <p className="text-[1.06rem] leading-8 text-stone-100">
                {childNodes.map((child, index) =>
                  isResourceTokenElement(child) ? cloneElement(child, { inline: true, key: `resource-${index}` }) : child,
                )}
              </p>
            );
          },
          ul: ({ className, ...props }) => <ul className={cn("grid gap-2 pl-6", className)} {...props} />,
          ol: ({ className, ...props }) => <ol className={cn("grid gap-2 pl-6", className)} {...props} />,
          li: ({ className, ...props }) => <li className={cn("pl-1 text-[1.02rem] leading-8 text-stone-100 marker:text-stone-500", className)} {...props} />,
          blockquote: ({ className, ...props }) => (
            <blockquote
              className={cn(
                "rounded-r-[1.5rem] border-l-2 border-stone-500/30 bg-white/[0.03] px-5 py-4 text-stone-300",
                className,
              )}
              {...props}
            />
          ),
          a: ({ href, children }) => {
            const target = href ?? "";
            const kind = detectResourceKind(target);
            if (kind) {
              return (
                <ResourceToken kind={kind} label={String(children)} onPreview={onPreview} target={target} />
              );
            }

            return (
              <a
                className="underline decoration-stone-600 underline-offset-4 transition hover:text-stone-100"
                href={target}
                rel="noreferrer noopener"
                target="_blank"
              >
                {children}
              </a>
            );
          },
          img: ({ src, alt }) => {
            const target = src ?? "";
            return <ResourceToken kind="image" label={alt ?? fileNameFromTarget(target)} onPreview={onPreview} target={target} />;
          },
          code: ({ className, children, ...props }) => {
            const language = className?.replace("language-", "") || "text";
            const isInline = !className;
            if (isInline) {
              return (
                <code className="rounded-full border border-white/10 bg-white/[0.05] px-2 py-1 font-[var(--font-mono)] text-[0.9em]" {...props}>
                  {children}
                </code>
              );
            }

            return (
              <div className="overflow-hidden rounded-[1.75rem] border border-white/8 bg-[#0e0e0e] shadow-[0_20px_48px_rgba(0,0,0,0.24)]">
                <div className="flex items-center justify-between border-b border-white/8 bg-white/[0.04] px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-stone-400/60 shadow-[14px_0_0_rgba(255,255,255,0.18),28px_0_0_rgba(255,255,255,0.1)]" />
                    <span className="pl-8 font-[var(--font-mono)] text-xs uppercase tracking-[0.18em] text-stone-400">{language}</span>
                  </div>
                  <CodeCopyButton code={String(children).replace(/\n$/, "")} />
                </div>
                <pre className="overflow-x-auto p-0">
                  <code className={cn(className, "block bg-transparent px-5 py-4 font-[var(--font-mono)] text-sm leading-7 text-stone-100")} {...props}>
                    {children}
                  </code>
                </pre>
              </div>
            );
          },
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

function CodeCopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <Button size="sm" variant="secondary" onClick={() => void handleCopy()}>
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

function ThinkingVisor() {
  return (
    <div aria-live="polite" className="visor-thinking" role="status">
      <span className="visor-thinking__label">Pluto thinking</span>
    </div>
  );
}

function commandPreview(command: CommandRecord): string {
  if (command.type !== "process.run") {
    return command.type;
  }

  const args = Array.isArray(command.payload.args)
    ? command.payload.args.filter((value): value is string => typeof value === "string")
    : [];
  if (args[0] === "-lc" && args[1]) {
    return args[1];
  }

  const commandName = typeof command.payload.command === "string" ? command.payload.command : "command";
  return [commandName, ...args].join(" ").trim();
}

function getToolSummary(command: CommandRecord) {
  if (command.type === "process.run") {
    return command.status === "completed" ? "Ran command" : "Run command";
  }
  
  if (command.type === "workspace.read_file") {
    const path = typeof command.payload.path === "string" ? command.payload.path : "file";
    return (
      <>
        Read <code className="text-stone-300 font-mono bg-white/[0.05] px-1 py-0.5 rounded text-[0.7rem]">{fileNameFromTarget(path)}</code>
      </>
    );
  }
  
  if (command.type === "workspace.write_file") {
    const path = typeof command.payload.path === "string" ? command.payload.path : "file";
    return (
      <>
        Wrote to <code className="text-stone-300 font-mono bg-white/[0.05] px-1 py-0.5 rounded text-[0.7rem]">{fileNameFromTarget(path)}</code>
      </>
    );
  }

  return `Use tool ${command.type}`;
}

function ToolCallCard({ command }: { command: CommandRecord }) {
  const output = `${command.stdout ?? ""}${command.stderr ?? ""}`.trim();
  const isPending = command.status === "pending_approval";
  const isRunning = command.status === "running" || command.status === "queued";
  const isFailed = command.status === "failed" || command.status === "cancelled";
  const isSuccess = command.status === "completed";

  const [isOpen, setIsOpen] = useState(!isSuccess);

  useEffect(() => {
    if (isSuccess && !command.error) {
      setIsOpen(false);
    }
  }, [isSuccess, command.error]);

  const textColorClass = 
    isFailed ? "text-red-400 group-hover:text-red-300" :
    isPending ? "text-amber-500/90 group-hover:text-amber-400" :
    isRunning ? "text-sky-400/90 group-hover:text-sky-300" :
    "text-stone-400 group-hover:text-stone-300";

  return (
    <div className="tool-audit group">
      <div 
        className={cn(
          "tool-audit__header cursor-pointer hover:bg-white/[0.04] rounded-md py-1 -ml-1.5 px-1.5 transition-colors"
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-1.5">
          <ChevronRight className={cn("h-3.5 w-3.5 shrink-0 text-stone-500 transition-all duration-200 opacity-0 group-hover:opacity-100", isOpen && "rotate-90 opacity-100")} />
        </div>
        
        <div className={cn("tool-audit__summary transition-colors text-[0.8rem]", textColorClass)}>
          {getToolSummary(command)}
        </div>
      </div>

      {isOpen && (
        <div className="tool-audit__content ml-[21px] mt-1.5 grid gap-1.5">
          <div className="font-mono text-[0.7rem] text-stone-500 bg-white/[0.02] border border-white/5 rounded-md px-2.5 py-1.5 break-words">
            <span className="select-none text-stone-600 mr-2">$</span>
            {commandPreview(command)}
          </div>
          {output && (
            <div className="tool-audit__output mt-0 border-l border-white/10 ml-1">
              <pre>{output}</pre>
            </div>
          )}
          
          {command.error && (
            <div className="tool-audit__error mt-0">
              {command.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PermissionsBar({
  permissionMode,
  pendingCommand,
  onChangeMode,
  onApprove,
  onReject,
}: {
  permissionMode: AppState["permissionMode"];
  pendingCommand?: CommandRecord;
  onChangeMode: (mode: AppState["permissionMode"]) => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <Select onValueChange={(value) => onChangeMode(value as AppState["permissionMode"])} value={permissionMode}>
          <SelectTrigger aria-label="Permission mode" className="w-fit min-w-[200px] h-8 justify-between gap-3 rounded-full border border-white/10 bg-[#2a2a2a] px-4 py-1.5 text-xs font-medium text-stone-300 hover:bg-[#333333] hover:text-stone-200 transition-colors shadow-none ring-0 focus:ring-0 focus:ring-offset-0">
            <span className="flex items-center gap-2">
              {permissionMode === "full-access" ? <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-amber-400" /> : <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-stone-400" />}
              <span>{permissionMode === "full-access" ? "Full Access" : "Default Permissions"}</span>
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">
              <span className="inline-flex w-full items-center gap-2 pr-6">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-stone-400" />
                <span className="text-xs">Default permissions</span>
              </span>
            </SelectItem>
            <SelectItem value="full-access">
              <span className="inline-flex w-full items-center gap-2 pr-6">
                <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                <span className="text-xs">Full access</span>
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {pendingCommand ? (
        <div className="flex items-center gap-3 rounded-md bg-[#2a2a2a] border border-amber-500/20 px-3 py-1.5 shadow-sm">
          <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-amber-500/80" />
          
          <div className="min-w-0 flex-1 truncate font-[var(--font-mono)] text-[0.75rem] text-amber-200/90">
            <span className="mr-2 select-none text-amber-500/50">$</span>
            {commandPreview(pendingCommand)}
          </div>

          <div className="flex items-center gap-3">
            <button className="text-[0.65rem] font-bold uppercase tracking-widest text-stone-400 hover:text-stone-200 transition-colors" onClick={onReject} type="button">
              Deny
            </button>
            <button className="text-[0.65rem] font-bold uppercase tracking-widest text-amber-500 hover:text-amber-400 transition-colors" onClick={onApprove} type="button">
              Allow
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function App() {
  const bootstrap = window.__PLUTO_BOOTSTRAP__;
  const [state, setState] = useState<AppState | null>(bootstrap?.state ?? null);
  const [runtime, setRuntime] = useState<RuntimeState | null>(bootstrap?.runtime ?? null);
  const [composer, setComposer] = useState("");
  const [status, setStatus] = useState("");
  const [viewer, setViewer] = useState<ViewerState | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const messageList = useMemo(() => state?.messages ?? [], [state?.messages]);
  const latestMessageSignature = useMemo(() => {
    const lastMessage = messageList[messageList.length - 1];
    return lastMessage ? `${lastMessage.id}:${lastMessage.text}` : "empty";
  }, [messageList]);

  const loadState = useEffectEvent(async () => {
    const response = await fetch("/api/state");
    const nextState = (await response.json()) as AppState;
    startTransition(() => {
      setState(nextState);
    });
  });

  const loadRuntime = useEffectEvent(async () => {
    const response = await fetch("/api/runtime");
    const nextRuntime = (await response.json()) as RuntimeState;
    startTransition(() => {
      setRuntime(nextRuntime);
    });
  });

  useEffect(() => {
    void Promise.all([loadState(), loadRuntime()]).catch((error: unknown) => {
      setStatus(error instanceof Error ? error.message : "Failed to load Pluto.");
    });

    const interval = window.setInterval(() => {
      void loadState();
      void loadRuntime();
    }, 1200);

    return () => window.clearInterval(interval);
  }, [loadRuntime, loadState]);

  useEffect(() => {
    const source = new EventSource("/api/events");

    const handleMessageCreated = (rawEvent: Event) => {
      const event = rawEvent as MessageEvent<string>;
      const payload = JSON.parse(event.data) as { data: MessageEventPayload };
      const nextMessage = payload.data;
      startTransition(() => {
        setState((current) => {
          if (!current) {
            return current;
          }

          if (current.messages.some((message) => message.id === nextMessage.messageId)) {
            return current;
          }

          return {
            ...current,
            messages: [
              ...current.messages,
              {
                id: nextMessage.messageId,
                role: nextMessage.role,
                text: nextMessage.text,
                createdAt: nextMessage.createdAt ?? new Date().toISOString(),
                runId: nextMessage.runId,
              },
            ],
          };
        });
      });
    };

    const handleMessageUpdated = (rawEvent: Event) => {
      const event = rawEvent as MessageEvent<string>;
      const payload = JSON.parse(event.data) as { data: MessageEventPayload };
      const nextMessage = payload.data;
      startTransition(() => {
        setState((current) => {
          if (!current) {
            return current;
          }

          const exists = current.messages.some((message) => message.id === nextMessage.messageId);
          return {
            ...current,
            messages: exists
              ? current.messages.map((message) =>
                  message.id === nextMessage.messageId
                    ? {
                        ...message,
                        text: nextMessage.text,
                      }
                    : message,
                )
              : [
                  ...current.messages,
                  {
                    id: nextMessage.messageId,
                    role: nextMessage.role,
                    text: nextMessage.text,
                    createdAt: nextMessage.createdAt ?? new Date().toISOString(),
                    runId: nextMessage.runId,
                  },
                ],
          };
        });
      });
    };

    const handleCommandStatus = (rawEvent: Event) => {
      const event = rawEvent as MessageEvent<string>;
      const payload = JSON.parse(event.data) as { data: CommandStatusEventPayload };
      const nextCommand = payload.data;

      startTransition(() => {
        setState((current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,
            commands: current.commands.map((command) =>
              command.id === nextCommand.commandId
                ? {
                    ...command,
                    status: nextCommand.status,
                    error: nextCommand.error ?? command.error,
                  }
                : command,
            ),
          };
        });
      });
    };

    const handleCommandOutput = (rawEvent: Event) => {
      const event = rawEvent as MessageEvent<string>;
      const payload = JSON.parse(event.data) as { data: CommandOutputEventPayload };
      const nextOutput = payload.data;

      startTransition(() => {
        setState((current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,
            commands: current.commands.map((command) =>
              command.id === nextOutput.commandId
                ? {
                    ...command,
                    status: nextOutput.status,
                    stdout: nextOutput.stdout,
                    stderr: nextOutput.stderr,
                  }
                : command,
            ),
          };
        });
      });
    };

    source.addEventListener("message.created", handleMessageCreated);
    source.addEventListener("message.updated", handleMessageUpdated);
    source.addEventListener("command.status.updated", handleCommandStatus);
    source.addEventListener("command.output", handleCommandOutput);

    return () => {
      source.removeEventListener("message.created", handleMessageCreated);
      source.removeEventListener("message.updated", handleMessageUpdated);
      source.removeEventListener("command.status.updated", handleCommandStatus);
      source.removeEventListener("command.output", handleCommandOutput);
      source.close();
    };
  }, []);

  useEffect(() => {
    const node = textareaRef.current;
    if (!node) {
      return;
    }

    node.style.height = "auto";
    node.style.height = `${Math.min(node.scrollHeight, 220)}px`;
  }, [composer]);

  useEffect(() => {
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: document.documentElement.scrollHeight });
    });
  }, [latestMessageSignature]);

  const models = runtime?.availableModels ?? [];
  const hasMessages = (state?.messages.length ?? 0) > 0;
  const accountConnected = Boolean(runtime?.account);
  const runCommandMap = useMemo(
    () =>
      (state?.commands ?? []).reduce((map, command) => {
        const existing = map.get(command.runId);
        if (existing) {
          existing.push(command);
        } else {
          map.set(command.runId, [command]);
        }
        return map;
      }, new Map<string, CommandRecord[]>()),
    [state?.commands],
  );
  const runByMessageId = useMemo(
    () =>
      new Map(
        (state?.runs ?? []).map((run) => [run.messageId, run] as const),
      ),
    [state?.runs],
  );
  const pendingApprovalCommand = useMemo(
    () => (state?.commands ?? []).find((command) => command.status === "pending_approval"),
    [state?.commands],
  );

  function shouldHideAssistantMessage(message: MessageRecord): boolean {
    if (!message.runId) {
      return false;
    }

    const command = runCommandMap.get(message.runId);
    const latestCommand = command?.at(-1);
    if (!latestCommand || latestCommand.type !== "process.run") {
      return false;
    }

    const trimmed = message.text.trim();
    if (!trimmed) {
      return false;
    }

    if (trimmed.startsWith("Running a shell command") || trimmed.startsWith("Awaiting permission to run command")) {
      return true;
    }

    const output = `${latestCommand.stdout ?? ""}${latestCommand.stderr ?? ""}`.trim();
    if (output && trimmed === output) {
      return true;
    }

    if (latestCommand.error && (trimmed === latestCommand.error.trim() || trimmed.endsWith(latestCommand.error.trim()))) {
      return true;
    }

    return false;
  }

  async function handleSubmit(event?: React.FormEvent) {
    event?.preventDefault();
    const text = composer.trim();
    if (!text) {
      return;
    }

    setStatus("");
    setComposer("");
    const response = await fetch("/api/messages", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const body = await response.json();
    if (!response.ok && response.status !== 202) {
      setStatus(body.error || "Pluto could not send that message.");
      setComposer(text);
      return;
    }

    if (response.status === 202) {
      startTransition(() => {
        setState(body as AppState);
      });
    }
  }

  async function handleModelChange(model: string) {
    const response = await fetch("/api/runtime/model", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model }),
    });
    const body = await response.json();
    if (!response.ok) {
      setStatus(body.error || "Model switch failed.");
      return;
    }

    setStatus("Model updated.");
    await loadRuntime();
  }

  async function handlePermissionModeChange(permissionMode: AppState["permissionMode"]) {
    const response = await fetch("/api/runtime/permissions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ permissionMode }),
    });
    const body = await response.json();
    if (!response.ok) {
      setStatus(body.error || "Permission mode update failed.");
      return;
    }

    startTransition(() => {
      setState(body as AppState);
    });
    setStatus(permissionMode === "full-access" ? "Full access enabled." : "Default permissions enabled.");
  }

  async function handleApproveCommand(commandId: string) {
    const response = await fetch(`/api/commands/${encodeURIComponent(commandId)}/approve`, {
      method: "POST",
    });
    const body = await response.json();
    if (!response.ok) {
      setStatus(body.error || "Could not approve command.");
      return;
    }

    startTransition(() => {
      setState(body as AppState);
    });
    setStatus("Command approved.");
  }

  async function handleRejectCommand(commandId: string) {
    const response = await fetch(`/api/commands/${encodeURIComponent(commandId)}/reject`, {
      method: "POST",
    });
    const body = await response.json();
    if (!response.ok) {
      setStatus(body.error || "Could not reject command.");
      return;
    }

    startTransition(() => {
      setState(body as AppState);
    });
    setStatus("Command denied.");
  }

  function handleLeadingAction() {
    setStatus("Attachments are not wired yet.");
    textareaRef.current?.focus();
  }

  function handleMicAction() {
    if (composer.trim().length > 0) {
      setComposer("");
      setStatus("Draft cleared.");
      return;
    }

    setStatus("Voice input is not wired yet.");
    textareaRef.current?.focus();
  }

  return (
    <>
      <main className="mx-auto flex min-h-screen w-full max-w-[920px] flex-col gap-4 px-4 py-[18px]">
        <header className="flex min-h-14 items-center justify-between gap-4">
          <div className="min-w-[138px]" />
          <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.03] px-4 py-3 shadow-[0_14px_40px_rgba(0,0,0,0.18)]">
            <div className="grid h-9 w-9 place-items-center rounded-full border border-white/6 bg-white/[0.05]">
              <Orbit className="h-4.5 w-4.5 text-stone-200" />
            </div>
            <div className="grid gap-0.5">
              <strong className="font-[var(--font-mono)] text-sm font-semibold tracking-[0.14em] text-stone-200 lowercase">pluto</strong>
              <span className="font-[var(--font-mono)] text-[0.72rem] text-stone-500">single conversation</span>
            </div>
          </div>
          <div className="flex min-w-[138px] items-center justify-end gap-2">
            <Select onValueChange={(value) => void handleModelChange(value)} value={runtime?.model ?? undefined}>
              <SelectTrigger aria-label="Select model">
                <SelectValue placeholder="model" />
              </SelectTrigger>
              <SelectContent>
                {models.map((model) => (
                  <SelectItem key={model} value={model}>
                    {model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button asChild size="sm" variant="secondary">
              <a href="/admin">
                <PanelsTopLeft className="h-4 w-4" />
                Admin
              </a>
            </Button>
          </div>
        </header>

        <section className="flex-1">
          {!hasMessages ? (
            <section className="grid min-h-[calc(100vh-15rem)] place-items-center px-4 pb-[14vh] text-center">
              <div className="grid max-w-[34rem] gap-5">
                <div className="mx-auto grid h-[72px] w-[72px] place-items-center rounded-full border border-white/10 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.1),transparent_34%),radial-gradient(circle_at_70%_70%,rgba(255,255,255,0.06),transparent_28%),rgba(255,255,255,0.02)] shadow-[0_20px_48px_rgba(0,0,0,0.22)]">
                  <Orbit className="h-7 w-7 text-stone-100" />
                </div>
                <div className="grid gap-4">
                  <h1 className="font-[var(--font-display)] text-[clamp(2.3rem,4.2vw,3.8rem)] font-semibold leading-[1.02] tracking-[-0.05em] text-stone-100">
                    One assistant. One chat.
                  </h1>
                  <p className="mx-auto max-w-[34rem] text-[0.98rem] leading-7 text-stone-400">
                    All state, routing, and execution live in the backend. This surface stays focused on the conversation.
                  </p>
                </div>
              </div>
            </section>
          ) : (
            <div className="grid gap-6 px-0 pb-40 pt-2">
              {messageList.map((message) => (
                <div key={message.id} className="grid gap-2">
                  <article className={cn("grid gap-2", message.role === "user" && "justify-items-end")}>
                    {message.role === "assistant" ? (
                      shouldHideAssistantMessage(message) ? null : (
                      <div className="max-w-[760px] pl-2">
                        {message.runId
                        && message.text.startsWith("Running a shell command")
                        && runCommandMap.get(message.runId)?.at(-1)?.type === "process.run" ? (
                          <ToolCallCard command={runCommandMap.get(message.runId)!.at(-1)!} />
                        ) : message.text.trim() ? (
                          <MarkdownMessage onPreview={setViewer} text={message.text} />
                        ) : (
                          <ThinkingVisor />
                        )}
                      </div>
                      )
                    ) : (
                      <div className="grid w-full max-w-[760px] gap-2 justify-items-end">
                        <span className="grid h-9 w-9 place-items-center rounded-full border border-[#4b5563]/40 bg-[#2c3442] text-[#d7deeb] shadow-[0_10px_24px_rgba(0,0,0,0.18)]">
                          <UserRound className="h-4.5 w-4.5" />
                        </span>
                        <div className="w-full rounded-[2rem] border border-[#4f6184]/28 bg-[linear-gradient(180deg,#2d3747_0%,#253040_100%)] px-5 py-4 text-[#eef3fb] shadow-[0_24px_60px_rgba(0,0,0,0.18)]">
                          <p className="text-[1.03rem] leading-8">{message.text}</p>
                        </div>
                      </div>
                    )}
                  </article>
                  
                  {message.role === "user" && (() => {
                    const run = runByMessageId.get(message.id);
                    const commands = run ? runCommandMap.get(run.id) : undefined;
                    const runCommands = commands?.filter((command) => command.type === "process.run");
                    return runCommands?.length ? (
                      <div className="max-w-[760px] pl-2 grid gap-1 text-left w-full mt-1">
                        {runCommands.map((command) => (
                          <ToolCallCard command={command} key={command.id} />
                        ))}
                      </div>
                    ) : null;
                  })()}
                </div>
              ))}
            </div>
          )}
        </section>

        <footer className="fixed bottom-0 left-0 right-0 z-20 w-full bg-[#111111]">
          <div className="absolute inset-0 -top-12 bottom-full bg-gradient-to-t from-[#111111] to-transparent pointer-events-none" />
          <div className="relative mx-auto w-full max-w-[760px] px-4 sm:px-0 pb-6 pt-2">
            <form className="grid gap-4" onSubmit={(event) => void handleSubmit(event)}>
              <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-full border border-white/8 bg-[#303030]/96 px-[12px] py-[12px] shadow-[0_4px_80px_rgba(0,0,0,0.05)] backdrop-blur-xl">
                <button
                  aria-label="Attachments"
                  className="grid h-9 w-9 place-items-center rounded-full border border-white/6 bg-white/[0.03] text-stone-400 transition hover:text-stone-200"
                  onClick={handleLeadingAction}
                  type="button"
                >
                  <Plus className="h-4.5 w-4.5" />
                </button>
                <textarea
                  className="max-h-56 min-h-6 w-full resize-none bg-transparent px-0 py-0 text-[1.02rem] leading-7 text-stone-100 outline-none placeholder:text-stone-500"
                  onChange={(event) => setComposer(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void handleSubmit();
                    }
                  }}
                  placeholder="Ask Pluto"
                  ref={textareaRef}
                  rows={1}
                  value={composer}
                />
                <div className="flex items-center gap-2">
                  <button
                    aria-label={composer.trim().length > 0 ? "Clear draft" : "Voice input"}
                    className="grid h-9 w-9 place-items-center rounded-full border border-white/8 bg-white/[0.03] text-stone-400 transition hover:text-stone-200"
                    onClick={handleMicAction}
                    type="button"
                  >
                    <Mic className="h-4.5 w-4.5" />
                  </button>
                  <Button className="h-9 w-9 rounded-full bg-[#0169cc] text-white hover:bg-[#0b74da]" size="icon" type="submit">
                    <ArrowUpRight className="h-4.5 w-4.5" />
                  </Button>
                </div>
              </div>
              {status || !accountConnected ? (
                <div className={cn("flex min-h-4 items-center justify-center gap-2 text-center text-xs", status ? "text-stone-300" : "text-stone-500")}>
                  <Sparkles className="h-3.5 w-3.5 opacity-70" />
                  {status || "Open Admin to connect ChatGPT."}
                </div>
              ) : null}
              {state ? (
                <PermissionsBar
                  onApprove={() => pendingApprovalCommand && void handleApproveCommand(pendingApprovalCommand.id)}
                  onChangeMode={(mode) => void handlePermissionModeChange(mode)}
                  onReject={() => pendingApprovalCommand && void handleRejectCommand(pendingApprovalCommand.id)}
                  pendingCommand={pendingApprovalCommand}
                  permissionMode={state.permissionMode}
                />
              ) : null}
            </form>
          </div>
        </footer>
      </main>

      <Dialog onOpenChange={(open) => !open && setViewer(null)} open={Boolean(viewer)}>
        <DialogContent className="h-[min(84vh,900px)] p-0">
          <DialogHeader className="pr-16">
            <span className="inline-flex h-6 w-fit items-center rounded-full border border-white/10 bg-white/[0.04] px-2.5 font-[var(--font-mono)] text-[0.68rem] uppercase tracking-[0.18em] text-stone-300">
              {viewer?.kind}
            </span>
            <DialogTitle>{viewer?.title}</DialogTitle>
            <DialogDescription>Fullscreen preview for the selected embed.</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 p-4">
            {viewer?.kind === "image" ? (
              <img
                alt={viewer.title}
                className="block h-full max-h-[calc(84vh-8rem)] w-full rounded-[1.6rem] bg-[#111] object-contain"
                src={viewer.src}
              />
            ) : null}
            {viewer?.kind === "pdf" || viewer?.kind === "file" ? (
              <iframe
                className="block h-[calc(84vh-8rem)] w-full rounded-[1.6rem] bg-[#111]"
                src={viewer?.src}
                title={viewer?.title}
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
