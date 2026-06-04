# Twitch Todo Widget Setup Guide

This guide is for streamers who want to install the Twitch Todo Widget in StreamElements, test it safely, and go live with the default chat commands.

## What You Need

- A StreamElements account.
- A StreamElements overlay for your Twitch channel.
- These widget files from this project:
  - `widget.html`
  - `widget.css`
  - `widget.js`
  - `widget.json`

You do not need a separate database, dashboard, or server. The widget runs inside StreamElements and stores tasks through StreamElements storage when available.

## Quick Install

1. Open your StreamElements overlay.
2. Add a custom widget.
3. Open the custom widget editor.
4. Copy the full contents of `widget.html` into the HTML tab.
5. Copy the full contents of `widget.css` into the CSS tab.
6. Copy the full contents of `widget.js` into the JS tab.
7. Copy the full contents of `widget.json` into the Fields tab.
8. Save the widget.

After saving, StreamElements should show the widget fields grouped by Content, Commands, Voting, Limits, Moderation, Appearance, Images, and Debug.

## First Setup

Start with these safe defaults before customizing the widget:

- Theme Preset: `Material dark` or `Material light`
- Layout Mode: `Compact sidebar`
- Position: `Top right`
- Max active tasks: `10`
- Max list height: `260`
- Hide scrollbar: `Enabled`
- Voting Mode: `Disabled`
- Debug mode: `Enabled`
- Show debug overlay: `Enabled`

For the title, use either:

- Title display: `Title text`, then set Title text to something like `STREAM TASKS`.
- Title display: `Digital clock`, then choose `24-hour` or `12-hour`.

Keep the command fields unchanged for the first test:

- Add command: `!task`
- Done command: `!done`
- Remove command: `!delete`
- Reset command: `!taskreset`

## First Test In StreamElements

Use this test before adding the overlay to OBS:

1. Enable `Debug mode`.
2. Enable `Show debug overlay`.
3. Press the Diagnostic button in the widget fields.
4. Confirm that a diagnostic task appears on the widget.
5. Open Twitch chat and send:

```text
!task test task
```

6. Confirm that the task appears on the widget.
7. Complete the visible task number:

```text
!done 1
```

8. Add another task, then remove it:

```text
!task remove me
!delete 2
```

Task numbers are stable. If the widget shows `#7`, use `!done 7`, `!delete 7`, or `!vote 7`.

## OBS Or Live Overlay Setup

After the StreamElements test works:

1. Add your StreamElements overlay to OBS as a browser source.
2. Match the browser source size to your stream canvas, such as `1920x1080`.
3. Refresh the browser source after every widget update.
4. Check the widget position on your main scene.
5. Turn `Debug mode` off.
6. Turn `Show debug overlay` off.

Keep debug controls off during normal streams so viewers only see the task overlay.

## Updating The Widget Later

When you update the widget, copy all four files again:

- `widget.html`
- `widget.css`
- `widget.js`
- `widget.json`

Different fixes live in different files. For example, command behavior usually lives in `widget.js`, layout and position fixes usually live in `widget.css`, and new StreamElements fields live in `widget.json`.

After updating, save the custom widget, refresh the overlay, and refresh the OBS browser source.

## Common Problems

### The Widget Does Not Show

- Confirm `widget.html`, `widget.css`, `widget.js`, and `widget.json` were all copied.
- Save the custom widget after pasting the code.
- Refresh the StreamElements overlay preview.
- Refresh the OBS browser source if you are testing in OBS.

### Chat Commands Do Not Add Tasks

- Enable `Debug mode` and `Show debug overlay`.
- Send `!task test task` in Twitch chat.
- If the overlay says the command was ignored because of cooldown or capacity, lower `globalCooldownSeconds`, `userCooldownSeconds`, `perUserTaskLimit`, or `maxTasks` while testing.
- If the overlay says the listener is ignored, confirm the message is coming from live Twitch chat, not only a StreamElements test event that does not include chat text.
- Use the Diagnostic button to confirm the widget can add a task without relying on chat.

### Tasks Appear In Preview But Not OBS

- Refresh the OBS browser source.
- Check that OBS is using the correct StreamElements overlay URL.
- Make sure the widget is not hidden behind another source.
- Test with `Debug mode` on, then turn it off after the problem is fixed.

### Bottom Positions Look Wrong

- Confirm the latest `widget.css` was copied into StreamElements.
- Save the custom widget.
- Refresh the overlay preview.
- Refresh the OBS browser source cache.
- Re-select the Position field, such as `Bottom right` or `Bottom left`.

### The List Gets Too Tall

- Lower `Max list height`.
- Keep `Hide scrollbar` enabled if you want a cleaner overlay.
- Leave auto-scroll enabled by keeping the compact or board layout and allowing the list to overflow.
- Use a lower `Max active tasks` value if the overlay should stay very small.

### You See A Sandboxed localStorage Warning

This can happen in the StreamElements editor preview. The widget should fall back to temporary memory storage so tasks can still display during testing. In the live overlay or OBS browser source, StreamElements storage should handle persistence.

## Optional Features

### Voting Mode

Voting Mode lets viewers vote for active tasks with:

```text
!vote <task number>
```

Keep Voting Mode disabled for your first install. Enable it later if you want viewers to prioritize tasks, quests, missions, or challenges.

### Custom Images

Use image fields only after the basic widget works:

- Panel image: texture or background behind the widget.
- Frame image: transparent PNG/WebP border or stream package frame.
- Task icon image: small icon shown beside each task.

Keep image opacity low enough that task text stays readable.

## Going Live Checklist

- The Diagnostic button adds a task.
- `!task test task` works from Twitch chat.
- `!done <number>` works for the streamer or task owner.
- The widget position is correct in OBS.
- The task list does not cover important gameplay or camera areas.
- Debug mode is off.
- Show debug overlay is off.
