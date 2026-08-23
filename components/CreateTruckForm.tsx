"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  userId: string;
};

// Onboarding for a signed-in user who doesn't have a truck yet (context doc
// Section 5, the "Truck" control). Creating the truck also promotes the
// user's profile to role "truck_owner" -- see the 0005 migration's comment
// on profiles.role ("a user is one or the other in MVP"). That update is
// best-effort: the trucks row (guarded by RLS on owner_id) is what actually
// grants operator access, so a failure here shouldn't block onboarding.
export default function CreateTruckForm({ userId }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Enter a truck name.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { error: insertError } = await supabase.from("trucks").insert({
      owner_id: userId,
      name: name.trim(),
      cuisine: cuisine.trim() || null,
      description: description.trim() || null,
    });

    if (insertError) {
      setLoading(false);
      setError(insertError.message);
      return;
    }

    await supabase
      .from("profiles")
      .update({ role: "truck_owner" })
      .eq("id", userId);

    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-y-auto bg-zinc-50 px-4 pb-8 pt-3 sm:px-6">
      <header className="flex flex-shrink-0 items-center gap-3 pb-4">
        <Link
          href="/"
          className="text-sm font-medium text-zinc-400 hover:text-zinc-600"
          aria-label="Back"
        >
          &larr; Back
        </Link>
      </header>

      <div className="flex-shrink-0 pb-5">
        <h1 className="text-lg font-bold tracking-tight text-zinc-900">
          Set up your truck
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          This is what customers see once you open for the day. You can
          change any of it later.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5"
      >
        <div>
          <label
            htmlFor="truckName"
            className="mb-1 block text-xs font-medium text-zinc-600"
          >
            Truck name
          </label>
          <input
            id="truckName"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Big Bao Bus"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="cuisine"
            className="mb-1 block text-xs font-medium text-zinc-600"
          >
            Cuisine (optional)
          </label>
          <input
            id="cuisine"
            value={cuisine}
            onChange={(e) => setCuisine(e.target.value)}
            placeholder="Taiwanese"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="description"
            className="mb-1 block text-xs font-medium text-zinc-600"
          >
            Description (optional)
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Steamed bao, bubble tea, and a killer chili crisp."
            className="w-full resize-none rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-full bg-zinc-900 py-3 text-sm font-semibold text-white transition disabled:opacity-50"
        >
          {loading ? "Creating…" : "Create truck"}
        </button>
      </form>
    </div>
  );
}
