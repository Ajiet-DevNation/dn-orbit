import LoginForm from "@/components/ui/8bit-login-form-2";
import { PixelStarsBackground } from "@/components/ui/PixelStarsBackground";

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
    <main className="dark relative flex min-h-screen w-full items-center justify-center bg-background p-8 retro overflow-hidden">
      <PixelStarsBackground />
      <div className="relative z-10 w-full max-w-md">
        <LoginForm errorMessage={errorMessage} />
      </div>
    </main>
  );
}
