import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseStreamerProfileRepository } from "@/lib/platform/supabase-profile-repository";
import { createSupabaseTaskListRepository } from "@/lib/platform/supabase-task-list-repository";
import {
  addTaskFromDashboard,
  completeTaskFromDashboard,
  editTaskFromDashboard,
  removeTaskFromDashboard,
  resetTaskListFromDashboard,
  regenerateOverlayLinkFromDashboard,
  updateTaskWidgetSettingsFromDashboard
} from "../actions";
import {
  PlatformAuthorizationError,
  loadOwnedStreamerProfile
} from "@/lib/platform/streamer-profile.js";

type ScopedDashboardPageProps = {
  params: Promise<{
    profileId: string;
  }>;
  searchParams?: Promise<{
    newOverlayToken?: string;
  }>;
};

export default async function ScopedDashboardPage({ params, searchParams }: ScopedDashboardPageProps) {
  const { profileId } = await params;
  const { newOverlayToken } = (await searchParams) ?? {};
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
    const widgetConfig = await taskRepository.findTaskWidgetConfig(widget.id);

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
              <p className="eyebrow">Overlay Link</p>
              <h2>Hosted Overlay access</h2>
              <p className="meta">
                Regenerate the public OBS/browser-source link if it has been shared or leaked.
                Previous links become inactive and render an empty stream-safe shell.
              </p>
            </div>
            {newOverlayToken ? (
              <div className="notice">
                <p>Copy this new Overlay Link now. The raw token is only shown immediately after regeneration.</p>
                <p className="meta">/overlay/{newOverlayToken}</p>
              </div>
            ) : null}
            <form action={regenerateOverlayLinkFromDashboard}>
              <input name="profileId" type="hidden" value={profile.id} />
              <button className="button secondary" type="submit">Regenerate Overlay Link</button>
            </form>
          </section>

          <section className="panel-section stack">
            <div>
              <p className="eyebrow">Task Widget Settings</p>
              <h2>Render settings</h2>
              <p className="meta">These settings are public-safe render inputs for Saved Preview and Hosted Overlay.</p>
            </div>
            <form action={updateTaskWidgetSettingsFromDashboard} className="stack">
              <input name="profileId" type="hidden" value={profile.id} />
              <label className="field">
                <span className="label">Widget Title</span>
                <input className="input" name="title" defaultValue={widgetConfig?.title ?? "STREAM TASKS"} required />
              </label>
              <label className="field">
                <span className="label">Position</span>
                <select className="input" name="position" defaultValue={widgetConfig?.position ?? "top-right"}>
                  <option value="top-right">Top right</option>
                  <option value="top-left">Top left</option>
                  <option value="bottom-right">Bottom right</option>
                  <option value="bottom-left">Bottom left</option>
                </select>
              </label>
              <label className="field">
                <span className="label">Empty Text</span>
                <input className="input" name="emptyText" defaultValue={String(widgetConfig?.renderSettings?.emptyText ?? "No tasks yet")} />
              </label>
              <label className="field">
                <span className="label">Max Items</span>
                <input className="input" name="maxItems" type="number" min="1" max="50" defaultValue={Number(widgetConfig?.renderSettings?.maxItems ?? 10)} />
              </label>
              <label className="field">
                <span className="label">Layout Mode</span>
                <select className="input" name="layoutMode" defaultValue={String(widgetConfig?.renderSettings?.layoutMode ?? "compact")}>
                  <option value="compact">Compact</option>
                  <option value="detailed">Detailed</option>
                  <option value="minimal">Minimal</option>
                </select>
              </label>
              <label className="checkbox-row">
                <input name="enableVoting" type="checkbox" defaultChecked={Boolean(widgetConfig?.renderSettings?.enableVoting)} />
                <span>Show Voting Mode data</span>
              </label>
              <label className="checkbox-row">
                <input name="votePrioritySort" type="checkbox" defaultChecked={Boolean(widgetConfig?.renderSettings?.votePrioritySort)} />
                <span>Sort by vote priority</span>
              </label>
              <label className="checkbox-row">
                <input name="showCompleted" type="checkbox" defaultChecked={Boolean(widgetConfig?.renderSettings?.showCompleted ?? true)} />
                <span>Show completed tasks</span>
              </label>
              <label className="checkbox-row">
                <input name="showProgress" type="checkbox" defaultChecked={Boolean(widgetConfig?.renderSettings?.showProgress ?? true)} />
                <span>Show progress</span>
              </label>
              <button className="button secondary" type="submit">Save render settings</button>
            </form>
          </section>

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
