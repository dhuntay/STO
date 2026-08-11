import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LoginForm from "@/components/LoginForm";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/");
  }

  return (
    <div className="flex h-dvh min-h-0 flex-col items-center justify-center overflow-hidden bg-zinc-50 px-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold tracking-tight text-zinc-900">
            Swipe2Reorder
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Your regular order, one swipe away.
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
