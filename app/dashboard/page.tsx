import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseStreamerProfileRepository } from "@/lib/platform/supabase-profile-repository";
import { ensureStreamerProfile } from "@/lib/platform/streamer-profile.js";
import { updateStreamerProfile } from "./actions";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const repository = createSupabaseStreamerProfileRepository(supabase);
  const profile = await ensureStreamerProfile(repository, user);

  return (
    <main className="shell">
      <section className="panel">
        <header className="panel-header">
          <p className="eyebrow">Streamer-only dashboard</p>
          <h1>{profile.displayName}</h1>
          <p>
            This profile is the owner scope for future Task Widget settings, Overlay
            Link lifecycle, Task List State writes, Task History, and Command Log data.
          </p>
        </header>
        <div className="panel-section stack">
          <div className="grid">
            <div>
              <p className="eyebrow">Profile slug</p>
              <p>{profile.slug}</p>
            </div>
            <div>
              <p className="eyebrow">Owner user</p>
              <p className="meta">{profile.ownerUserId}</p>
            </div>
            <div>
              <p className="eyebrow">Profile route</p>
              <p>
                <Link href={`/dashboard/${profile.id}`}>Open scoped profile view</Link>
              </p>
            </div>
          </div>

          <form action={updateStreamerProfile} className="stack">
            <input name="profileId" type="hidden" value={profile.id} />
            <div className="grid">
              <label className="field">
                <span className="label">Display name</span>
                <input className="input" name="displayName" defaultValue={profile.displayName} required />
              </label>
              <label className="field">
                <span className="label">Slug</span>
                <input className="input" name="slug" defaultValue={profile.slug} required />
              </label>
            </div>
            <button className="button" type="submit">
              Update profile
            </button>
          </form>

          <form action="/auth/sign-out" method="post">
            <button className="button secondary" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
