Status: ready-for-agent
Title: Market-Aligned Twitch Todo Widget Enhancements

## Problem Statement

The current Twitch Todo Widget is functional and public-ready as a compact Task Overlay for Chat-Driven Task Management. However, stream widget buyers and users often choose widgets based on presentation quality, theme flexibility, engagement loops, and ease of setup, not only raw task behavior.

Streamers need the Task Overlay to feel like a polished stream product that can match their channel brand, encourage viewer participation, and fit different OBS scenes. Viewers need the Task List to feel rewarding and easy to interact with, while Task Managers need the extra features to remain predictable during a live stream.

Without market-aligned enhancements, the widget risks being useful but visually generic. It may be harder to position publicly against common stream widgets such as goal widgets, chat overlays, event lists, animated overlays, timers, and marketplace theme packs.

## Solution

Evolve the widget from a basic Twitch todo overlay into a configurable interactive stream task product. The next version should preserve the existing Chat-Driven Task Management model while adding market-facing features: theme presets, quest-style wording, animated state changes, optional voting or priority, richer custom image support, multiple layout modes, and stronger public packaging.

The first enhancement pass should focus on features with high perceived value and controlled technical risk:

- Theme presets that make the Task Overlay feel designed out of the box.
- Quest Mode copy controls that let streamers present Tasks as Quests, Missions, or Challenges.
- Animated state feedback for added, completed, and removed Tasks.
- Optional Voting Mode that lets viewers influence Task priority without replacing Task Manager control.
- Improved setup and marketplace-style documentation with screenshots or demo media.

All enhancements must respect the existing domain model: Task Numbers remain stable, Silent Command Handling remains the default production behavior, Task Managers keep override control, StreamElements storage remains the production persistence seam, and state-changing Chat Commands continue to be processed sequentially.

## User Stories

1. As a streamer, I want polished theme presets, so that the Task Overlay looks good without custom CSS work.
2. As a streamer, I want a minimal theme preset, so that the Task Overlay can fit clean gameplay scenes.
3. As a streamer, I want a cozy theme preset, so that the Task Overlay can fit relaxed chatting or art streams.
4. As a streamer, I want a neon theme preset, so that the Task Overlay can fit energetic gaming scenes.
5. As a streamer, I want an RPG quest board theme preset, so that viewer Tasks feel like stream Quests.
6. As a streamer, I want a cute VTuber-friendly theme preset, so that the Task Overlay can fit character-led streams.
7. As a streamer, I want theme presets to work with existing accent color controls, so that I can customize without losing the preset style.
8. As a streamer, I want theme presets to keep text readable, so that Tasks stay clear over gameplay.
9. As a streamer, I want theme presets to avoid layout shifts, so that the Task Overlay feels stable during stream.
10. As a streamer, I want to rename the Task Overlay title, so that it matches my stream segment.
11. As a streamer, I want Quest Mode, so that the Task List can be presented as a Quest Board.
12. As a streamer, I want Mission Mode, so that the widget can fit challenge or speedrun streams.
13. As a streamer, I want Challenge Mode, so that viewer submissions feel playful and participatory.
14. As a streamer, I want labels such as Task, Quest, Mission, or Challenge to be configurable, so that I can match my channel language.
15. As a viewer, I want submitted Tasks to feel acknowledged visually, so that adding one feels rewarding even without chat replies.
16. As a viewer, I want a new Task to animate into the Task List, so that I can notice when it appears.
17. As a viewer, I want a Completed Task to show a clear completion animation, so that the stream moment feels satisfying.
18. As a streamer, I want Removed Tasks to leave quietly, so that moderation actions do not draw extra attention.
19. As a streamer, I want animations to be optional, so that I can use the widget in calm or low-motion scenes.
20. As a streamer, I want reduced-motion support, so that the overlay is comfortable for sensitive viewers.
21. As a streamer, I want animation speed controls, so that the overlay matches my stream pacing.
22. As a streamer, I want optional sound-free visual feedback, so that the widget adds energy without audio clutter.
23. As a viewer, I want to vote for a Task, so that I can influence what the streamer handles next.
24. As a viewer, I want voting to use a simple Chat Command, so that I can participate quickly.
25. As a viewer, I want to see vote counts on Tasks, so that I understand what the audience prefers.
26. As a streamer, I want Voting Mode to be optional, so that the Task Overlay can stay simple when needed.
27. As a Task Manager, I want to keep final control over completion and removal, so that votes do not override moderation.
28. As a Task Manager, I want to reset votes when the Task List is reset, so that a new segment starts clean.
29. As a streamer, I want vote cooldowns, so that one viewer cannot spam priority changes.
30. As a streamer, I want one vote per viewer per Task when enabled, so that voting feels fair.
31. As a streamer, I want a setting to allow viewers to change their vote, so that the audience can react as the stream changes.
32. As a streamer, I want vote counts to be hidden when Voting Mode is off, so that the display stays uncluttered.
33. As a streamer, I want Tasks to remain oldest-first by default, so that existing behavior stays predictable.
34. As a streamer, I want an optional priority sort based on votes, so that the most wanted Tasks can rise visually.
35. As a Task Manager, I want stable Task Numbers even when priority sorting is enabled, so that Chat Commands still target the correct Task.
36. As a viewer, I want Task Numbers to remain stable, so that I can vote, complete, or reference the right Task.
37. As a streamer, I want multiple layout modes, so that the widget fits different OBS scenes.
38. As a streamer, I want a compact sidebar layout, so that the Task Overlay fits beside gameplay.
39. As a streamer, I want a horizontal ticker layout, so that Tasks can fit along the top or bottom of the screen.
40. As a streamer, I want a large board layout, so that intermission or chatting scenes can feature the Task List prominently.
41. As a streamer, I want layout modes to share the same Task state, so that scene changes do not reset Tasks.
42. As a streamer, I want layout modes to preserve the same Chat Commands, so that viewers do not need to relearn interaction.
43. As a streamer, I want custom panel image support to feel production-ready, so that I can brand the Task Overlay with my own artwork.
44. As a streamer, I want custom frame images, so that the Task Overlay can match purchased overlay packs.
45. As a streamer, I want custom icon images, so that Task rows can have unique visual identity.
46. As a streamer, I want image opacity controls, so that text remains readable.
47. As a streamer, I want cover and contain image fit modes, so that artwork can be used without distortion.
48. As a streamer, I want image settings to degrade gracefully when empty, so that the default widget still looks polished.
49. As a streamer, I want marketplace-style screenshots in the public README, so that I can judge the widget before installing it.
50. As a streamer, I want a short setup guide, so that I can install the widget in StreamElements without reading source code.
51. As a streamer, I want example field settings for common themes, so that configuration feels approachable.
52. As a streamer, I want a local preview demo to show theme changes, so that I can test before touching StreamElements.
53. As a developer, I want preview controls for theme presets, layout modes, animation settings, and Voting Mode, so that manual QA covers market-facing behavior.
54. As a developer, I want automated smoke checks for widget configuration, so that invalid field schemas are caught early.
55. As a developer, I want browser smoke checks for visual states, so that theme and animation changes do not leave the overlay blank.
56. As a developer, I want the command-processing behavior to remain tested at the chat event seam, so that new features do not break existing Task behavior.
57. As a developer, I want Voting Mode to reuse the sequential command queue, so that simultaneous votes and Task changes do not overwrite state.
58. As a developer, I want theme and layout code to avoid duplicating Task behavior, so that visual variants remain maintainable.
59. As a future maintainer, I want new vocabulary documented when needed, so that terms like Quest Mode and Voting Mode stay clear.
60. As a future maintainer, I want ADRs updated only for durable architecture decisions, so that documentation stays useful.
61. As a public user, I want the repository to explain what is implemented and what is planned, so that expectations are clear.
62. As a public user, I want known limitations documented, so that I can decide whether the widget fits my stream.
63. As a public user, I want the widget to remain easy to copy into StreamElements, so that the setup flow stays practical.
64. As a streamer, I want all new interaction features to preserve Silent Command Handling by default, so that the widget does not create chat noise.
65. As a streamer, I want debug logs to explain ignored votes or invalid settings during testing, so that troubleshooting remains possible.

## Implementation Decisions

- Preserve the existing StreamElements custom widget architecture with separate markup, styling, behavior, field configuration, and local preview surfaces.
- Treat this PRD as an enhancement roadmap for a public widget product, not a replacement for the implemented v1 Task Overlay.
- Keep Chat-Driven Task Management as the primary production model.
- Keep Silent Command Handling as the default for successful and Ignored Commands, including new Voting Mode commands.
- Keep StreamElements storage as the production persistence mechanism, with local preview storage only as a development fallback.
- Continue processing state-changing Chat Commands through the sequential command queue to avoid asynchronous store overwrites.
- Add theme presets as field-driven presentation options rather than separate widget builds.
- Add Quest Mode as configurable wording and visual framing. It should not create a separate Task state model.
- Treat Task, Quest, Mission, and Challenge as presentation labels for the same underlying Task entity unless a future PRD explicitly adds separate domain behavior.
- Add animated state feedback through CSS classes and configuration fields, not by changing Task persistence semantics.
- Keep Removed Task behavior visually quieter than Completed Task behavior to avoid amplifying moderation actions.
- Add Voting Mode as optional behavior. When disabled, vote commands should be Ignored Commands.
- Add vote data to persisted Task state only when Voting Mode needs it, while preserving compatibility with existing stored Task Lists.
- Keep Task Numbers stable even if a visual priority sort is introduced.
- Prefer oldest-first Task List ordering as the default. Priority sorting must be opt-in.
- Keep Task Manager authority above votes. Votes can influence display priority but cannot complete, remove, or reset Tasks.
- Reuse existing Task Eligibility and command parsing patterns where applicable, while defining separate Vote Eligibility rules for voting behavior.
- Add layout modes as presentation variants sharing the same Task List state and Chat Commands.
- Extend custom image support incrementally: panel image first, then optional frame and icon image fields.
- Avoid introducing an external database, bot dependency, or Twitch API dependency in this enhancement pass.
- Public packaging should include marketplace-style screenshots or demo media, concise setup instructions, and clear feature status.
- New glossary terms should be added only when they represent durable domain language, such as Voting Mode, Vote Eligibility, Quest Mode, Layout Mode, or Theme Preset.
- A new ADR is only needed if the implementation changes persistence structure, command sequencing, or introduces a durable architectural boundary.

## Testing Decisions

- Tests should assert external behavior: visible Task Overlay state, accepted or Ignored Commands, field-driven presentation changes, and persisted state after reload-like initialization.
- Tests should not lock onto private helper internals, exact animation timing, or CSS implementation details beyond externally visible behavior.
- The highest-value seam remains chat event input to persisted Task List state to rendered Task Overlay output.
- Theme preset tests should verify that each preset can initialize and render a readable Task Overlay without blank states or invalid CSS variables.
- Quest Mode tests should verify presentation labels and header copy without changing underlying Task behavior.
- Animation tests should focus on the presence of the correct visible state and completion/removal lifecycle, not frame-by-frame animation details.
- Voting Mode tests should verify disabled behavior, valid vote commands, vote counts, duplicate vote handling, cooldown behavior, and reset behavior.
- Priority sorting tests should verify that display order can change while Task Numbers remain stable.
- Layout mode tests should verify compact sidebar, horizontal ticker, and large board rendering with the same persisted Task List.
- Custom image tests should verify valid image URL application, empty image fallback, opacity controls, and cover/contain fit modes.
- Preview tests should cover manual workflows for role switching, command entry, theme switching, layout switching, image settings, animation settings, and Voting Mode.
- Configuration tests should validate widget field schema as JSON and catch invalid field types or malformed defaults.
- Browser smoke tests should render the local preview and assert that key overlay surfaces are nonblank and not blocking preview controls.
- Existing manual QA patterns should remain valid: add Task, complete Task, remove Task, reset Task List, test Viewer/Task Owner/Task Manager permissions, fill Task Capacity, and refresh storage.
- Because the repo currently has no package-based automated test runner, the first automated tests should be small browser or scriptable smoke checks that do not require a heavy build system.

## Out of Scope

- Replacing the existing Task model with a separate Quest entity.
- Production admin dashboard or external control panel.
- Required Twitch API integration.
- Required Channel Points integration.
- Monetization, licensing enforcement, or payment handling.
- External database persistence.
- Multi-platform support beyond Twitch-focused StreamElements behavior.
- Audio alerts or sound effect packs.
- Full marketplace storefront publishing.
- Viewer approval queue before Tasks become Active Tasks.
- Task editing after creation.
- Advanced moderation services beyond the existing blacklist and eligibility rules.
- Full automated visual regression infrastructure.

## Further Notes

- This PRD is based on the current public-ready widget and a market scan of common stream widget categories: goals, alerts, chat overlays, event lists, timers, animated overlays, social widgets, and themed marketplace packs.
- The most practical first slice is Theme Presets plus Quest Mode because it increases perceived value without changing core Task persistence.
- The second practical slice is Animated State because it improves stream feel while keeping Silent Command Handling intact.
- Voting Mode should be treated as a larger slice because it adds new persisted data and new command behavior.
- Channel Points integration remains attractive for the future, but it is intentionally out of scope until the widget has stronger visual packaging and a clear public baseline.
