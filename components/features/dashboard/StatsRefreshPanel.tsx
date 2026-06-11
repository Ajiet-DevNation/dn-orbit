"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Loader2, RotateCw } from "lucide-react";

type RefreshProvider = "github" | "lc";

type ProviderResult = {
  provider: RefreshProvider;
  ok: boolean;
  detail: string;
};

type RefreshState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; message: string; results: ProviderResult[] }
  | { kind: "partial"; message: string; results: ProviderResult[] }
  | { kind: "error"; message: string; results: ProviderResult[] };

export function StatsRefreshPanel({
  userId,
  hasLeetCodeUsername,
  hasGitHubAccessToken,
  statsStale,
}: {
  userId: string;
  hasLeetCodeUsername: boolean;
  hasGitHubAccessToken: boolean;
  statsStale: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState<RefreshState>({ kind: "idle" });

  const canRefreshAny = hasGitHubAccessToken || hasLeetCodeUsername;

  const statusLine = useMemo(() => {
    if (state.kind === "loading") {
      return {
        tone: "text-zinc-400",
        label: "CONTACTING_UPSTREAM_PROVIDERS",
      };
    }

    if (state.kind === "success") {
      return {
        tone: "text-emerald-400",
        label: state.message,
      };
    }

    if (state.kind === "partial") {
      return {
        tone: "text-yellow-400",
        label: state.message,
      };
    }

    if (state.kind === "error") {
      return {
        tone: "text-red-400",
        label: state.message,
      };
    }

    if (statsStale) {
      return {
        tone: "text-zinc-500",
        label: "CACHE_WINDOW_EXPIRED__MANUAL_REFRESH_AVAILABLE",
      };
    }

    return {
      tone: "text-zinc-600",
      label: "CACHE_WITHIN_24H_WINDOW",
    };
  }, [state, statsStale]);

  async function refreshProvider(provider: RefreshProvider): Promise<ProviderResult> {
    const response = await fetch(`/api/stats/${provider}/${userId}`, {
      method: "GET",
      cache: "no-store",
    });

    const payload = (await response.json().catch(() => null)) as
      | { error?: string; source?: string }
      | null;

    if (!response.ok) {
      return {
        provider,
        ok: false,
        detail: payload?.error ?? `HTTP_${response.status}`,
      };
    }

    return {
      provider,
      ok: true,
      detail:
        payload?.source === "fresh"
          ? "REFETCHED"
          : payload?.source === "cache"
            ? "CACHE_CURRENT"
            : "UPDATED",
    };
  }

  async function handleRefresh() {
    if (!canRefreshAny) {
      setState({
        kind: "error",
        message: "NO_REFRESHABLE_STATS_SOURCE_CONFIGURED",
        results: [],
      });
      return;
    }

    setState({ kind: "loading" });

    const tasks: Promise<ProviderResult>[] = [];

    if (hasGitHubAccessToken) {
      tasks.push(refreshProvider("github"));
    } else {
      tasks.push(
        Promise.resolve({
          provider: "github" as const,
          ok: false,
          detail: "SESSION_TOKEN_MISSING",
        })
      );
    }

    if (hasLeetCodeUsername) {
      tasks.push(refreshProvider("lc"));
    }

    const results = await Promise.all(tasks);
    const succeeded = results.filter((result) => result.ok);
    const failed = results.filter((result) => !result.ok);

    if (succeeded.length > 0) {
      router.refresh();
    }

    if (failed.length === 0) {
      setState({
        kind: "success",
        message: "STATS_SYNC_COMPLETE",
        results,
      });
      return;
    }

    if (succeeded.length > 0) {
      setState({
        kind: "partial",
        message: "PARTIAL_SYNC_COMPLETE__CHECK_PROVIDER_LOG",
        results,
      });
      return;
    }

    setState({
      kind: "error",
      message: "STATS_REFRESH_FAILED",
      results,
    });
  }

  return (
    <div className="space-y-3 border border-zinc-900 bg-zinc-950/40 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <div className="text-[9px] text-zinc-600 tracking-widest uppercase">
            STATS_CONTROL
          </div>
          <div className={`text-[10px] tracking-widest uppercase ${statusLine.tone}`}>
            {statusLine.label}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={state.kind === "loading" || !canRefreshAny}
            className="inline-flex items-center justify-center gap-2 border border-zinc-800 bg-black px-4 py-2 text-[10px] font-black tracking-[0.25em] uppercase text-white transition-colors hover:border-white hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:border-zinc-900 disabled:bg-zinc-950 disabled:text-zinc-600"
          >
            {state.kind === "loading" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RotateCw className="h-3.5 w-3.5" />
            )}
            REFRESH_STATS
          </button>

          {!hasLeetCodeUsername && (
            <Link
              href="/onboarding"
              className="text-[10px] text-zinc-500 hover:text-white tracking-widest uppercase border-b border-zinc-700 hover:border-white transition-colors"
            >
              &gt; SET_LEETCODE_USERNAME
            </Link>
          )}
        </div>
      </div>

      {state.kind !== "idle" && state.kind !== "loading" && state.results.length > 0 && (
        <div className="grid gap-2 md:grid-cols-2">
          {state.results.map((result) => (
            <div
              key={result.provider}
              className="flex items-center justify-between border border-zinc-900 px-3 py-2"
            >
              <span className="text-[9px] text-zinc-500 tracking-widest uppercase">
                {result.provider === "github" ? "GITHUB_PIPELINE" : "LEETCODE_PIPELINE"}
              </span>
              <span
                className={`text-[9px] tracking-widest uppercase ${
                  result.ok ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {result.detail}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
