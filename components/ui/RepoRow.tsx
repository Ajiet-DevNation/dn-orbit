import { Play, Star, GitFork, ExternalLink } from "lucide-react";
import { ArchiveBadge } from "@/components/ui/ArchiveBadge";
import type { RepoData } from "@/types";

interface RepoRowProps {
  repo: RepoData;
}

/**
 * RepoRow — Single repository list row.
 * Horizontal layout: play icon → name + description → status badge → stats → link icon.
 * Dashed bottom border for separation. Zero radius everywhere.
 */
export function RepoRow({ repo }: RepoRowProps) {
  return (
    <div className="flex items-center gap-4 border border-dashed border-border bg-surface px-4 py-3 transition-colors hover:bg-surface-2">
      {/* Play icon */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-dashed border-border">
        <Play className="h-3 w-3 text-text-muted" />
      </div>

      {/* Repo info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          <span className="font-heading text-sm uppercase tracking-wide text-white">
            {repo.name}
          </span>
          <ArchiveBadge label={repo.status} variant={repo.status} />
        </div>
        {repo.description && (
          <p className="mt-0.5 truncate font-mono text-[11px] text-text-muted">
            {repo.description}
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="flex shrink-0 items-center gap-4 font-mono text-[11px] text-text-muted">
        <span className="flex items-center gap-1">
          <Star className="h-3 w-3" />
          {repo.stars}
        </span>
        <span className="flex items-center gap-1">
          <GitFork className="h-3 w-3" />
          {repo.forks}
        </span>
      </div>

      {/* External link */}
      <ExternalLink className="h-4 w-4 shrink-0 text-text-muted" />
    </div>
  );
}
