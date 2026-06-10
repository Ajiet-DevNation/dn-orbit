// components/ui/LeaderBoards.tsx
import { Trophy, Code2 } from "lucide-react";

export interface LeaderboardEntry {
  id: string;
  rank: number;
  name: string;
  usn: string;
  githubScore: number;
  lcScore: number;
  totalScore: number;
}

interface LeaderBoardsProps {
  entries: LeaderboardEntry[];
}

// Fallback GitHub SVG to bypass the lucide-react export error
const GithubIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.2c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

/**
 * LeaderBoards — Tactical data grid for ranking operatives.
 * Features a dashed-border grid system with monospaced data alignment.
 */
export function LeaderBoards({ entries }: LeaderBoardsProps) {
  return (
    <div className="w-full border border-dashed border-border bg-black text-white">
      {/* Header Panel */}
      <div className="flex items-center gap-3 border-b border-dashed border-border bg-surface px-6 py-4">
        <div className="flex h-6 w-6 items-center justify-center border border-dashed border-border bg-black">
          <Trophy className="h-3 w-3 text-white" />
        </div>
        <h2 className="font-heading text-lg uppercase tracking-widest text-white">
          Global Leaderboard
        </h2>
      </div>

      {/* Table Column Headers (Hidden on Mobile) */}
      <div className="hidden grid-cols-12 gap-4 border-b border-dashed border-border bg-surface-2 px-6 py-2 font-mono text-[10px] uppercase tracking-widest text-text-muted md:grid">
        <div className="col-span-1 text-center">RNK</div>
        <div className="col-span-5">Operative</div>
        <div className="col-span-2 text-center">GitHub</div>
        <div className="col-span-2 text-center">LeetCode</div>
        <div className="col-span-2 text-right">Total</div>
      </div>

      {/* Data Rows */}
      <div className="flex flex-col">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="group grid grid-cols-1 items-center gap-4 border-b border-dashed border-border px-6 py-3 transition-colors hover:bg-white/5 md:grid-cols-12 last:border-b-0"
          >
            {/* Rank Indicator */}
            <div className="col-span-1 flex items-center justify-start md:justify-center">
              <div 
                className={`flex h-8 w-8 items-center justify-center border border-dashed font-mono text-xs transition-colors ${
                  entry.rank === 1 ? 'border-yellow-500 text-yellow-500 bg-yellow-500/10' : 
                  entry.rank === 2 ? 'border-gray-400 text-gray-400 bg-gray-400/10' : 
                  entry.rank === 3 ? 'border-amber-700 text-amber-700 bg-amber-700/10' : 
                  'border-border text-text-muted group-hover:border-white group-hover:text-white'
                }`}
              >
                {entry.rank}
              </div>
            </div>

            {/* Operative Info */}
            <div className="col-span-5 flex flex-col">
              <span className="font-heading text-sm uppercase tracking-wide text-white group-hover:text-white">
                {entry.name}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-text-muted">
                ID: {entry.usn}
              </span>
            </div>

            {/* GitHub Score */}
            <div className="col-span-2 flex items-center gap-2 font-mono text-[11px] text-text-muted md:justify-center">
              <GithubIcon className="h-3 w-3" />
              {entry.githubScore.toFixed(1)}
            </div>

            {/* LeetCode Score */}
            <div className="col-span-2 flex items-center gap-2 font-mono text-[11px] text-text-muted md:justify-center">
              <Code2 className="h-3 w-3" />
              {entry.lcScore.toFixed(1)}
            </div>

            {/* Total Score Output */}
            <div className="col-span-2 flex items-center font-mono text-sm tracking-widest text-white md:justify-end">
              {entry.totalScore.toFixed(2)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
