# Twitch Todo Widget

This context describes the viewer-facing task language used by the Twitch Todo Widget.

## Language

**Task**:
An actionable item submitted through chat and displayed in the stream overlay.
_Avoid_: Todo item, request

**Task Eligibility**:
The set of rules that determines whether a viewer submission can become an active task.
_Avoid_: Validation, filtering

**Task Text**:
The viewer-written text displayed for a task.
_Avoid_: Description, content, message

**Task Text Editing**:
The dashboard-driven action where the streamer changes the text displayed for an existing task without changing its task source or task owner.
_Avoid_: Rewrite, correction mode

**Task Source**:
The origin of a task, such as viewer chat or streamer dashboard.
_Avoid_: Input type, creator type

**Active Task**:
A task that is still open and counts against task list and task owner limits.
_Avoid_: Open todo, pending item

**Viewer**:
A Twitch chat participant who can submit chat commands to the widget.
_Avoid_: User, chatter

**Streamer**:
The person who owns a streamer profile and can manage that profile through the dashboard.
_Avoid_: User, admin

**Chat Command**:
A chat message that asks the widget to change or manage the task list.
_Avoid_: Widget command, action

**Chat Command Handler**:
The process that receives chat commands and writes authorized changes to task list state.
_Avoid_: Hosted overlay, renderer

**Command Conflict**:
A situation where active widgets in the same streamer profile use the same chat command for different behaviors.
_Avoid_: Duplicate command, command collision

**Ignored Command**:
A chat command that causes no visible change because it fails a widget rule.
_Avoid_: Rejected command, invalid command

**Command Log**:
The dashboard-private record of chat commands and their processing outcomes.
_Avoid_: Task history, chat transcript

**Silent Command Handling**:
The widget behavior where chat commands never produce chat replies, whether they succeed or are ignored.
_Avoid_: No feedback, quiet mode

**Chat-Driven Task Management**:
The product model where task creation and management happen through chat commands rather than a production control panel.
_Avoid_: Admin panel workflow, manual widget control

**Dashboard-Driven Task Management**:
The product model where the streamer manages the task list from a dashboard rather than through chat commands.
_Avoid_: Admin panel workflow, manual widget control

**Task Intake Mode**:
The rule that determines where new tasks can come from: chat, dashboard, or both.
_Avoid_: Submission mode, input source

**Hybrid Task Intake**:
A task intake mode where viewers can submit tasks through chat and the streamer can manage tasks from the dashboard.
_Avoid_: Mixed mode

**Task Owner**:
The viewer who created a task through chat and has owner-level control over that task.
_Avoid_: Submitter, creator, private identifier

**Task Author Label**:
The public display label shown with a task in the task overlay, usually the task owner's display name or the streamer profile name.
_Avoid_: Task owner, task source, private identifier

**Task Owner Capacity**:
The maximum number of active tasks a task owner can have at one time.
_Avoid_: Per-user limit, owner quota

**Task Manager**:
A trusted channel actor who can complete, remove, or reset tasks beyond task ownership rules.
_Avoid_: Admin, dashboard manager, moderator

**Task List**:
The oldest-first ordered collection of tasks currently visible or pending visibility in the overlay.
_Avoid_: Todo list, board

**Task List Cycle**:
The period of task numbering from one task list reset until the next task list reset.
_Avoid_: Session, batch

**Task Capacity**:
The maximum number of active tasks the task list can accept at one time.
_Avoid_: Limit, max tasks

**Task Overlay**:
The stream-visible interface that displays the task list.
_Avoid_: Widget, panel

**Core Task Overlay Behavior**:
The task overlay behavior that should remain consistent across StreamElements install and hosted overlay experiences.
_Avoid_: Platform-only behavior, implementation parity

**Widget Platform**:
The product model where streamers manage one or more stream-facing feature units from a dashboard and publish them through one overlay link.
_Avoid_: Widget app, overlay builder

**Streamer Profile**:
The public streaming identity that owns the overlay link and the set of widgets shown for that link.
_Avoid_: Account, channel, scene

**Overlay Link**:
The single public URL for a streamer profile that renders the profile's active widgets.
_Avoid_: Scene link, widget link

**Regenerated Overlay Link**:
A replacement overlay link created when the streamer wants the previous overlay link to stop working.
_Avoid_: Password reset, token refresh

**Hosted Overlay**:
An overlay experience served directly by the widget platform through an overlay link.
_Avoid_: StreamElements install, copied widget

**Saved Preview**:
A dashboard preview that renders the same saved overlay state used by the hosted overlay.
_Avoid_: Draft preview, form preview

**Draft Preview**:
A dashboard preview that renders unpublished dashboard changes before they become overlay state.
_Avoid_: Saved preview

**StreamElements Install**:
The current distribution model where streamers copy widget files into StreamElements.
_Avoid_: Hosted overlay

**Overlay State**:
The complete current public-read state for a streamer profile that determines what its overlay link renders and contains only data safe to show on stream.
_Avoid_: Snapshot, payload, API response

**Overlay Summary**:
Public-read derived state for a streamer profile that combines information across widgets without making widgets depend on each other directly.
_Avoid_: Shared widget state, global widget data

**Widget**:
A platform-managed feature unit that can be configured and rendered into a stream-facing overlay experience.
_Avoid_: Panel, component

**Active Widget**:
A widget that is currently included in overlay state and rendered through the overlay link.
_Avoid_: Enabled widget, visible widget

**Task Widget**:
A widget that manages and renders a task list as a task overlay.
_Avoid_: Todo widget

**Theme Preset**:
A field-driven visual style for the task overlay that changes presentation without changing task behavior.
_Avoid_: Skin, CSS theme

**Quest Mode**:
Configurable wording that presents tasks as quests, missions, or challenges while keeping the same underlying task model.
_Avoid_: Quest entity, separate task type

**Layout Mode**:
A field-driven presentation variant that changes the shape of the task overlay while preserving the same task list state and chat commands.
_Avoid_: Scene, template

**Panel Image**:
An optional background asset used to brand the task overlay surface without changing task behavior.
_Avoid_: Wallpaper, skin

**Frame Image**:
An optional overlay asset used for borders, corners, or stream-package framing around the task overlay.
_Avoid_: Border theme, wrapper

**Task Icon Image**:
An optional small asset displayed beside each task for branding or theme flavor.
_Avoid_: Bullet, emoji

**Voting Mode**:
An optional task overlay mode where viewers can vote for active tasks through a chat command.
_Avoid_: Poll mode, ranking mode

**Task Vote**:
A viewer's persisted preference for one active task in Voting Mode.
_Avoid_: Like, upvote, public voter list

**Vote Priority Sort**:
An optional visual ordering rule that places higher-voted active tasks earlier without changing task numbers.
_Avoid_: Re-numbering, vote ranking

**Task Number**:
The stable visible number used to refer to a task in chat commands during one task list cycle.
_Avoid_: Task ID, position, handle

**Completed Task**:
A task marked as done that remains briefly visible before leaving the task list.
_Avoid_: Done item, finished todo

**Task History**:
The dashboard-private record of tasks that are no longer active in the task overlay.
_Avoid_: Archive, log

**Removed Task**:
A task taken out of the task list without being completed.
_Avoid_: Deleted task, hidden task

**Task List Reset**:
A task manager or streamer action that clears the task list and starts task numbering again without clearing task history.
_Avoid_: Clear session, wipe
