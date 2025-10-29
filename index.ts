/**
 * OpenCode Session Management Plugin
 *
 * Unified session tool with agent switching for workflow orchestration.
 *
 * Features:
 * - Context injection (silent, no AI response)
 * - New session creation with agent selection
 * - Session compaction (token optimization)
 * - Session forking (safe experimentation)
 * - Agent-to-agent handoffs
 * - Multi-agent collaboration
 *
 * @version 1.0.0
 * @license MIT
 * @author M. Adel Alhashemi
 * @see https://github.com/malhashemi/opencode-sessions
 */

import type { Plugin } from "@opencode-ai/plugin"
import { tool } from "@opencode-ai/plugin"
import { join } from "path"
import { readdir } from "fs/promises"
import os from "os"
import matter from "gray-matter"

interface AgentInfo {
  name: string
  description?: string
}

/**
 * Discover primary agents by scanning agent directories for markdown files
 * and checking opencode.json for disabled agents.
 *
 * Agent discovery process:
 * 1. Scans ~/.config/opencode/agent/ and .opencode/agent/ for .md files
 * 2. Parses YAML frontmatter to find agents with mode: "primary" or "all"
 * 3. Adds built-in agents (build, plan) if not overridden by .md files
 * 4. Checks opencode.json files for disabled agents
 * 5. Returns list of enabled primary agents
 *
 * Note: Built-in agents (build, plan) can be:
 * - Overridden by creating build.md or plan.md files
 * - Disabled via opencode.json with { agent: { build: { disable: true } } }
 */
async function discoverAgents(projectDir: string): Promise<AgentInfo[]> {
  const agents: AgentInfo[] = []
  const disabledAgents = new Set<string>()

  // Determine XDG config paths
  const xdgConfigHome = process.env.XDG_CONFIG_HOME
  const xdgBase = xdgConfigHome
    ? join(xdgConfigHome, "opencode")
    : join(os.homedir(), ".config/opencode")

  const agentDirs = [
    join(xdgBase, "agent"), // XDG config agents
    join(projectDir, ".opencode/agent"), // Project-local agents
  ]

  const configPaths = [
    join(xdgBase, "opencode.json"), // XDG config
    join(projectDir, ".opencode/opencode.json"), // Project-local config
  ]

  // First, discover all primary agents from markdown files
  for (const agentDir of agentDirs) {
    try {
      const files = await readdir(agentDir)

      for (const file of files) {
        // Only process markdown files
        if (!file.endsWith(".md")) continue

        try {
          // Read file content
          const filePath = join(agentDir, file)
          const content = await Bun.file(filePath).text()

          // Parse YAML frontmatter
          const { data } = matter(content)

          // Check if this is a primary agent
          const mode = data.mode
          if (mode === "primary" || mode === "all") {
            // Extract agent name from filename (remove .md extension)
            const agentName = file.replace(/\.md$/, "")
            const agentDescription = data.description

            // Add to list if not already present
            if (!agents.some((a) => a.name === agentName)) {
              agents.push({
                name: agentName,
                description: agentDescription,
              })
            }
          }
        } catch (error) {
          // Skip files that can't be parsed
          continue
        }
      }
    } catch (error) {
      // Silently skip directories that don't exist
      // This is expected - not all paths will have agent directories
    }
  }

  // Add built-in agents if they weren't overridden by .md files
  for (const builtIn of ["build", "plan"]) {
    if (!agents.some((a) => a.name === builtIn)) {
      agents.unshift({
        name: builtIn,
        description:
          builtIn === "build"
            ? "General-purpose implementation agent for building features and fixing bugs"
            : "Strategic planning agent for architecture and design decisions",
      })
    }
  }

  // Second, check opencode.json files for disabled agents
  for (const configPath of configPaths) {
    try {
      const file = Bun.file(configPath)
      if (await file.exists()) {
        const config = await file.json()

        // Check for disabled agents
        if (config.agent && typeof config.agent === "object") {
          for (const [name, agentConfig] of Object.entries(config.agent)) {
            if (typeof agentConfig === "object" && agentConfig !== null) {
              const disabled = (agentConfig as any).disable
              if (disabled) {
                disabledAgents.add(name)
              }
            }
          }
        }
      }
    } catch (error) {
      // Silently skip files that don't exist or can't be parsed
    }
  }

  // Filter out disabled agents
  return agents.filter((agent) => !disabledAgents.has(agent.name))
}

export const SessionPlugin: Plugin = async (ctx) => {
  // Discover agents from filesystem (no blocking API calls!)
  const agents = await discoverAgents(ctx.directory)
  const agentList = agents
    .map((agent) => {
      const desc = agent.description || "No description available"
      return `  • ${agent.name} - ${desc}`
    })
    .join("\n")

  // Type definitions for state management
  type CompactionRequest = {
    providerID: string
    modelID: string
    agent?: string
    text: string
  }

  type CompactionState = {
    phase: "compacting"
    agent?: string
    text: string
  }

  // Store pending messages for agent relay communication (message mode)
  const pendingMessages = new Map<string, { agent?: string; text: string }>()

  // Store pending compaction requests (compact mode)
  const pendingCompactions = new Map<string, CompactionRequest>()

  // Store active compactions (during compaction process)
  const activeCompactions = new Map<string, CompactionState>()

  return {
    // Hook: Before tool execution - save args for message mode
    "tool.execute.before": async (input, output) => {
      if (input.tool === "session") {
        const args = output.args as {
          mode: string
          text: string
          agent?: string
        }

        if (args.mode === "message") {
          // Store message for session.idle handler
          pendingMessages.set(input.sessionID, {
            agent: args.agent,
            text: args.text,
          })
        }

        // Note: Compact mode storage happens in tool.execute()
        // No need to track here since we're not using tool.execute.after
      }
    },

    // Hook: Listen for session.idle and session.compacted events
    event: async ({ event }) => {
      // Type guard for events with sessionID
      if (!("properties" in event) || !("sessionID" in event.properties)) {
        return
      }

      const sessionID = event.properties.sessionID as string

      // ===== Handle session.idle (both message and compact modes) =====
      if (event.type === "session.idle") {
        // MESSAGE MODE: Send pending message
        const pendingMessage = pendingMessages.get(sessionID)
        if (pendingMessage) {
          pendingMessages.delete(sessionID)

          try {
            await ctx.client.session.prompt({
              path: { id: sessionID },
              body: {
                agent: pendingMessage.agent,
                parts: [{ type: "text", text: pendingMessage.text }],
              },
            })
          } catch (error) {
            // Silently fail - error handling could be added here if needed
          }
          return
        }

        // COMPACT MODE: Start compaction (natural completion - no abort)
        const pendingCompaction = pendingCompactions.get(sessionID)
        if (pendingCompaction) {
          pendingCompactions.delete(sessionID)

          // Store state for session.compacted handler
          activeCompactions.set(sessionID, {
            phase: "compacting",
            agent: pendingCompaction.agent,
            text: pendingCompaction.text,
          })

          // Start compaction (don't await - let it run async)
          ctx.client.session
            .summarize({
              path: { id: sessionID },
              body: {
                providerID: pendingCompaction.providerID,
                modelID: pendingCompaction.modelID,
              },
            })
            .catch((error) => {
              activeCompactions.delete(sessionID)
            })

          return
        }
      }

      // ===== Handle session.compacted (send message immediately) =====
      if (event.type === "session.compacted") {
        const state = activeCompactions.get(sessionID)

        if (state) {
          // Clean up state immediately
          activeCompactions.delete(sessionID)

          // Wait 100ms for compaction lock to fully release
          await new Promise((resolve) => setTimeout(resolve, 100))

          // Send message immediately - no abort needed!
          try {
            await ctx.client.session.prompt({
              path: { id: sessionID },
              body: {
                agent: state.agent,
                parts: [{ type: "text", text: state.text }],
              },
            })
          } catch (error) {
            // Silently fail - error handling could be added here if needed
          }
        }
      }
    },

    tool: {
      session: tool({
        description: `Multi-agent collaboration and workflow orchestration across sessions.

THE FOUR PILLARS:

1. COLLABORATE (message) - Turn-based agent collaboration in same conversation
   Agents work together, passing the torch back and forth. Perfect for complex
   problems requiring multiple perspectives in a single thread.

2. HANDOFF (new) - Clean phase transitions with fresh context
   Complete one phase, hand off to another agent with a clean slate. No context
   baggage from previous work. Research → Implementation → Validation.

3. COMPRESS (compact) - Manual compression control with messaging and handoffs
   Trigger compaction when needed, include a message, and optionally hand off
   to a different agent. Maintain long conversations without token limits.

4. PARALLELIZE (fork) - Explore multiple approaches simultaneously
   Branch into independent sessions to try different solutions. Full primary
   agent capabilities in each fork. Compare approaches, pick the best.

AGENT PARAMETER (optional):

Specify which primary agent handles the message. Enables agent relay and handoffs.

Available primary agents:
${agentList}

If omitted, continues with current agent.

EXAMPLES:

  # COLLABORATE: Multi-agent problem solving
  session({ 
    mode: "message",
    agent: "plan",
    text: "Should we use microservices here?"
  })
  # Plan reviews, responds, can pass back to build
  
  # HANDOFF: Clean phase transition
  session({
    mode: "new",
    agent: "researcher", 
    text: "Research best practices for API design"
  })
  # Fresh session, no baggage from previous implementation work
  
  # COMPRESS: Long conversation with handoff
  session({
    mode: "compact",
    agent: "plan",
    text: "Continue architecture review"
  })
  # Compacts history, adds handoff context, plan agent responds
  
  # PARALLELIZE: Try multiple approaches
  session({
    mode: "fork",
    agent: "build",
    text: "Implement using Redux"
  })
  session({
    mode: "fork", 
    agent: "build",
    text: "Implement using Context API"
  })
  # Two independent sessions, compare results
`,

        args: {
          text: tool.schema
            .string()
            .describe("The text to send in the session"),
          mode: tool.schema
            .enum(["message", "new", "compact", "fork"])
            .describe("How to handle the session and text"),
          agent: tool.schema
            .string()
            .optional()
            .describe(
              "Primary agent name (e.g., 'build', 'plan') for agent switching",
            ),
        },

        async execute(args, toolCtx) {
          try {
            switch (args.mode) {
              case "message":
                // Message is stored in tool.execute.before hook
                // Will be sent after session.idle event fires
                return args.agent
                  ? `Message sent to ${args.agent} agent. They will respond in this conversation.`
                  : "Message sent. Awaiting response in this conversation."

              case "new":
                // Create session via SDK for agent control
                const newSession = await ctx.client.session.create({
                  body: {
                    title: args.agent
                      ? `Session via ${args.agent}`
                      : "New session",
                  },
                })

                // Send first message with specified agent
                await ctx.client.session.prompt({
                  path: { id: newSession.data.id },
                  body: {
                    agent: args.agent || "build",
                    parts: [{ type: "text", text: args.text }],
                  },
                })

                return `New session created with ${args.agent || "build"} agent (ID: ${newSession.data.id})`

              case "compact":
                try {
                  // Get session messages to determine current model
                  const msgs = await ctx.client.session.messages({
                    path: { id: toolCtx.sessionID },
                  })

                  // Find last assistant message to get model info
                  const assistantMsgs = msgs.data.filter(
                    (m) => m.info.role === "assistant",
                  )
                  const lastAssistant = assistantMsgs[assistantMsgs.length - 1]

                  if (
                    !lastAssistant ||
                    lastAssistant.info.role !== "assistant"
                  ) {
                    return "Error: No assistant messages found in session. Cannot determine model for compaction."
                  }

                  // Extract model info from last assistant message
                  const providerID = lastAssistant.info.providerID
                  const modelID = lastAssistant.info.modelID

                  // Inject context marker that survives compaction
                  await ctx.client.session.prompt({
                    path: { id: toolCtx.sessionID },
                    body: {
                      noReply: true,
                      parts: [
                        {
                          type: "text",
                          text: args.agent
                            ? `[Session will compact after this response - ${args.agent} agent will continue]`
                            : "[Session will compact after this response]",
                        },
                      ],
                    },
                  })

                  // Store compaction request (will be processed on session.idle)
                  pendingCompactions.set(toolCtx.sessionID, {
                    providerID,
                    modelID,
                    agent: args.agent,
                    text: args.text,
                  })

                  // Return immediately - compaction happens after agent finishes naturally
                  return args.agent
                    ? `I'll compact the session after completing this response, then hand off to ${args.agent}.`
                    : `I'll compact the session after completing this response.`
                } catch (error) {
                  throw error // Re-throw to be caught by outer try-catch
                }

              case "fork":
                // Use OpenCode's built-in fork API to copy message history
                const forkedSession = await ctx.client.session.fork({
                  path: { id: toolCtx.sessionID },
                  body: {},
                })

                // Send new message in forked session
                await ctx.client.session.prompt({
                  path: { id: forkedSession.data.id },
                  body: {
                    agent: args.agent || "build",
                    parts: [{ type: "text", text: args.text }],
                  },
                })

                return `Forked session with ${args.agent || "build"} agent - history preserved (ID: ${forkedSession.data.id})`
            }
          } catch (error) {
            const message =
              error instanceof Error ? error.message : String(error)

            // Show toast to user
            await ctx.client.tui.showToast({
              body: {
                message: `Session operation failed: ${message}`,
                variant: "error",
              },
            })

            // Return error to agent
            return `Error: ${message}`
          }
        },
      }),
    },
  }
}
