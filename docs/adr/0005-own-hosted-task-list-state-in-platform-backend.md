# Own hosted Task List State in the Widget Platform backend

For the hosted platform, the Widget Platform backend owns Task List State so Dashboard-Driven Task Management and Chat-Driven Task Management write to the same state. Hosted Overlay and Saved Preview read Overlay State derived from that state, and dashboard writes must not target `widgets[].data.todos` directly because Overlay State is the public-read projection, while StreamElements storage remains only the current StreamElements Install persistence path.
