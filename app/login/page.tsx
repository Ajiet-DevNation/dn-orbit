import LoginForm from "@/components/ui/8bit-login-form-2";
import { PixelStarfield } from "@/components/ui/PixelStarfield";

interface LoginPageProps {
  searchParams: Promise<{ error?: string }>;
}

const ERROR_MESSAGES: Record<string, string> = {
  OAuthAccountNotLinked: "THIS EMAIL IS ALREADY LINKED TO ANOTHER ACCOUNT",
  OAuthSignin: "COULDN'T REACH GITHUB · TRY AGAIN",
  OAuthCallback: "GITHUB SENT AN UNEXPECTED RESPONSE · TRY AGAIN",
  AccessDenied: "ACCESS DENIED · THIS GITHUB ACCOUNT ISN'T ON THE MEMBER LIST",
  Default: "SIGN-IN FAILED · TRY AGAIN",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;
  const errorMessage = error
    ? (ERROR_MESSAGES[error] ?? ERROR_MESSAGES.Default)
    : null;

  return (
    <main
      data-v2
      className="dark relative flex min-h-svh w-full items-center justify-center overflow-hidden bg-black px-5 py-12"
    >
      <PixelStarfield className="z-0" />
      <div className="relative z-10 w-full max-w-md">
        <LoginForm errorMessage={errorMessage} />
      </div>
    </main>
  );
}
