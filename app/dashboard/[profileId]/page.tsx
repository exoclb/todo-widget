import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseStreamerProfileRepository } from "@/lib/platform/supabase-profile-repository";
import {
  PlatformAuthorizationError,
  loadOwnedStreamerProfile
} from "@/lib/platform/streamer-profile.js";

type ScopedDashboardPageProps = {
  params: Promise<{
    profileId: string;
  }>;
};

export default async function ScopedDashboardPage({ params }: ScopedDashboardPageProps) {
  const { profileId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const repository = createSupabaseStreamerProfileRepository(supabase);

  try {
    const profile = await loadOwnedStreamerProfile(repository, user, profileId);

    return (
      <main className="shell">
        <section className="panel">
          <header className="panel-header">
            <p className="eyebrow">Scoped streamer profile</p>
            <h1>{profile.displayName}</h1>
            <p>
              This view proves dashboard reads are scoped to the signed-in owner before
              Task Widget configuration and Overlay Link management are added.
            </p>
          </header>
          <div className="panel-section grid">
            <div>
              <p className="eyebrow">Profile ID</p>
              <p className="meta">{profile.id}</p>
            </div>
            <div>
              <p className="eyebrow">Slug</p>
              <p>{profile.slug}</p>
            </div>
          </div>
        </section>
      </main>
    );
  } catch (error) {
    if (error instanceof PlatformAuthorizationError) {
      notFound();
    }

    throw error;
  }
}
