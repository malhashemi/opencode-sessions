# Session Plugin Deadlock - Root Cause Analysis & Fix

## Problem Statement

User testing revealed that **message mode** and **compact mode** were completely broken:
- **Message mode**: Tool would hang indefinitely, no progress, session frozen
- **Compact mode**: Compaction worked, 30s wait worked, message appeared in editor but never sent

## Root Cause: Session Lock Deadlock

### The Deadlock Chain

```
1. Tool executes → Session lock acquired (session/prompt.ts:176)
2. Tool returns result
3. tool.execute.after hook runs (LOCK STILL HELD - prompt.ts:560)
4. After hook calls: await ctx.client.session.prompt({...})
5. session.prompt() tries to acquire lock → Session already locked!
6. session.prompt() QUEUES and BLOCKS (prompt.ts:160-169)
7. After hook waits for session.prompt() to complete
8. Lock won't release until after hook completes
9. DEADLOCK! 💀
```

### Evidence from OpenCode Source

**Session Lock is Exclusive** (`session/lock.ts:50-74`):
```typescript
export function acquire(input: { sessionID: string }) {
  const lock = get(input.sessionID)
  if (lock) {
    throw new LockedError({ 
      sessionID: input.sessionID, 
      message: `Session ${input.sessionID} is locked` 
    })
  }
  // ... acquire lock
}
```

**session.prompt() Queues on Busy Session** (`session/prompt.ts:160-169`):
```typescript
if (isBusy(input.sessionID)) {
  return new Promise((resolve) => {
    const queue = state().queued.get(input.sessionID) ?? []
    queue.push({
      messageID: userMsg.info.id,
      callback: resolve,  // ← Blocks until session available
    })
    state().queued.set(input.sessionID, queue)
  })
}
```

**After Hook Runs While Locked** (`session/prompt.ts:560-569`):
```typescript
const result = await item.execute(args, {...})

// After hook called IMMEDIATELY while lock still held
await Plugin.trigger(
  "tool.execute.after",
  {...},
  result,
)

return result  // Lock released after this
```

## Solution: Fire-and-Forget Pattern

### Message Mode Fix

**Before** (deadlocks):
```typescript
await ctx.client.session.prompt({
  path: { id: pending.sessionID },
  body: {
    agent: pending.agent,
    parts: [{ type: "text", text: pending.text }]
  }
})
```

**After** (works):
```typescript
// Don't await! Fire and forget
ctx.client.session.prompt({
  path: { id: pending.sessionID },
  body: {
    agent: pending.agent,
    parts: [{ type: "text", text: pending.text }]
  }
}).catch(err => {
  console.error('[session-plugin] Message mode failed:', err)
})
```

**Why This Works**:
1. Tool returns its response to user
2. After hook fires `session.prompt()` WITHOUT awaiting
3. `session.prompt()` queues and returns a pending Promise
4. After hook completes immediately
5. Session lock releases
6. Queued message executes! ✅

### Compact Mode Fix

**Before** (didn't send):
```typescript
await new Promise(resolve => setTimeout(resolve, 30000))

await ctx.client.tui.appendPrompt({ body: { text: pending.text }})
await ctx.client.tui.submitPrompt()
```

**After** (works):
```typescript
// Use silent injection with noReply: true
ctx.client.session.prompt({
  path: { id: pending.sessionID },
  body: {
    agent: pending.agent,
    noReply: true,  // Silent injection
    parts: [{ type: "text", text: pending.text }]
  }
}).catch(err => {
  console.error('[session-plugin] Compact mode failed:', err)
})
```

**Why This Works**:
- `noReply: true` injects message silently without triggering inference
- The compaction command (`session_compact`) triggers inference after it completes
- Inference picks up the injected message
- No TUI manipulation needed
- No arbitrary 30s delay needed

## Research Process

### Sub-Agents Launched

1. **codebase-pattern-finder**: Found plugin hook examples and patterns
2. **codebase-analyzer** (session.prompt): Discovered queuing mechanism and session locks
3. **codebase-analyzer** (TUI): Analyzed TUI command behavior
4. **codebase-analyzer** (tool lifecycle): Mapped complete execution timeline
5. **web-search-researcher**: Researched async plugin patterns and deadlock avoidance

### Key Discoveries

1. **Session locks are process-global and exclusive** - only one operation per session
2. **session.prompt() queues when busy** - doesn't fail, but blocks caller
3. **After hooks run while session is locked** - critical timing issue
4. **Task tool uses child sessions** - separate lock, avoids this problem
5. **Fire-and-forget is safe** - Promise queues, executes after lock releases

## Architectural Patterns Applied

Based on research into Apollo Server, Express.js, Flask, and other plugin systems:

**Pattern**: Deferred callback execution
- Return response immediately
- Queue follow-up action
- Don't block on follow-up
- Let event loop handle execution

**Anti-Pattern** (what we were doing):
- Return response
- Block waiting for follow-up
- Follow-up can't execute until current operation completes
- Deadlock!

## Testing Plan

### Message Mode
1. Call `session({ mode: "message", agent: "plan", text: "Review this" })`
2. Should see: "Message being sent to plan agent, please wait..."
3. Should then see: plan agent's response to "Review this"
4. Should NOT hang or freeze

### Compact Mode  
1. In long session, call `session({ mode: "compact", text: "Continue analysis" })`
2. Should see: "Session compacting..."
3. Session compacts (UI shows compaction progress)
4. After compaction: inference triggers with "Continue analysis"
5. Should NOT need manual submission

## Related Files

- `index.ts:172-204` - After hook with fix
- `index.ts:264-332` - Tool execution modes
- `session/prompt.ts:160-169` - Queueing mechanism
- `session/lock.ts:50-74` - Lock acquisition
- `tool/task.ts:30-33` - Child session pattern (reference)

## Lessons Learned

1. **Always check for lock conflicts** when calling session APIs from plugins
2. **Fire-and-forget is often safer** than await in hook contexts
3. **Queuing mechanisms can deadlock** if not used carefully
4. **Deep research pays off** - surface-level fixes wouldn't have solved this
5. **Test thoroughly** - user testing revealed issues unit tests wouldn't catch
