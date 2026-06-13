"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseStreamerProfileRepository } from "@/lib/platform/supabase-profile-repository";
import { createSupabaseTaskListRepository } from "@/lib/platform/supabase-task-list-repository";
import { createSupabaseOverlayRepository } from "@/lib/platform/supabase-overlay-repository";
import {
  addDashboardTask,
  completeDashboardTask,
  editDashboardTaskText,
  removeDashboardTask,
  resetDashboardTaskList,
  updateDashboardTaskWidgetSettings
} from "@/lib/platform/task-list-state.js";
import { regenerateOverlayLink } from "@/lib/platform/overlay-link.js";
import {
  createDashboardSaveErrorRedirect,
  toDashboardSaveErrorCode
} from "@/lib/platform/dashboard-save-feedback.js";
import { loadOwnedStreamerProfile, updateOwnedStreamerProfile } from "@/lib/platform/streamer-profile.js";

async function requireOwnedDashboardContext(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const profileId = String(formData.get("profileId") ?? "");
  const profileRepository = createSupabaseStreamerProfileRepository(supabase);
  const profile = await loadOwnedStreamerProfile(profileRepository, user, profileId);
  const taskRepository = createSupabaseTaskListRepository(supabase);
  const widget = await taskRepository.ensureDefaultTaskWidgetForProfile(profile.id);

  return {
    profile,
    taskRepository,
    widget
  };
}

export async function updateStreamerProfile(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const profileId = String(formData.get("profileId") ?? "");
  const displayName = String(formData.get("displayName") ?? "");
  const slug = String(formData.get("slug") ?? "");

  const repository = createSupabaseStreamerProfileRepository(supabase);
  await updateOwnedStreamerProfile(repository, user, profileId, {
    displayName,
    slug
  });

  redirect("/dashboard");
}

function redirectDashboardSaveError(profileId: string, error: unknown, action: string): never {
  redirect(createDashboardSaveErrorRedirect(profileId, toDashboardSaveErrorCode(error), action));
}

export async function addTaskFromDashboard(formData: FormData) {
  const { profile, taskRepository, widget } = await requireOwnedDashboardContext(formData);

  try {
    await addDashboardTask(taskRepository, {
      streamerProfileId: profile.id,
      widgetId: widget.id,
      taskText: String(formData.get("taskText") ?? ""),
      streamerDisplayName: profile.displayName
    });
  } catch (error) {
    redirectDashboardSaveError(profile.id, error, "task");
  }

  revalidatePath(`/dashboard/${profile.id}`);
  redirect(`/dashboard/${profile.id}`);
}

export async function editTaskFromDashboard(formData: FormData) {
  const { profile, taskRepository, widget } = await requireOwnedDashboardContext(formData);

  try {
    await editDashboardTaskText(taskRepository, {
      streamerProfileId: profile.id,
      widgetId: widget.id,
      taskId: String(formData.get("taskId") ?? ""),
      taskText: String(formData.get("taskText") ?? "")
    });
  } catch (error) {
    redirectDashboardSaveError(profile.id, error, "task");
  }

  revalidatePath(`/dashboard/${profile.id}`);
  redirect(`/dashboard/${profile.id}`);
}

export async function completeTaskFromDashboard(formData: FormData) {
  const { profile, taskRepository, widget } = await requireOwnedDashboardContext(formData);

  try {
    await completeDashboardTask(taskRepository, {
      streamerProfileId: profile.id,
      widgetId: widget.id,
      taskId: String(formData.get("taskId") ?? ""),
      closedByLabel: profile.displayName
    });
  } catch (error) {
    redirectDashboardSaveError(profile.id, error, "task");
  }

  revalidatePath(`/dashboard/${profile.id}`);
  redirect(`/dashboard/${profile.id}`);
}

export async function removeTaskFromDashboard(formData: FormData) {
  const { profile, taskRepository, widget } = await requireOwnedDashboardContext(formData);

  try {
    await removeDashboardTask(taskRepository, {
      streamerProfileId: profile.id,
      widgetId: widget.id,
      taskId: String(formData.get("taskId") ?? ""),
      closedByLabel: profile.displayName
    });
  } catch (error) {
    redirectDashboardSaveError(profile.id, error, "task");
  }

  revalidatePath(`/dashboard/${profile.id}`);
  redirect(`/dashboard/${profile.id}`);
}

export async function resetTaskListFromDashboard(formData: FormData) {
  const { profile, taskRepository, widget } = await requireOwnedDashboardContext(formData);

  try {
    await resetDashboardTaskList(taskRepository, {
      streamerProfileId: profile.id,
      widgetId: widget.id,
      closedByLabel: profile.displayName
    });
  } catch (error) {
    redirectDashboardSaveError(profile.id, error, "task");
  }

  revalidatePath(`/dashboard/${profile.id}`);
  redirect(`/dashboard/${profile.id}`);
}

export async function updateTaskWidgetSettingsFromDashboard(formData: FormData) {
  const { profile, taskRepository, widget } = await requireOwnedDashboardContext(formData);

  try {
    await updateDashboardTaskWidgetSettings(taskRepository, {
      streamerProfileId: profile.id,
      widgetId: widget.id,
      title: String(formData.get("title") ?? ""),
      position: String(formData.get("position") ?? "top-right"),
      renderSettings: {
        emptyText: String(formData.get("emptyText") ?? ""),
        maxItems: Number(formData.get("maxItems") ?? 10),
        layoutMode: String(formData.get("layoutMode") ?? "compact"),
        overlayRefreshIntervalMs: Number(formData.get("overlayRefreshIntervalMs") ?? 5000),
        enableVoting: formData.get("enableVoting") === "on",
        votePrioritySort: formData.get("votePrioritySort") === "on",
        showCompleted: formData.get("showCompleted") === "on",
        showProgress: formData.get("showProgress") === "on"
      }
    });
  } catch (error) {
    redirectDashboardSaveError(profile.id, error, "settings");
  }

  revalidatePath(`/dashboard/${profile.id}`);
  redirect(`/dashboard/${profile.id}`);
}

export async function regenerateOverlayLinkFromDashboard(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const profileId = String(formData.get("profileId") ?? "");
  const profileRepository = createSupabaseStreamerProfileRepository(supabase);
  const profile = await loadOwnedStreamerProfile(profileRepository, user, profileId);
  const overlayRepository = createSupabaseOverlayRepository(supabase);
  let publicToken = "";

  try {
    const result = await regenerateOverlayLink(overlayRepository, {
      streamerProfileId: profile.id
    });
    publicToken = result.publicToken;
  } catch (error) {
    redirectDashboardSaveError(profile.id, error, "overlay-link");
  }

  revalidatePath(`/dashboard/${profile.id}`);
  redirect(`/dashboard/${profile.id}?newOverlayToken=${encodeURIComponent(publicToken)}`);
}
