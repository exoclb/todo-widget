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
  resetDashboardTaskList
} from "@/lib/platform/task-list-state.js";
import { regenerateOverlayLink } from "@/lib/platform/overlay-link.js";
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

export async function addTaskFromDashboard(formData: FormData) {
  const { profile, taskRepository, widget } = await requireOwnedDashboardContext(formData);

  await addDashboardTask(taskRepository, {
    streamerProfileId: profile.id,
    widgetId: widget.id,
    taskText: String(formData.get("taskText") ?? ""),
    streamerDisplayName: profile.displayName
  });

  revalidatePath(`/dashboard/${profile.id}`);
  redirect(`/dashboard/${profile.id}`);
}

export async function editTaskFromDashboard(formData: FormData) {
  const { profile, taskRepository, widget } = await requireOwnedDashboardContext(formData);

  await editDashboardTaskText(taskRepository, {
    streamerProfileId: profile.id,
    widgetId: widget.id,
    taskId: String(formData.get("taskId") ?? ""),
    taskText: String(formData.get("taskText") ?? "")
  });

  revalidatePath(`/dashboard/${profile.id}`);
  redirect(`/dashboard/${profile.id}`);
}

export async function completeTaskFromDashboard(formData: FormData) {
  const { profile, taskRepository, widget } = await requireOwnedDashboardContext(formData);

  await completeDashboardTask(taskRepository, {
    streamerProfileId: profile.id,
    widgetId: widget.id,
    taskId: String(formData.get("taskId") ?? ""),
    closedByLabel: profile.displayName
  });

  revalidatePath(`/dashboard/${profile.id}`);
  redirect(`/dashboard/${profile.id}`);
}

export async function removeTaskFromDashboard(formData: FormData) {
  const { profile, taskRepository, widget } = await requireOwnedDashboardContext(formData);

  await removeDashboardTask(taskRepository, {
    streamerProfileId: profile.id,
    widgetId: widget.id,
    taskId: String(formData.get("taskId") ?? ""),
    closedByLabel: profile.displayName
  });

  revalidatePath(`/dashboard/${profile.id}`);
  redirect(`/dashboard/${profile.id}`);
}

export async function resetTaskListFromDashboard(formData: FormData) {
  const { profile, taskRepository, widget } = await requireOwnedDashboardContext(formData);

  await resetDashboardTaskList(taskRepository, {
    streamerProfileId: profile.id,
    widgetId: widget.id,
    closedByLabel: profile.displayName
  });

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
  const result = await regenerateOverlayLink(overlayRepository, {
    streamerProfileId: profile.id
  });

  revalidatePath(`/dashboard/${profile.id}`);
  redirect(`/dashboard/${profile.id}?newOverlayToken=${encodeURIComponent(result.publicToken)}`);
}
