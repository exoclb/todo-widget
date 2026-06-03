## Parent

https://github.com/exoclb/todo-widget/issues/1

## What to build

Add configurable animated state feedback for Task creation, completion, and removal. The animation layer should make accepted Tasks and Completed Tasks feel visible and rewarding while keeping Removed Tasks quieter for moderation-sensitive flows. Silent Command Handling must remain unchanged.

## Acceptance criteria

- [ ] StreamElements fields expose animation enablement and speed controls with sensible defaults.
- [ ] New Tasks animate into the Task Overlay when animations are enabled.
- [ ] Completed Tasks show a clear completion state before leaving the Task List.
- [ ] Removed Tasks leave without an attention-grabbing completion animation.
- [ ] Reduced-motion preferences and disabled animation settings produce a stable, readable overlay.
- [ ] Local preview can toggle animation settings and manually exercise add, complete, and remove states.
- [ ] README documents animation controls and notes that chat replies remain silent.

## Blocked by

- https://github.com/exoclb/todo-widget/issues/2
