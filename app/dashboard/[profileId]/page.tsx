import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseStreamerProfileRepository } from "@/lib/platform/supabase-profile-repository";
import { createSupabaseTaskListRepository } from "@/lib/platform/supabase-task-list-repository";
import {
  addTaskFromDashboard,
  completeTaskFromDashboard,
  editTaskFromDashboard,
  removeTaskFromDashboard,
  resetTaskListFromDashboard
} from "../actions";
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
    const taskRepository = createSupabaseTaskListRepository(supabase);
    const widget = await taskRepository.ensureDefaultTaskWidgetForProfile(profile.id);
    const taskListState = await taskRepository.findTaskListStateByWidgetId(widget.id);
    const tasks = taskListState ? await taskRepository.listRenderableTasks(taskListState.id) : [];

    return (
      <main className="shell">
        <section className="panel stack">
          <header className="panel-header">
            <p className="eyebrow">Scoped streamer profile</p>
            <h1>{profile.displayName}</h1>
            <p>
              Dashboard actions write to backend-owned Task List State, then derive the
              public Overlay State used by Saved Preview and Hosted Overlay.
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
            <div>
              <p className="eyebrow">Task List Cycle</p>
              <p>{taskListState?.currentCycleId ?? "Not started"}</p>
            </div>
            <div>
              <p className="eyebrow">Next Task Number</p>
              <p>#{taskListState?.nextTaskNumber ?? 1}</p>
            </div>
            <div>
              <p className="eyebrow">Saved Preview</p>
              <p><a href={`/dashboard/${profile.id}/saved-preview`} target="_blank">Open saved preview</a></p>
            </div>
          </div>

          <section className="panel-section stack">
            <div>
              <p className="eyebrow">Dashboard-driven Task Management</p>
              <h2>Task List State</h2>
            </div>
            <form action={addTaskFromDashboard} className="stack">
              <input name="profileId" type="hidden" value={profile.id} />
              <label className="field">
                <span className="label">New Task Text</span>
                <input className="input" name="taskText" placeholder="Add a task from the dashboard" required />
              </label>
              <button className="button" type="submit">
                Add dashboard task
              </button>
            </form>
          </section>

          <section className="panel-section stack">
            {tasks.length === 0 ? (
              <p className="notice">No Active Tasks yet.</p>
            ) : (
              <div className="task-list">
                {tasks.map((task) => (
                  <article className="task-card" key={task.id}>
                    <div>
                      <p className="eyebrow">#{task.taskNumber} · {task.status}</p>
                      <p>{task.text}</p>
                      <p className="meta">Source: {task.source} · Author label: {task.authorLabel}</p>
                    </div>
                    <form action={editTaskFromDashboard} className="task-actions">
                      <input name="profileId" type="hidden" value={profile.id} />
                      <input name="taskId" type="hidden" value={task.id} />
                      <input className="input" name="taskText" defaultValue={task.text} required />
                      <button className="button secondary" type="submit">Edit</button>
                    </form>
                    {task.status === "active" ? (
                      <div className="task-actions">
                        <form action={completeTaskFromDashboard}>
                          <input name="profileId" type="hidden" value={profile.id} />
                          <input name="taskId" type="hidden" value={task.id} />
                          <button className="button secondary" type="submit">Complete</button>
                        </form>
                        <form action={removeTaskFromDashboard}>
                          <input name="profileId" type="hidden" value={profile.id} />
                          <input name="taskId" type="hidden" value={task.id} />
                          <button className="button secondary danger" type="submit">Remove</button>
                        </form>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            )}

            <form action={resetTaskListFromDashboard}>
              <input name="profileId" type="hidden" value={profile.id} />
              <button className="button secondary danger" type="submit">
                Reset Task List
              </button>
            </form>
          </section>
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
