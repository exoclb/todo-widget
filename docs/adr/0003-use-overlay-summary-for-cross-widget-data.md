# Use Overlay Summary for cross-widget data

Widgets must not read each other's state directly. When a widget needs information
that combines data across widgets, the platform should expose that information as an
overlay summary owned by the streamer profile.

This keeps widgets modular and allows a streamer to add, remove, or rearrange widget
types without creating hidden dependencies between them. It also keeps the public
overlay boundary clear: cross-widget data must be safe to show on stream before it is
included in overlay state.

The trade-off is that some derived values require an extra summary step instead of a
direct widget-to-widget lookup. That indirection is acceptable because the platform is
expected to support multiple widget types over time.
