## Parent

https://github.com/exoclb/todo-widget/issues/1

## What to build

Add optional Voting Mode so Viewers can vote for Active Tasks through a Chat Command while Task Managers retain final control. Vote counts may influence visual priority when enabled, but Task Numbers must remain stable and Silent Command Handling must remain the default production behavior.

## Acceptance criteria

- [ ] StreamElements fields expose Voting Mode enablement, vote command, vote cooldown, duplicate vote behavior, and optional priority sort controls.
- [ ] When Voting Mode is disabled, vote commands are Ignored Commands.
- [ ] When Voting Mode is enabled, valid vote commands update vote counts on the targeted Active Task.
- [ ] Vote Eligibility handles missing Task Numbers, non-active Tasks, duplicate votes, changed votes when allowed, and cooldowns.
- [ ] Task Managers can still complete, remove, and reset Tasks regardless of vote counts.
- [ ] Task Numbers remain stable when priority sort changes the visual order.
- [ ] Vote data persists through StreamElements storage and remains compatible with existing Task Lists that have no vote data.
- [ ] Local preview can exercise voting, duplicate votes, priority sorting, completion, removal, and Task List Reset.
- [ ] README documents Voting Mode commands, limits, and stable Task Number behavior.

## Blocked by

- https://github.com/exoclb/todo-widget/issues/3
