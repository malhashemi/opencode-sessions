# OpenCode Session Plugin

[![npm version](https://img.shields.io/npm/v/opencode-sessions.svg)](https://www.npmjs.com/package/opencode-sessions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Unified session management plugin for OpenCode with multi-agent collaboration support. Replace fragmented session operations with a single, powerful `session` tool.

## Features

- ✅ **Message Mode** - Send messages with AI response in current session
- ✅ **Context Injection** - Silent text insertion without AI response
- ✅ **New Sessions** - Start fresh for phase transitions
- ✅ **Session Compaction** - Optimize token usage during long conversations
- ✅ **Session Forking** - Explore alternatives without risk
- ✅ **Agent Switching** - Multi-agent collaboration and handoffs
- ✅ **Zero Waits** - Leverages OpenCode's native queuing system

## Requirements

- **OpenCode ≥ 0.15.18** - Required for `noReply` pattern and agent switching

## Installation

Add to your `opencode.json` or `~/.config/opencode/opencode.json`:

```json
{
  "plugin": ["opencode-sessions"]
}
```

OpenCode auto-installs plugins on startup.

### Version Pinning

Pin to a specific version:

```json
{
  "plugin": ["opencode-sessions@x.y.z"]
}
```

### Plugin Updates

Check installed version:
```bash
cat ~/.cache/opencode/node_modules/opencode-sessions/package.json | grep version
```

Force update to latest:
```bash
rm -rf ~/.cache/opencode
```

Then restart OpenCode.

## Usage

### Basic Syntax

```typescript
session({
  text: string,      // Required - message or context to inject
  mode: string,      // Required - "message" | "context" | "new" | "compact" | "fork"
  agent?: string     // Optional - agent name for switching
})
```

### Mode: Message

Send message in current session and trigger AI response:

```typescript
// Continue conversation with response
session({
  text: "Now implement the authentication module",
  mode: "message"
})

// Get response from different agent
session({
  text: "What are the security implications of this approach?",
  mode: "message",
  agent: "plan"
})

// Agent-to-agent dialogue with responses
session({
  text: "I've completed the implementation",
  mode: "message",
  agent: "build"
})
session({
  text: "Let me review that implementation",
  mode: "message",
  agent: "plan"
})
```

**Use Cases:**
- Programmatic message sending with AI response
- Agent switching mid-conversation
- Multi-agent dialogue with responses
- Continuing discussion from different perspective

**Key Difference from Context**: Triggers AI inference (gets a response).

### Mode: Context Injection

Silently add instructions or reference material without triggering AI response:

```typescript
// Add constraints mid-conversation
session({
  text: "Remember to follow PEP 8 style guidelines for all Python code.",
  mode: "context"
})

// Hand off to plan agent for silent review setup
session({
  text: "Review the implementation above for security issues.",
  mode: "context",
  agent: "plan"
})
```

**Use Cases:**
- Adding instructions mid-conversation
- Loading reference documentation
- Setting up context for next response
- Injecting constraints without breaking flow

**Key Difference from Message**: No AI response (silent injection).

### Mode: New Session

Start fresh session for phase transitions or unrelated tasks:

```typescript
// Research phase
session({
  text: "Research authentication best practices for 2025",
  mode: "new"
})

// Plan phase with plan agent
session({
  text: "/plan Design the authentication system based on research",
  mode: "new",
  agent: "plan"
})

// Implementation phase
session({
  text: "Implement the authentication system per the plan",
  mode: "new",
  agent: "build"
})
```

**Use Cases:**
- Phase transitions (research → plan → implement → validate)
- Starting unrelated tasks
- Running slash commands in clean context
- Preventing context bleed between phases

### Mode: Compact Session

Compress history to free tokens while preserving context:

```typescript
// Long conversation approaching token limits
session({
  text: "Continue implementing the feature",
  mode: "compact"
})

// Compact and switch to plan agent
session({
  text: "Review progress so far",
  mode: "compact",
  agent: "plan"
})
```

**Use Cases:**
- Long conversations hitting token limits
- Preserving context while freeing memory
- Continuing work without losing history

### Mode: Fork Session

Branch into child session to explore alternatives:

```typescript
// Experiment without affecting parent
session({
  text: "Try implementing this with async/await instead",
  mode: "fork"
})

// Fork with different agent
session({
  text: "Explore alternative architecture",
  mode: "fork",
  agent: "plan"
})
```

**Use Cases:**
- Exploring alternative solutions
- Testing different approaches
- "What if" scenario analysis
- Risk-free experimentation

### Multi-Agent Collaboration

Enable multiple agents in same conversation:

```typescript
// Build agent implements (with response)
session({
  text: "Implementation complete. Here's the code...",
  mode: "message",
  agent: "build"
})

// Plan agent reviews (with response)
session({
  text: "Review the implementation for security issues",
  mode: "message",
  agent: "plan"
})

// Build agent responds to feedback (with response)
session({
  text: "Addressing the security concerns...",
  mode: "message",
  agent: "build"
})
```

**Note**: Use `mode: "message"` for dialogue with responses, or `mode: "context"` for silent context injection without triggering responses.

## Agent Discovery

The plugin automatically discovers available primary agents:

```typescript
// Available by default:
- build   - Full development with all tools
- plan    - Analysis and planning (read-only)

// Plus any custom agents from your opencode.json
```

## Troubleshooting

**Tool not appearing?**
- Verify OpenCode version ≥ 0.15.18
- Check plugin installed: `ls ~/.cache/opencode/node_modules/opencode-sessions`
- Restart OpenCode after installation

**Agent switching not working?**
- Verify agent name exists via OpenCode's agent selector (Tab key)
- Check OpenCode version supports agent parameter
- Use exact agent names (case-sensitive)

**Session operations failing?**
- Check error toast notifications in OpenCode TUI
- Verify session ID is valid
- Ensure no concurrent session operations

## API Reference

### SessionPlugin

Main plugin export that registers the `session` tool.

```typescript
export const SessionPlugin: Plugin
```

### Tool: session

Unified session management tool with five modes.

**Arguments:**
- `text: string` - Text to send or inject
- `mode: "message" | "context" | "new" | "compact" | "fork"` - Operation mode
- `agent?: string` - Optional agent name for switching

**Returns:** Status message describing operation result

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT - see [LICENSE](LICENSE)

## References

- [Research Document](https://github.com/malhashemi/opencode-sessions/docs)
- [OpenCode Documentation](https://opencode.ai)

---

**Not affiliated with Anthropic or OpenCode.** This is an independent open-source project.
