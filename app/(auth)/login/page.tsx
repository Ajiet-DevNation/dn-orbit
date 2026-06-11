import { signIn } from "@/lib/auth";

interface LoginPageProps {
  searchParams: Promise<{ error?: string }>;
}

const ERROR_MESSAGES: Record<string, string> = {
  OAuthAccountNotLinked: "ACCOUNT_CONFLICT: EMAIL_LINKED_TO_ANOTHER_PROVIDER",
  OAuthSignin: "OAUTH_ERROR: FAILED_TO_INITIATE_CONNECTION",
  OAuthCallback: "CALLBACK_ERROR: UNEXPECTED_RESPONSE_FROM_GITHUB",
  AccessDenied: "ACCESS_DENIED: UNAUTHORIZED",
  Default: "AUTH_ERROR: UNKNOWN_FAILURE",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;
  const errorMessage = error
    ? (ERROR_MESSAGES[error] ?? ERROR_MESSAGES["Default"])
    : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-4">
      <div className="w-full max-w-sm">
        <TacticalCard id="ARCHIVE_ID: 0xAUTH">

          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="border border-white px-2 py-1">
              <span className="font-mono font-black text-xs tracking-widest text-white">DN</span>
            </div>
            <div>
              <div className="font-mono font-black text-xs tracking-widest uppercase text-white">ORBIT</div>
              <div className="font-mono font-black text-[8px] tracking-widest uppercase text-zinc-600">MEMBER_SECTOR_V1</div>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-5xl font-black uppercase tracking-tighter italic leading-none text-white mb-2">
            INITIATE
            <br />
            CONNECTION
          </h1>
          <p className="font-mono text-[10px] text-zinc-500 tracking-widest uppercase font-black mb-8">
            DEVNATION // ORBIT PLATFORM
          </p>

          {/* Error */}
          {errorMessage && (
            <div className="border border-red-900 px-4 py-3 mb-6">
              <p className="font-mono text-[10px] text-red-500 font-black tracking-wider uppercase">
                ▲ {errorMessage}
              </p>
            </div>
          )}

          {/* Sign in form */}
          <form
            action={async () => {
              "use server";
              await signIn("github", { redirectTo: "/" });
            }}
          >
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-3 bg-white text-black px-6 py-3 font-mono font-black text-xs uppercase tracking-widest border border-white hover:bg-black hover:text-white transition-colors duration-200"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
              </svg>
              &gt; SIGN IN WITH GITHUB
            </button>
          </form>

          <p className="font-mono text-[8px] text-zinc-700 tracking-widest uppercase font-black mt-6">
            SECURE_TOKEN_GENERATED_UPON_ENTRY
          </p>

        </TacticalCard>
      </div>
    </main>
  );
}

// ── Inline TacticalCard (no import needed, matches exact component API) ──
function TacticalCard({
  id = "ARCHIVE_ID: 0xSTATIC",
  children,
}: {
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-black relative font-mono border border-zinc-800">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-950/50">
        <span className="text-[9px] text-zinc-500 tracking-widest uppercase">{id}</span>
        <div className="flex gap-1">
          <div className="w-1.5 h-1.5 bg-emerald-500 animate-pulse" />
          <div className="w-1.5 h-1.5 bg-zinc-800" />
          <div className="w-1.5 h-1.5 bg-zinc-800" />
        </div>
      </div>
      {/* Content */}
      <div className="p-8">{children}</div>
      {/* Corner brackets */}
      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-white/40" />
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white/40" />
    </div>
  );
}