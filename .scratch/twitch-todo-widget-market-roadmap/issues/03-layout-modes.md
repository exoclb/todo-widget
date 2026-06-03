## Parent

https://github.com/exoclb/todo-widget/issues/1

## What to build

Add Layout Modes for common OBS scene needs while preserving one shared Task List state and the same Chat Commands. Streamers should be able to switch between compact sidebar, horizontal ticker, and large board layouts without resetting Tasks or changing viewer behavior.

## Acceptance criteria

- [ ] StreamElements fields expose a Layout Mode selector with compact sidebar, horizontal ticker, and large board options.
- [ ] Each layout renders the same Task List state, Task Numbers, Task Owners, and completion/removal behavior.
- [ ] Switching layout modes does not reset persisted Task state.
- [ ] Horizontal ticker and large board layouts remain readable at common overlay sizes.
- [ ] Local preview includes a Layout Mode control and demonstrates every mode.
- [ ] README documents recommended scene use cases for each layout.

## Blocked by

- https://github.com/exoclb/todo-widget/issues/2
