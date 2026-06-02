Status: ready-for-agent
Title: Twitch Todo Widget

## Problem Statement

Twitch streamers need a lightweight way for viewers to contribute stream tasks through chat without turning the overlay into a moderation burden. Viewers should be able to add actionable Tasks, Task Owners should be able to complete or remove their own Tasks, and Task Managers should be able to keep the Task List clean during a live stream.

The Task Overlay must remain compact, readable, and reliable inside StreamElements. It should survive overlay reloads, avoid chat reply noise, and handle busy chat activity without losing state.

## Solution

Build a StreamElements custom widget that provides Chat-Driven Task Management for a compact Task Overlay. Viewers submit Tasks with a configurable add Chat Command. Task Owners can complete or remove their own Tasks, while Task Managers can complete, remove, or reset Tasks beyond ownership rules.

The widget uses Silent Command Handling: successful and Ignored Commands never produce chat replies. Valid Tasks appear in the Task Overlay, Completed Tasks remain briefly visible before leaving the Task List, and Removed Tasks leave immediately. Task state persists through StreamElements storage in production, with local preview storage as a development fallback.

## User Stories

1. As a streamer, I want a compact Task Overlay, so that stream tasks are visible without covering gameplay or camera content.
2. As a streamer, I want viewers to add Tasks from chat, so that the audience can contribute useful reminders during the stream.
3. As a viewer, I want to submit a Task with a simple Chat Command, so that I can contribute without learning a complex workflow.
4. As a viewer, I want eligible Tasks to appear in the Task Overlay, so that I can see that my contribution was accepted.
5. As a viewer, I want my Task to show my name, so that ownership is clear to me and the streamer.
6. As a Task Owner, I want to complete my own Task, so that I can mark it done when the stream has addressed it.
7. As a Task Owner, I want to remove my own Task, so that I can correct a typo or withdraw an irrelevant Task.
8. As a Task Owner, I want other viewers to be unable to complete my Task, so that ownership rules are respected.
9. As a Task Owner, I want other viewers to be unable to remove my Task, so that Tasks are not disrupted by unrelated chat participants.
10. As a Task Manager, I want to complete any Task, so that I can keep the Task List accurate during the stream.
11. As a Task Manager, I want to remove any Task, so that spam, mistakes, or uncomfortable content can leave the Task List immediately.
12. As a Task Manager, I want to reset the Task List, so that I can start a new stream segment with fresh numbering.
13. As a streamer, I want Task Numbers to stay stable while Tasks are completed or removed, so that chat commands do not target the wrong Task.
14. As a viewer, I want to refer to Tasks by visible Task Number, so that completion and removal commands are easy to understand.
15. As a streamer, I want Task Numbers to restart after a Task List Reset, so that a new segment feels clean.
16. As a viewer, I want Completed Tasks to remain visible briefly, so that completion feels acknowledged without chat replies.
17. As a streamer, I want Completed Tasks to leave automatically, so that old Tasks do not clutter the Task Overlay.
18. As a streamer, I want Removed Tasks to leave immediately, so that moderation actions are fast and quiet.
19. As a streamer, I want a Task Capacity, so that the Task Overlay cannot grow beyond a readable size.
20. As a streamer, I want Task Capacity to count only Active Tasks, so that Completed Tasks waiting to leave do not block new useful Tasks.
21. As a streamer, I want a Task Owner Capacity, so that one viewer cannot fill the Task List.
22. As a viewer, I want Completed Tasks not to count against my Task Owner Capacity, so that I can submit a new Task once an old one is done.
23. As a streamer, I want cooldowns for viewer Task creation, so that the Task List is protected from bursts.
24. As a Task Manager, I want to bypass throughput limits, so that I can manage stream Tasks quickly.
25. As a streamer, I want Task Managers to still follow content eligibility rules, so that unsafe Task Text does not appear just because it came from a trusted actor.
26. As a streamer, I want link-containing Task Text to be ignored, so that unsafe URLs are not shown on stream.
27. As a streamer, I want configurable blacklisted words, so that channel-specific unwanted Task Text can be prevented.
28. As a viewer, I want emoji and mentions to be allowed, so that natural chat language can still become a Task.
29. As a streamer, I want long Task Text to be constrained, so that the Task Overlay remains readable.
30. As a streamer, I want Ignored Commands to produce no overlay feedback, so that failed attempts do not distract the stream.
31. As a streamer, I want Ignored Commands to produce no chat replies, so that the widget does not create chat noise or amplify spam attempts.
32. As a developer, I want debug logging during preview or troubleshooting, so that ignored behavior can be diagnosed without changing production UX.
33. As a streamer, I want the Task Overlay header to be configurable, so that it can fit my stream language and branding.
34. As a streamer, I want the Task Overlay to show active capacity, so that I can see how full the list is.
35. As a streamer, I want an empty state, so that I know the widget is active when there are no Tasks.
36. As a streamer, I want the corner position to be configurable, so that the Task Overlay fits different stream scenes.
37. As a streamer, I want theme presets and accent color configuration, so that the Task Overlay matches my channel style.
38. As a streamer, I want the font to be configurable, so that the Task Overlay can match my visual identity.
39. As a streamer, I want width and opacity controls, so that the Task Overlay stays readable over different content.
40. As a streamer, I want animations to be configurable, so that the overlay can be lively or restrained depending on the scene.
41. As a developer, I want a local preview, so that Task behavior can be tested without going live in StreamElements.
42. As a developer, I want the local preview to simulate Viewer, Task Owner, and Task Manager roles, so that permission rules can be tested quickly.
43. As a developer, I want quick preview actions, so that common Task List states can be tested without repetitive typing.
44. As a developer, I want local storage fallback only for preview, so that production behavior still aligns with StreamElements.
45. As a future maintainer, I want the widget terminology to match the glossary, so that domain language stays consistent.
46. As a future maintainer, I want architectural decisions recorded, so that storage and command processing choices are not accidentally undone.
47. As a streamer, I want the widget to target Twitch while parsing events defensively, so that it works for the intended platform and remains tolerant of StreamElements event shape differences.
48. As a streamer, I want command names to be configurable, so that the widget can avoid conflicts with existing channel commands.
49. As a viewer, I want commands to be case-insensitive, so that minor capitalization differences do not matter.
50. As a streamer, I want Task Managers to be detected from badges when possible and configured by fallback usernames when needed, so that permissions remain practical in StreamElements.

## Implementation Decisions

- The project is a StreamElements custom widget with separate markup, styling, behavior, field configuration, local preview, README, glossary, and ADR documentation.
- The production interaction model is Chat-Driven Task Management. There is no production control panel in v1.
- The add, complete, remove, and reset Chat Commands are configurable. Defaults are `!task`, `!done`, `!delete`, and `!taskreset`.
- The visible `!delete` command remains named for chat familiarity, but the domain effect is to remove a Task.
- Task Numbers are stable public references and do not change when other Tasks are completed or removed.
- A Task List Reset clears the Task List and starts Task Numbering again.
- Task state persists in StreamElements storage in production, with local preview storage only as a fallback, per ADR-0001.
- State-changing Chat Commands are processed sequentially to avoid overwrites from asynchronous storage operations, per ADR-0002.
- Task Eligibility applies only to viewer submissions becoming Active Tasks.
- Task Eligibility rejects empty Task Text, overly long Task Text, Task Text with links, Task Text with blacklisted words, submissions over Task Capacity, submissions over Task Owner Capacity, and submissions blocked by cooldown.
- Silent Command Handling applies to all successful and Ignored Commands. The widget does not send chat replies.
- Ignored Commands do not display failure feedback in the Task Overlay.
- Task Managers can complete, remove, and reset beyond ownership rules.
- Task Managers bypass throughput limits but still obey content eligibility rules.
- Completed Tasks remain briefly visible before leaving the Task List.
- Removed Tasks leave immediately without a completed-style visual moment.
- The Task Overlay is compact, corner-positioned, and configurable for title, empty text, theme, font, accent color, width, opacity, animation, and capacity.
- Local preview simulates chat identity and role, exercises the same command behavior as production, and includes quick actions for manual QA.
- The domain glossary is the canonical vocabulary for Task, Active Task, Completed Task, Removed Task, Task Owner, Task Manager, Task List, Task Number, Task Capacity, Task Overlay, Chat Command, Ignored Command, and Silent Command Handling.

## Testing Decisions

- Tests should assert external behavior: what appears in the Task Overlay, which Chat Commands change the Task List, which commands become Ignored Commands, and how storage state survives reload-like initialization.
- Tests should avoid asserting private implementation details such as helper function internals or exact intermediate queue mechanics.
- The highest-value seam is the command-processing behavior from chat event input to persisted task state and rendered Task Overlay output.
- The storage seam should be tested with both a StreamElements-like asynchronous store and a local fallback store.
- The rendering seam should verify stable Task Numbers, oldest-first Task List ordering, Active Task capacity, Completed Task visibility, and immediate removal behavior.
- The permission seam should verify Viewer, Task Owner, and Task Manager behavior for add, complete, remove, and reset commands.
- The Task Eligibility seam should verify empty text, long text, link rejection, blacklist rejection, Task Capacity, Task Owner Capacity, global cooldown, and per-owner cooldown.
- The local preview should remain the primary manual QA seam until an automated browser test suite is added.
- There is no existing automated test suite in the repo, so future tests should start at the public widget API or browser preview seam rather than low-level helpers.
- Manual testing should include adding Tasks, completing Tasks, removing Tasks, resetting the Task List, role switching, filling to Task Capacity, refreshing preview storage, and checking that Ignored Commands only appear in debug logs.

## Out of Scope

- Viewer-submitted Tasks requiring approval before becoming Active Tasks.
- Editing Task Text after creation.
- Task categories, priority, labels, or color-coding by Task type.
- Reordering Tasks manually.
- Production control panel or admin dashboard.
- Chat replies for successful or Ignored Commands.
- Audit history for Completed Tasks, Removed Tasks, or Task List Reset.
- Full multi-platform support beyond defensive StreamElements event parsing for a Twitch-focused widget.
- Automated test framework setup beyond the testing seams described here.
- Integration with external bots, databases, Twitch APIs, or moderation services.

## Further Notes

- The local issue tracker status for this PRD is `ready-for-agent`.
- The current implementation already includes the v1 widget and local preview, so this PRD primarily records the product contract and future maintenance target.
- If the widget grows beyond v1, the next likely domain additions are Task Approval, Pending Task, and richer Task Manager tooling.
