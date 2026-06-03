## Parent

https://github.com/exoclb/todo-widget/issues/1

## What to build

Add a lightweight smoke test harness for the widget and local preview so future market-facing changes can be verified without a heavy build system. The harness should validate configuration JSON, render the preview, exercise core Chat Commands, and catch blank or blocked overlay states.

## Acceptance criteria

- [ ] A documented smoke test command validates widget field JSON.
- [ ] The smoke test renders local preview in a browser-capable environment when available.
- [ ] The smoke test exercises add, complete, remove, and reset behavior through the preview or public widget API.
- [ ] The smoke test checks that the Task Overlay is nonblank after initialization.
- [ ] The smoke test checks that preview controls remain usable and are not covered by the overlay.
- [ ] The smoke test is documented in README with any local environment requirements.

## Blocked by

- https://github.com/exoclb/todo-widget/issues/2
