import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/8bit-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/8bit-card";
import { signIn } from "@/lib/auth";

interface LoginFormProps extends React.ComponentPropsWithoutRef<"div"> {
  errorMessage?: string | null;
}

export function LoginForm({
  errorMessage,
  className,
  ...props
}: LoginFormProps) {
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center pb-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="border border-foreground dark:border-white px-2 py-1">
              <span className="font-mono font-black text-xs tracking-widest text-foreground dark:text-white">DN</span>
            </div>
            <div className="text-left">
              <div className="font-mono font-black text-xs tracking-widest uppercase text-foreground dark:text-white leading-tight">ORBIT</div>
              <div className="font-mono font-black text-[8px] tracking-widest uppercase text-muted-foreground leading-tight">MEMBER_SECTOR_V1</div>
            </div>
          </div>
          
          <CardTitle className="text-4xl font-black uppercase tracking-tighter italic leading-none">
            INITIATE<br/>CONNECTION
          </CardTitle>
          <CardDescription className="text-[10px] tracking-widest uppercase font-black mt-2">
            DEVNATION // ORBIT PLATFORM
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="grid gap-6">
            {errorMessage && (
              <div className="border border-red-900 px-4 py-3 bg-red-950/20">
                <p className="font-mono text-[10px] text-red-500 font-black tracking-wider uppercase text-center">
                  ▲ {errorMessage}
                </p>
              </div>
            )}
            
            <form
              action={async () => {
                "use server";
                await signIn("github", { redirectTo: "/" });
              }}
            >
              <Button type="submit" className="w-full uppercase tracking-widest text-xs h-12">
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                </svg>
                &gt; SIGN IN WITH GITHUB
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
      
      <div className="retro text-balance text-center text-[8px] tracking-widest text-muted-foreground uppercase font-black">
        SECURE_TOKEN_GENERATED_UPON_ENTRY
      </div>
    </div>
  );
}

export default LoginForm;
