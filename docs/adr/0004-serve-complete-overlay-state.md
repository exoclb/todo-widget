# Serve complete overlay state

The overlay should read one complete overlay state for a streamer profile instead of
fetching each widget's data separately.

This matches the product model of one overlay link per streamer profile. It keeps OBS
and browser-source rendering predictable, reduces request coordination inside the
overlay, and gives the platform one clear public-read boundary for data that is safe
to show on stream.

The trade-off is that the state response can become larger as more widgets are added.
That is acceptable for the platform's early stages because consistency and simplicity
matter more than per-widget network optimization. If the response becomes too large,
the platform can optimize the complete state later without changing the domain model.
