## Parent

https://github.com/exoclb/todo-widget/issues/1

## What to build

Add field-driven Theme Presets and Quest Mode so the Task Overlay can look polished and use stream-friendly wording without changing the underlying Task model. Streamers should be able to choose a preset visual style, adjust existing brand controls, and present the same Task List as Tasks, Quests, Missions, or Challenges in both StreamElements and local preview.

## Acceptance criteria

- [ ] StreamElements fields expose Theme Preset and Quest Mode wording controls with sensible defaults.
- [ ] The Task Overlay renders at least minimal, cozy, neon, RPG quest board, and VTuber-friendly presets without layout shifts or unreadable text.
- [ ] Quest Mode changes visible labels/header copy while preserving Task state, Task Numbers, Chat Commands, and Task Manager behavior.
- [ ] Local preview includes controls for Theme Preset and Quest Mode and applies them without reloading the page.
- [ ] README documents the new preset and wording controls.
- [ ] Widget field JSON validates and the local preview renders nonblank after switching every preset.

## Blocked by

None - can start immediately
