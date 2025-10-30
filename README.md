# OpenCode Sessions

[![npm version](https://img.shields.io/npm/v/opencode-sessions.svg)](https://www.npmjs.com/package/opencode-sessions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Multi-agent collaboration and workflow orchestration for OpenCode**

Enable turn-based agent collaboration, clean phase transitions, manual compression control, and parallel exploration—all through a single elegant tool.

---

## The Four Pillars

### 🔀 **PARALLELIZE** — Explore Multiple Approaches

Branch into independent sessions to try different solutions. Full primary agent capabilities in each fork. Explore different approaches with full conversational context—each fork is a live session you can discuss, iterate on, and refine before committing to one direction.

```typescript
// Exploring architectural approaches (not parallel implementations)
session({
  mode: "fork",
  agent: "plan",
  text: "Design this as a microservices architecture",
})

session({
  mode: "fork",
  agent: "plan",
  text: "Design this as a modular monolith",
})

session({
  mode: "fork",
  agent: "plan",
  text: "Design this as a serverless architecture",
})

// Switch between sessions to discuss trade-offs, iterate on each approach
// before committing to one architecture
```

```mermaid
graph TD
    A[Main Session] -->|Fork| B[Approach A: Microservices]
    A -->|Fork| C[Approach B: Modular Monolith]
    A -->|Fork| D[Approach C: Serverless]

    B --> E[Compare Results]
    C --> E
    D --> E
```

**Use Cases:**

- Exploring alternative architectural approaches
- Comparing different design patterns
- "What if" scenario analysis before committing
- Risk-free experimentation with full conversational context

**Note:** Fork works best for design/architectural exploration, not parallel implementations of the same system.

---

### 🤝 **COLLABORATE** — Turn-Based Agent Discussion

Agents work together in the same conversation, passing the torch back and forth. Perfect for complex problems requiring multiple perspectives.

```typescript
// Agent implements, then hands to review agent
session({
  mode: "message",
  agent: "review",
  text: "Review this authentication implementation",
})

// Or research hands to plan
session({
  mode: "message",
  agent: "plan",
  text: "Design our rate limiting based on this research",
})
```

```mermaid
sequenceDiagram
    participant Build as Build Agent
    participant User as Session
    participant Review as Review Agent

    Build->>User: "Implemented feature X"
    Note over Build: Tool: session(mode: "message", agent: "review")
    Build->>Build: Finishes turn
    User->>Review: "Review this implementation"
    Review->>User: "Let me review that..."
    Note over Review: Analyzes and provides feedback
    Review->>Build: Can pass back via session tool
```

**Use Cases:**

- Code review workflows (build → review → build)
- Research handoffs (researcher → plan → build)
- Architecture discussions (plan ↔ build)
- Iterative refinement across agents

**Note:** ⚠️ Not recommended when agents use different providers (e.g., Claude + GPT-4). Tested primarily with Sonnet 4.5 across agents.

---

### 🎯 **HANDOFF** — Clean Phase Transitions

Complete one work phase, hand off to another agent with a fresh slate. No context baggage from previous work.

```typescript
session({
  mode: "new",
  agent: "researcher",
  text: "Research API design best practices for 2025",
})
// Fresh session, clean context
// Previous implementation details don't influence research
```

```mermaid
graph LR
    A[Research Phase] -->|Clean Handoff| B[Planning Phase]
    B -->|Clean Handoff| C[Implementation Phase]
    C -->|Clean Handoff| D[Validation Phase]
```

**Use Cases:**

- Research → Planning → Implementation → Validation workflows
- Preventing context bleed between phases
- Starting unrelated tasks
- Running slash commands in clean context

---

### 🗜️ **COMPRESS** — Manual Compression with Messaging

Trigger compaction when needed, include a message, and optionally hand off to a different agent. Maintain long conversations without token limits.

```typescript
session({
  mode: "compact",
  agent: "plan",
  text: "Continue architecture review",
})
// Compacts history, injects handoff context, plan agent responds
```

```mermaid
sequenceDiagram
    participant Build as Build Agent
    participant Session as Session
    participant Plan as Plan Agent

    Note over Build: Long conversation...
    Build->>Session: Tool: session(mode: "compact", agent: "plan")
    Session->>Session: Inject: "[Compacting - plan will respond]"
    Session->>Session: Compress history
    Session->>Session: Wait for idle
    Session->>Plan: "Continue architecture review"
    Plan->>Session: Reviews compacted context and responds
```

**What survives compaction:**

- ✅ Handoff context message: `[Compacting session - plan agent will respond after completion]`
- ✅ Your actual message
- ✅ Compacted summary of previous work

**Use Cases:**

- Long conversations approaching token limits
- Preserving context while freeing memory
- Handing off with compression
- Continuing work without losing essential history

---

## Installation

**Requirements:** OpenCode ≥ 0.15.18

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

### Updates

Check installed version:

```bash
cat ~/.cache/opencode/node_modules/opencode-sessions/package.json | grep version
```

Force update to latest:

```bash
rm -rf ~/.cache/opencode && opencode
```

---

## ⚠️ Important Usage Notes

**Agents won't use this automatically:**
- Mention the tool in your `/command` or conversation when you want agents to use it
- Agents need explicit instruction to leverage session management

**Enable per-agent, not globally:**
- Turn the tool off globally in your config
- Enable it only for specific primary agents (build, plan, researcher, etc.)
- This prevents sub-agents from accidentally using it (unless your workflow requires it)

**Message mode with mixed providers:**
- ⚠️ Not recommended when agents use different providers (e.g., Claude + GPT-4)
- Tested primarily with Sonnet 4.5 across agents
- If you try mixed providers, please report your experience

---

## Usage

### Basic Syntax

```typescript
session({
  text: string,      // Required - message to send
  mode: string,      // Required - "message" | "new" | "compact" | "fork"
  agent?: string     // Optional - target agent name
})
```

### Available Agents

The plugin automatically discovers your configured agents:

```typescript
// Built-in agents (always available):
- build -      // Full development capabilities with all tools
- plan -       // Analysis and planning (read-only tools)
// Plus any custom agents from your configuration
- researcher - // Research and investigation
- implement -  // Implementation-focused
```

Use Tab in OpenCode to see all available agents.

---

## Real-World Examples

### Example 1: Code Review Workflow

```typescript
// Build agent implements, then hands to review
session({
  mode: "message",
  agent: "review",
  text: "Review this authentication implementation for security issues",
})

// Review agent provides feedback, build can address
// Or research → plan handoff
session({
  mode: "message",
  agent: "plan",
  text: "Design our rate limiting system based on this research",
})
```

### Example 2: Research → Plan → Implement Pipeline

```typescript
// Phase 1: Research (clean start)
session({
  mode: "new",
  agent: "researcher",
  text: "Research best practices for API rate limiting in 2025",
})

// Phase 2: Planning (clean handoff)
session({
  mode: "new",
  agent: "plan",
  text: "Design a rate limiting system based on the research",
})

// Phase 3: Implementation (clean handoff)
session({
  mode: "new",
  agent: "build",
  text: "Implement the rate limiting system per the plan",
})
```

### Example 3: Long Conversation with Compression

```typescript
// After extensive back-and-forth implementation discussion...

// Compress and hand off to plan for architectural review
session({
  mode: "compact",
  agent: "plan",
  text: "Review the overall architecture we've built so far",
})

// Plan sees:
// [Compacted history of implementation]
// User: [Compacting session - plan agent will respond after completion]
// User: Review the overall architecture we've built so far
```

### Example 4: Parallel Architectural Exploration

```typescript
// Exploring architectural approaches before committing

session({
  mode: "fork",
  agent: "plan",
  text: "Design this as a microservices architecture",
})

session({
  mode: "fork",
  agent: "plan",
  text: "Design this as a modular monolith",
})

session({
  mode: "fork",
  agent: "plan",
  text: "Design this as a serverless architecture",
})

// Switch between sessions (<leader>l) to discuss trade-offs with each approach
// Iterate on designs, then commit to one architecture
// Note: Fork works best for design exploration, not parallel implementations
```

---

## How It Works

### The Agent Relay Pattern

When you call the session tool with `mode: "message"` or `mode: "compact"`:

1. **Tool stores your message** in a pending queue
2. **Current agent finishes** its turn naturally
3. **`session.idle` event fires** after the session unlocks
4. **Plugin sends the queued message** to the target agent
5. **Target agent receives** the message as a USER message
6. **Target agent responds** in the same conversation

This pattern ensures:

- ✅ No deadlocks (tool returns immediately)
- ✅ Agent parameter preserved (sent after unlock)
- ✅ Clean turn-taking (one agent at a time)
- ✅ Full context visibility (same conversation)

### Why Turn-Based?

Agents don't interrupt each other. Each agent gets a complete turn to:

- See the full conversation history
- Make tool calls and get results
- Formulate a complete response
- Optionally pass to another agent

This creates **structured collaboration** rather than chaotic multi-agent interference.

---

## API Reference

### Tool: session

**Arguments:**

| Argument | Type   | Required | Description                                                       |
| -------- | ------ | -------- | ----------------------------------------------------------------- |
| `text`   | string | ✅ Yes   | Message to send                                                   |
| `mode`   | enum   | ✅ Yes   | Operation mode: `"message"` \| `"new"` \| `"compact"` \| `"fork"` |
| `agent`  | string | ❌ No    | Target agent name (defaults to current agent)                     |

**Returns:** Status message describing the operation

**Mode Details:**

| Mode      | Creates New Session | Agent Switching | Context Preserved | Use Case             |
| --------- | ------------------- | --------------- | ----------------- | -------------------- |
| `message` | No                  | Yes             | Yes               | Agent collaboration  |
| `new`     | Yes                 | Yes             | No                | Phase transitions    |
| `compact` | No                  | Yes             | Compressed        | Token optimization   |
| `fork`    | Yes (child)         | Yes             | Yes               | Parallel exploration |

---

## Troubleshooting

**Tool not appearing?**

- Verify OpenCode version ≥ 0.15.18
- Check plugin installed: `ls ~/.cache/opencode/node_modules/opencode-sessions`
- Restart OpenCode after installation

**Agent switching not working?**

- Verify agent name exists (use Tab to see available agents)
- Check for typos (agent names are case-sensitive)
- Ensure OpenCode SDK is up to date

**Session operations failing?**

- Check error notifications in OpenCode TUI
- Verify you're in an active session

---

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## License

MIT - see [LICENSE](LICENSE)

---

## Learn More

- [OpenCode Documentation](https://opencode.ai)
- [Plugin API Reference](https://opencode.ai/docs/plugins)

---

<div align="center">

**Not affiliated with Anthropic or OpenCode.**  
This is an independent open-source project.

Made with ❤️ for the OpenCode community

</div>
