# Use StreamElements store for task persistence

Task state persists through StreamElements `SE_API.store` in production, with `localStorage` only as a local preview fallback. The widget is intended to run inside StreamElements and should survive overlay reloads without relying on browser-local preview storage.
