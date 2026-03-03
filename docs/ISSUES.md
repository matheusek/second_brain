# Initial Issues

## P0

### 1. Persist chat history locally

Store conversations so they survive refresh, restart, and service restarts.

### 2. Add conversation list and switcher

Support multiple conversations with create, switch, rename, and delete.

### 3. Add file attachments for text and code

Allow attaching basic text and code files to messages and send their contents as context.

### 4. Stream model responses in real time

Replace wait-for-full-response behavior with incremental output rendering.

### 5. Persist provider and mode per conversation

Each conversation should keep its own provider and mode state.

### 6. Improve step execution with real states

Use real request lifecycle and streamed phases instead of only simulated steps.

## P1

### 7. Add manual web search toggle

Allow the user to explicitly enable web-backed research in a message.

### 8. Add persistent memory entries

Support saved facts, preferences, and user context across sessions.

### 9. Add memory list UI

Provide create, edit, delete, and inspect flows for memories.

### 10. Add scheduled tasks and reminders

Support recurring reminders and recurring analyses with stored outputs.
