import type { SupabaseClient } from "@supabase/supabase-js";

export type DashboardTaskRecord = {
  id: string;
  taskListStateId: string;
  taskListCycleId: string;
  taskNumber: number;
  text: string;
  status: "active" | "completed";
  source: "dashboard" | "chat-command";
  authorLabel: string;
  ownerSubjectHash?: string | null;
  voteCount: number;
};

type WidgetRow = {
  id: string;
  streamer_profile_id: string;
  type: string;
  title: string;
  enabled: boolean;
  position: string;
  sort_order: number;
};

type TaskListStateRow = {
  id: string;
  widget_id: string;
  current_cycle_id: string;
  next_task_number: number;
  version: number;
};

type TaskRow = {
  id: string;
  task_list_state_id: string;
  task_list_cycle_id: string;
  task_number: number;
  text: string;
  status: "active" | "completed";
  source: "dashboard" | "chat-command";
  author_label: string;
  owner_subject_hash: string | null;
  vote_count: number;
};

function mapTaskListState(row: TaskListStateRow) {
  return {
    id: row.id,
    widgetId: row.widget_id,
    currentCycleId: row.current_cycle_id,
    nextTaskNumber: row.next_task_number,
    version: row.version
  };
}

function mapTask(row: TaskRow): DashboardTaskRecord {
  return {
    id: row.id,
    taskListStateId: row.task_list_state_id,
    taskListCycleId: row.task_list_cycle_id,
    taskNumber: row.task_number,
    text: row.text,
    status: row.status,
    source: row.source,
    authorLabel: row.author_label,
    ownerSubjectHash: row.owner_subject_hash,
    voteCount: row.vote_count
  };
}

export function createSupabaseTaskListRepository(supabase: SupabaseClient) {
  return {
    async ensureDefaultTaskWidgetForProfile(streamerProfileId: string) {
      const { data: existingWidget, error: findError } = await supabase
        .from("widgets")
        .select("id, streamer_profile_id, type, title, enabled, position, sort_order")
        .eq("streamer_profile_id", streamerProfileId)
        .eq("type", "todo")
        .order("sort_order", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (findError) {
        throw findError;
      }

      if (existingWidget) {
        await supabase.from("task_widget_configs").upsert({
          widget_id: existingWidget.id,
          render_settings: {
            emptyText: "No tasks yet",
            maxItems: 10,
            showCompleted: true,
            showProgress: true,
            enableVoting: false,
            votePrioritySort: false,
            layoutMode: "compact",
            overlayRefreshIntervalMs: 5000
          },
          command_settings: {}
        }, { onConflict: "widget_id", ignoreDuplicates: true });

        return existingWidget as WidgetRow;
      }

      const { data: widget, error: insertError } = await supabase
        .from("widgets")
        .insert({
          streamer_profile_id: streamerProfileId,
          type: "todo",
          title: "STREAM TASKS",
          enabled: true,
          position: "top-right",
          sort_order: 1
        })
        .select("id, streamer_profile_id, type, title, enabled, position, sort_order")
        .single();

      if (insertError) {
        throw insertError;
      }

      await supabase.from("task_widget_configs").upsert({
        widget_id: widget.id,
        render_settings: {
          emptyText: "No tasks yet",
          maxItems: 10,
          showCompleted: true,
          showProgress: true,
          enableVoting: false,
          votePrioritySort: false,
          layoutMode: "compact",
          overlayRefreshIntervalMs: 5000
        },
        command_settings: {}
      });

      return widget as WidgetRow;
    },

    async findTaskWidgetConfig(widgetId: string) {
      const { data: widget, error: widgetError } = await supabase
        .from("widgets")
        .select("id, title, enabled, position")
        .eq("id", widgetId)
        .maybeSingle();

      if (widgetError) {
        throw widgetError;
      }

      if (!widget) return null;

      const { data: config, error: configError } = await supabase
        .from("task_widget_configs")
        .select("render_settings, command_settings")
        .eq("widget_id", widgetId)
        .maybeSingle();

      if (configError) {
        throw configError;
      }

      return {
        widgetId,
        title: widget.title,
        enabled: widget.enabled,
        position: widget.position,
        renderSettings: (config?.render_settings as Record<string, unknown>) ?? {},
        commandSettings: (config?.command_settings as Record<string, unknown>) ?? {}
      };
    },

    async updateTaskWidgetConfig(widgetId: string, patch: Record<string, unknown>) {
      const widgetUpdate: Record<string, unknown> = {};
      if (patch.title !== undefined) widgetUpdate.title = patch.title;
      if (patch.position !== undefined) widgetUpdate.position = patch.position;
      if (patch.enabled !== undefined) widgetUpdate.enabled = patch.enabled;

      if (Object.keys(widgetUpdate).length > 0) {
        const { error: widgetError } = await supabase.from("widgets").update(widgetUpdate).eq("id", widgetId);
        if (widgetError) {
          throw widgetError;
        }
      }

      const current = await this.findTaskWidgetConfig(widgetId);
      const { error: configError } = await supabase.from("task_widget_configs").upsert(
        {
          widget_id: widgetId,
          render_settings: patch.renderSettings ?? current?.renderSettings ?? {},
          command_settings: patch.commandSettings ?? current?.commandSettings ?? {}
        },
        { onConflict: "widget_id" }
      );

      if (configError) {
        throw configError;
      }

      return this.findTaskWidgetConfig(widgetId);
    },

    async listActiveWidgetCommandSettings(streamerProfileId: string) {
      const { data: widgets, error: widgetError } = await supabase
        .from("widgets")
        .select("id")
        .eq("streamer_profile_id", streamerProfileId)
        .eq("type", "todo")
        .eq("enabled", true);

      if (widgetError) {
        throw widgetError;
      }

      const widgetIds = (widgets ?? []).map((widget) => widget.id);
      if (widgetIds.length === 0) return [];

      const { data: configs, error: configError } = await supabase
        .from("task_widget_configs")
        .select("widget_id, command_settings, render_settings")
        .in("widget_id", widgetIds);

      if (configError) {
        throw configError;
      }

      return (configs ?? []).map((config) => ({
        widgetId: config.widget_id,
        ...(config.command_settings as Record<string, unknown>),
        enableVoting: Boolean((config.render_settings as Record<string, unknown> | null)?.enableVoting)
      }));
    },

    async findTaskListStateByWidgetId(widgetId: string) {
      const { data, error } = await supabase
        .from("task_list_states")
        .select("id, widget_id, current_cycle_id, next_task_number, version")
        .eq("widget_id", widgetId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data ? mapTaskListState(data as TaskListStateRow) : null;
    },

    async createTaskListState({ widgetId }: { widgetId: string }) {
      const { data: state, error: stateError } = await supabase
        .from("task_list_states")
        .insert({ widget_id: widgetId, next_task_number: 1, version: 0 })
        .select("id, widget_id, current_cycle_id, next_task_number, version")
        .single();

      if (stateError) {
        throw stateError;
      }

      const { data: cycle, error: cycleError } = await supabase
        .from("task_list_cycles")
        .insert({
          task_list_state_id: state.id,
          cycle_number: 1,
          started_by_kind: "streamer",
          started_by_label: "Streamer"
        })
        .select("id")
        .single();

      if (cycleError) {
        throw cycleError;
      }

      const { data: updated, error: updateError } = await supabase
        .from("task_list_states")
        .update({ current_cycle_id: cycle.id })
        .eq("id", state.id)
        .select("id, widget_id, current_cycle_id, next_task_number, version")
        .single();

      if (updateError) {
        throw updateError;
      }

      return mapTaskListState(updated as TaskListStateRow);
    },

    async appendTask(taskListStateId: string, input: Record<string, unknown>) {
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          task_list_state_id: taskListStateId,
          task_list_cycle_id: input.taskListCycleId,
          task_number: input.taskNumber,
          text: input.text,
          status: input.status,
          source: input.source,
          author_label: input.authorLabel,
          owner_subject_hash: input.ownerSubjectHash,
          vote_count: input.voteCount ?? 0
        })
        .select("id, task_list_state_id, task_list_cycle_id, task_number, text, status, source, author_label, owner_subject_hash, vote_count")
        .single();

      if (error) {
        throw error;
      }

      return mapTask(data as TaskRow);
    },

    async findTaskById(taskListStateId: string, taskId: string) {
      const { data, error } = await supabase
        .from("tasks")
        .select("id, task_list_state_id, task_list_cycle_id, task_number, text, status, source, author_label, owner_subject_hash, vote_count")
        .eq("task_list_state_id", taskListStateId)
        .eq("id", taskId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data ? mapTask(data as TaskRow) : null;
    },

    async updateTask(taskListStateId: string, taskId: string, patch: Record<string, unknown>) {
      const update: Record<string, unknown> = {};

      if (patch.text !== undefined) update.text = patch.text;
      if (patch.status !== undefined) update.status = patch.status;
      if (patch.voteCount !== undefined) update.vote_count = patch.voteCount;
      if (patch.status === "completed") update.completed_at = new Date().toISOString();

      const { data, error } = await supabase
        .from("tasks")
        .update(update)
        .eq("task_list_state_id", taskListStateId)
        .eq("id", taskId)
        .select("id, task_list_state_id, task_list_cycle_id, task_number, text, status, source, author_label, owner_subject_hash, vote_count")
        .single();

      if (error) {
        throw error;
      }

      return mapTask(data as TaskRow);
    },

    async removeTask(taskListStateId: string, taskId: string) {
      const task = await this.findTaskById(taskListStateId, taskId);

      if (!task) {
        return null;
      }

      const { error } = await supabase.from("tasks").delete().eq("task_list_state_id", taskListStateId).eq("id", taskId);

      if (error) {
        throw error;
      }

      return task;
    },

    async updateTaskListState(taskListStateId: string, patch: Record<string, unknown>) {
      const update: Record<string, unknown> = {};

      if (patch.currentCycleId !== undefined) update.current_cycle_id = patch.currentCycleId;
      if (patch.nextTaskNumber !== undefined) update.next_task_number = patch.nextTaskNumber;
      if (patch.version !== undefined) update.version = patch.version;

      const { data, error } = await supabase
        .from("task_list_states")
        .update(update)
        .eq("id", taskListStateId)
        .select("id, widget_id, current_cycle_id, next_task_number, version")
        .single();

      if (error) {
        throw error;
      }

      return mapTaskListState(data as TaskListStateRow);
    },

    async listRenderableTasks(taskListStateId: string) {
      const { data, error } = await supabase
        .from("tasks")
        .select("id, task_list_state_id, task_list_cycle_id, task_number, text, status, source, author_label, owner_subject_hash, vote_count")
        .eq("task_list_state_id", taskListStateId)
        .order("task_number", { ascending: true });

      if (error) {
        throw error;
      }

      return (data ?? []).map((row) => mapTask(row as TaskRow));
    },

    async clearTasks(taskListStateId: string) {
      const tasks = await this.listRenderableTasks(taskListStateId);
      const { error } = await supabase.from("tasks").delete().eq("task_list_state_id", taskListStateId);

      if (error) {
        throw error;
      }

      return tasks;
    },

    async createTaskListCycle(taskListStateId: string, input: Record<string, unknown> = {}) {
      const { data: latestCycle, error: latestError } = await supabase
        .from("task_list_cycles")
        .select("cycle_number")
        .eq("task_list_state_id", taskListStateId)
        .order("cycle_number", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestError) {
        throw latestError;
      }

      const { data, error } = await supabase
        .from("task_list_cycles")
        .insert({
          task_list_state_id: taskListStateId,
          cycle_number: Number(latestCycle?.cycle_number ?? 0) + 1,
          started_by_kind: input.startedByKind ?? "streamer",
          started_by_label: input.startedByLabel ?? "Streamer"
        })
        .select("id")
        .single();

      if (error) {
        throw error;
      }

      return { id: data.id };
    },

    async appendTaskHistory(entry: Record<string, unknown>) {
      const { data, error } = await supabase
        .from("task_history")
        .insert({
          streamer_profile_id: entry.streamerProfileId,
          widget_id: entry.widgetId,
          task_list_cycle_id: entry.taskListCycleId,
          task_id: entry.taskId,
          task_number: entry.taskNumber,
          text: entry.text,
          author_label: entry.authorLabel,
          source: entry.source,
          outcome: entry.outcome,
          closed_by_kind: entry.closedByKind,
          closed_by_label: entry.closedByLabel,
          vote_count: entry.voteCount ?? 0
        })
        .select("id")
        .single();

      if (error) {
        throw error;
      }

      return { id: data.id, ...entry };
    },

    async findTaskVote(taskListStateId: string, taskListCycleId: string, viewerSubjectHash: string) {
      const { data, error } = await supabase
        .from("task_votes")
        .select("id, task_list_state_id, task_list_cycle_id, task_id, viewer_subject_hash, viewer_label, cooldown_until")
        .eq("task_list_state_id", taskListStateId)
        .eq("task_list_cycle_id", taskListCycleId)
        .eq("viewer_subject_hash", viewerSubjectHash)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data
        ? {
            id: data.id,
            taskListStateId: data.task_list_state_id,
            taskListCycleId: data.task_list_cycle_id,
            taskId: data.task_id,
            viewerSubjectHash: data.viewer_subject_hash,
            viewerLabel: data.viewer_label,
            cooldownUntil: data.cooldown_until
          }
        : null;
    },

    async saveTaskVote(vote: Record<string, unknown>) {
      const { data, error } = await supabase
        .from("task_votes")
        .insert({
          task_list_state_id: vote.taskListStateId,
          task_list_cycle_id: vote.taskListCycleId,
          task_id: vote.taskId,
          viewer_subject_hash: vote.viewerSubjectHash,
          viewer_label: vote.viewerLabel,
          cooldown_until: vote.cooldownUntil
        })
        .select("id")
        .single();

      if (error) {
        throw error;
      }

      return { id: data.id, ...vote };
    },

    async updateTaskVote(
      taskListStateId: string,
      taskListCycleId: string,
      viewerSubjectHash: string,
      patch: Record<string, unknown>
    ) {
      const update: Record<string, unknown> = {};
      if (patch.taskId !== undefined) update.task_id = patch.taskId;
      if (patch.viewerLabel !== undefined) update.viewer_label = patch.viewerLabel;
      if (patch.cooldownUntil !== undefined) update.cooldown_until = patch.cooldownUntil;
      update.last_voted_at = new Date().toISOString();

      const { data, error } = await supabase
        .from("task_votes")
        .update(update)
        .eq("task_list_state_id", taskListStateId)
        .eq("task_list_cycle_id", taskListCycleId)
        .eq("viewer_subject_hash", viewerSubjectHash)
        .select("id, task_list_state_id, task_list_cycle_id, task_id, viewer_subject_hash, viewer_label, cooldown_until")
        .single();

      if (error) {
        throw error;
      }

      return {
        id: data.id,
        taskListStateId: data.task_list_state_id,
        taskListCycleId: data.task_list_cycle_id,
        taskId: data.task_id,
        viewerSubjectHash: data.viewer_subject_hash,
        viewerLabel: data.viewer_label,
        cooldownUntil: data.cooldown_until
      };
    },

    async appendCommandLog(entry: Record<string, unknown>) {
      const { data, error } = await supabase
        .from("command_logs")
        .insert({
          streamer_profile_id: entry.streamerProfileId,
          widget_id: entry.widgetId,
          task_list_state_id: entry.taskListStateId,
          command_name: entry.commandName,
          raw_command_text: entry.rawCommandText,
          actor_label: entry.actorLabel,
          actor_subject_hash: entry.actorSubjectHash,
          outcome: entry.outcome,
          ignored_reason: entry.ignoredReason,
          created_task_id: entry.createdTaskId,
          affected_task_id: entry.affectedTaskId
        })
        .select("id")
        .single();

      if (error) {
        throw error;
      }

      return { id: data.id, ...entry };
    },

    async saveOverlayState(streamerProfileId: string, overlayState: Record<string, unknown>) {
      const { derivedFromTaskListVersion, derivedAt, ...publicOverlayState } = overlayState;
      const { error } = await supabase.from("overlay_states").upsert(
        {
          streamer_profile_id: streamerProfileId,
          schema_version: overlayState.schemaVersion ?? 1,
          state: publicOverlayState,
          derived_from_task_list_version: derivedFromTaskListVersion,
          derived_at: derivedAt
        },
        { onConflict: "streamer_profile_id" }
      );

      if (error) {
        throw error;
      }

      return overlayState;
    }
  };
}
