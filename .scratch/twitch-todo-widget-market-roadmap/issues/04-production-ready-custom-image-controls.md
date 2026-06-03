## Parent

https://github.com/exoclb/todo-widget/issues/1

## What to build

Expand custom image support so streamers can brand the Task Overlay with optional panel, frame, and task icon images. Empty image settings should preserve the polished default overlay, and all image controls should keep Task Text readable.

## Acceptance criteria

- [ ] StreamElements fields expose optional frame image and task icon image controls in addition to the existing panel image controls.
- [ ] Image opacity and fit behavior keep Task Text readable across supported Theme Presets.
- [ ] Empty, missing, or disabled image settings fall back to the default overlay presentation.
- [ ] Local preview supports testing panel, frame, and icon image URLs.
- [ ] Custom image rendering does not block preview controls or Task Overlay interactions.
- [ ] README documents custom image setup and recommended asset guidance.

## Blocked by

- https://github.com/exoclb/todo-widget/issues/2
