import { signIn } from "@/lib/auth";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <form
        action={async () => {
          "use server";
          await signIn("github");
        }}
      >
        <button type="submit">Sign in with GitHub</button>
      </form>
    </main>
  );
}