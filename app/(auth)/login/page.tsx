import LoginForm from "@/components/ui/8bit-login-form-2";

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
    <main className="flex min-h-screen items-center justify-center bg-black px-4 retro">
      <div className="w-full max-w-sm">
        <LoginForm errorMessage={errorMessage} />
      </div>
    </main>
  );
}
