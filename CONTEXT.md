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

**Active Task**:
A task that is still open and counts against task list and task owner limits.
_Avoid_: Open todo, pending item

**Viewer**:
A Twitch chat participant who can submit chat commands to the widget.
_Avoid_: User, chatter

**Chat Command**:
A chat message that asks the widget to change or manage the task list.
_Avoid_: Widget command, action

**Ignored Command**:
A chat command that causes no visible change because it fails a widget rule.
_Avoid_: Rejected command, invalid command

**Silent Command Handling**:
The widget behavior where chat commands never produce chat replies, whether they succeed or are ignored.
_Avoid_: No feedback, quiet mode

**Chat-Driven Task Management**:
The product model where task creation and management happen through chat commands rather than a production control panel.
_Avoid_: Admin panel workflow, manual widget control

**Task Owner**:
The viewer who created a specific task and has owner-level control over that task.
_Avoid_: Submitter, creator

**Task Owner Capacity**:
The maximum number of active tasks a task owner can have at one time.
_Avoid_: Per-user limit, owner quota

**Task Manager**:
A trusted channel actor who can complete, remove, or reset tasks beyond task ownership rules.
_Avoid_: Admin, moderator

**Task List**:
The oldest-first ordered collection of tasks currently visible or pending visibility in the overlay.
_Avoid_: Todo list, board

**Task Capacity**:
The maximum number of active tasks the task list can accept at one time.
_Avoid_: Limit, max tasks

**Task Overlay**:
The stream-visible interface that displays the task list.
_Avoid_: Widget, panel

**Task Number**:
The stable visible number used to refer to a task in chat commands until the task list is reset.
_Avoid_: Task ID, position, handle

**Completed Task**:
A task marked as done that remains briefly visible before leaving the task list.
_Avoid_: Done item, finished todo

**Removed Task**:
A task taken out of the task list without being completed.
_Avoid_: Deleted task, hidden task

**Task List Reset**:
A task manager action that clears the task list and starts task numbering again.
_Avoid_: Clear session, wipe
