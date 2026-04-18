import { signIn } from "@/lib/auth";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <form
        action={async () => {
          "use server";
          await signIn("github", { redirectTo: "/" });
        }}
      >
        <button type="submit" className="bg-white text-black px-4 py-2 rounded">
          Sign in with GitHub
        </button>
      </form>
    </main>
  );
}