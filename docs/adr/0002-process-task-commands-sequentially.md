# Process task commands sequentially

Chat commands that change task state are processed through a sequential queue because StreamElements storage operations are asynchronous. This adds a small amount of control-flow complexity but reduces the risk of simultaneous commands overwriting each other during busy chat activity.
