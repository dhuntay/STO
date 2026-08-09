import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AddMealForm from "@/components/AddMealForm";

export default async function NewMealPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-zinc-50 px-4 pb-4 pt-3 sm:px-6">
      <header className="flex flex-shrink-0 items-center gap-3 pb-3">
        <Link
          href="/"
          className="text-sm font-medium text-zinc-400 hover:text-zinc-600"
          aria-label="Back to ordering screen"
        >
          &larr; Back
        </Link>
        <h1 className="text-lg font-bold tracking-tight text-zinc-900">
          Add a saved meal
        </h1>
      </header>

      <main className="flex min-h-0 flex-1 items-start justify-center overflow-y-auto pb-6">
        <div className="w-full max-w-sm pt-2">
          <AddMealForm />
        </div>
      </main>
    </div>
  );
}
