"use client";

import { Button } from "@/components/ui/8bit-button";
import { Card } from "@/components/ui/8bit-card";
import { Input } from "@/components/ui/8bit-input";
import { toast } from "@/components/ui/8bit-toast";
import { PixelCheck } from "@/components/ui/PixelIcons";
import { TEAM_ERROR_KEYS, TEAM_NAME_MAX } from "@/lib/teams";
import { FieldCard } from "./FieldCard";
import { ChoiceMark, choiceLabel } from "./PixelFormField";

/** Team rules for the page, computed on the server. */
export interface TeamInfo {
  sizeLabel: string;
  minSize: number;
  maxSize: number;
  /** Field id every member must answer alike (e.g. branch), or null. */
  matchFieldId: string | null;
  /** That field's label, e.g. "Branch". */
  matchLabel: string | null;
  teamCount: number;
  maxTeams: number | null;
  /** False once every team slot is taken: joining is all that is left. */
  canCreate: boolean;
}

/** What the register route returns for a team registration. */
export interface TeamResult {
  name: string;
  /** Display form, e.g. "K7QX-29MD". */
  code: string;
  size: number;
  role: "created" | "joined";
  /** Member names, the registrant last. */
  members: string[];
}

export type TeamAction = "create" | "join";

/** Step 2: create a team or join one with its invite code. */
export function TeamStep({
  team,
  matchValue,
  action,
  onAction,
  teamName,
  onTeamName,
  teamCode,
  onTeamCode,
  errors,
}: {
  team: TeamInfo;
  /** This registrant's answer on the match field, e.g. "CSE". */
  matchValue: string | null;
  action: TeamAction | null;
  onAction: (a: TeamAction) => void;
  teamName: string;
  onTeamName: (v: string) => void;
  teamCode: string;
  onTeamCode: (v: string) => void;
  errors: Record<string, string>;
}) {
  const rule = [
    `Teams have ${team.sizeLabel}`,
    team.matchLabel && matchValue
      ? `all with the same ${team.matchLabel.toLowerCase()} (yours: ${matchValue})`
      : null,
  ]
    .filter(Boolean)
    .join(", ");
  const slotsLeft =
    team.maxTeams != null ? Math.max(0, team.maxTeams - team.teamCount) : null;

  return (
    <>
      <FieldCard
        label="YOUR TEAM"
        required
        description={`${rule}. Make a new team and share its invite code, or join your teammate's team with theirs.`}
        error={errors[TEAM_ERROR_KEYS.choice]}
      >
        <div
          role="radiogroup"
          aria-label="Your team"
          className="flex flex-col gap-2.5"
        >
          <label
            className={`${choiceLabel} ${team.canCreate ? "" : "cursor-not-allowed opacity-50"}`}
          >
            <input
              type="radio"
              name="team-action"
              checked={action === "create"}
              disabled={!team.canCreate}
              onChange={() => onAction("create")}
              className="peer sr-only"
            />
            <ChoiceMark checked={action === "create"} />
            <span className="flex flex-col">
              <span>Create a new team</span>
              <span className="text-xs text-muted-foreground">
                {team.canCreate
                  ? slotsLeft != null
                    ? `${slotsLeft} of ${team.maxTeams} team slots left`
                    : "You get an invite code to share"
                  : `All ${team.maxTeams} team slots are taken`}
              </span>
            </span>
          </label>
          <label className={choiceLabel}>
            <input
              type="radio"
              name="team-action"
              checked={action === "join"}
              onChange={() => onAction("join")}
              className="peer sr-only"
            />
            <ChoiceMark checked={action === "join"} />
            <span className="flex flex-col">
              <span>Join a team</span>
              <span className="text-xs text-muted-foreground">
                Use the invite code your teammate got
              </span>
            </span>
          </label>
        </div>
      </FieldCard>

      {action === "create" && (
        <FieldCard
          htmlFor="reg-team-name"
          label="TEAM NAME"
          required
          description="2 to 32 characters. No two teams can share a name."
          error={errors[TEAM_ERROR_KEYS.name]}
        >
          <Input
            id="reg-team-name"
            value={teamName}
            maxLength={TEAM_NAME_MAX}
            autoComplete="off"
            placeholder="e.g. Byte Me"
            aria-invalid={!!errors[TEAM_ERROR_KEYS.name]}
            onChange={(e) => onTeamName(e.target.value)}
          />
        </FieldCard>
      )}

      {action === "join" && (
        <FieldCard
          htmlFor="reg-team-code"
          label="INVITE CODE"
          required
          description="8 letters and numbers, like ABCD-2345. Ask whoever made the team."
          error={errors[TEAM_ERROR_KEYS.code]}
        >
          <Input
            id="reg-team-code"
            value={teamCode}
            maxLength={16}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="ABCD-2345"
            aria-invalid={!!errors[TEAM_ERROR_KEYS.code]}
            onChange={(e) => onTeamCode(e.target.value.toUpperCase())}
            className="uppercase tracking-[0.2em]"
          />
        </FieldCard>
      )}
    </>
  );
}

/** Success screen for a team registration. The creator's copy is where the
 *  invite code is handed over, so it is large and copyable. */
export function TeamDone({
  result,
  team,
}: {
  result: TeamResult;
  team: TeamInfo;
}) {
  return (
    <Card className="w-full items-center gap-5 border-brand/30 p-8 text-center sm:p-10">
      <PixelCheck className="text-4xl text-brand-light" />
      <p className="retro text-sm text-white">YOU&apos;RE REGISTERED!</p>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {result.role === "created"
          ? `"${result.name}" is set up. Share this invite code with your teammates: each of them registers here and picks JOIN A TEAM.`
          : `You're in "${result.name}" (${result.size} of ${team.maxSize} members). Bring in more teammates with the same code.`}
      </p>
      <TeamMembers
        members={result.members.map((name, i) => ({
          name,
          you: i === result.members.length - 1,
        }))}
      />
      <InviteCode code={result.code} />
      <p className="text-xs leading-relaxed text-muted-foreground">
        We&apos;ve emailed you this code too. Teams need {team.sizeLabel}
        {team.matchLabel
          ? ` with the same ${team.matchLabel.toLowerCase()}`
          : ""}
        .
      </p>
    </Card>
  );
}

/** Who is in the team. Names only: teammates never see emails or USNs. */
function TeamMembers({
  members,
}: {
  members: { name: string; you: boolean }[];
}) {
  return (
    <div className="flex w-full max-w-xs flex-col items-center gap-2">
      <span className="retro text-[9px] tracking-widest text-muted-foreground">
        MEMBERS
      </span>
      <ol className="w-full divide-y divide-white/10 border-2 border-white/10 text-left">
        {members.map((m, i) => (
          <li
            // biome-ignore lint/suspicious/noArrayIndexKey: two teammates can share a name; order is stable
            key={i}
            className="flex items-center gap-3 px-3 py-2 text-xs text-white"
          >
            <span className="retro text-[9px] text-brand-light">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="min-w-0 flex-1 truncate">{m.name}</span>
            {m.you && (
              <span className="retro text-[8px] text-muted-foreground">
                YOU
              </span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

/** The invite code, large, with a copy button. */
function InviteCode({ code }: { code: string }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Invite code copied");
    } catch {
      toast.error("Couldn't copy · select the code instead");
    }
  };
  return (
    <>
      <div className="flex flex-col items-center gap-2">
        <span className="retro text-[9px] tracking-widest text-muted-foreground">
          TEAM INVITE CODE
        </span>
        <span className="retro select-all text-2xl tracking-[0.2em] text-white sm:text-3xl">
          {code}
        </span>
      </div>
      <Button
        type="button"
        onClick={copy}
        className="text-[10px] !bg-brand hover:!bg-brand-light !text-black"
      >
        COPY CODE
      </Button>
    </>
  );
}

/** A registration this browser (or signed-in account) already made, read live
 *  from the database on each visit. */
export interface ExistingRegistration {
  name: string;
  /** Their answer on the team match field (e.g. "CSE"), or null. */
  matchValue: string | null;
  team: {
    name: string;
    code: string;
    size: number;
    /** In sign-up order; `you` marks this registrant. */
    members: { name: string; you: boolean }[];
  } | null;
}

/** Shown instead of the form to someone who already registered, so coming
 *  back to the event never asks them to register again. */
export function AlreadyRegistered({
  registration,
  team,
}: {
  registration: ExistingRegistration;
  /** Team rules; null for an individual event. */
  team: TeamInfo | null;
}) {
  const t = registration.team;
  const missing = team && t ? Math.max(0, team.minSize - t.size) : 0;
  return (
    <Card className="w-full items-center gap-5 border-brand/30 p-8 text-center sm:p-10">
      <PixelCheck className="text-4xl text-brand-light" />
      <p className="retro text-sm text-white">YOU&apos;RE REGISTERED</p>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Registered as {registration.name}.
      </p>
      {team && t && (
        <>
          <div className="flex flex-col items-center gap-2">
            <span className="retro text-[9px] tracking-widest text-muted-foreground">
              YOUR TEAM
            </span>
            <span className="retro text-base text-white">{t.name}</span>
            <span className="retro text-[9px] text-brand-light">
              {t.size} / {team.maxSize} MEMBERS ·{" "}
              {missing > 0 ? (
                <span className="text-[#facc15]">NEEDS {missing} MORE</span>
              ) : (
                "READY"
              )}
            </span>
          </div>
          <TeamMembers members={t.members} />
          <InviteCode code={t.code} />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Teams need {team.sizeLabel}
            {team.matchLabel
              ? ` with the same ${team.matchLabel.toLowerCase()}`
              : ""}
            . Teammates register here and pick JOIN A TEAM.
          </p>
        </>
      )}
    </Card>
  );
}
