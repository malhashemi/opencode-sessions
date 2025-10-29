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
 * @version 0.0.6
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
async function discoverAgents(projectDir: string): Promise<string[]> {
  const agents: string[] = []
  const disabledAgents = new Set<string>()
  
  // Determine XDG config paths
  const xdgConfigHome = process.env.XDG_CONFIG_HOME
  const xdgBase = xdgConfigHome
    ? join(xdgConfigHome, "opencode")
    : join(os.homedir(), ".config/opencode")
  
  const agentDirs = [
    join(xdgBase, "agent"),              // XDG config agents
    join(projectDir, ".opencode/agent"), // Project-local agents
  ]
  
  const configPaths = [
    join(xdgBase, "opencode.json"),              // XDG config
    join(projectDir, ".opencode/opencode.json"), // Project-local config
  ]
  
  // First, discover all primary agents from markdown files
  for (const agentDir of agentDirs) {
    try {
      const files = await readdir(agentDir)
      
      for (const file of files) {
        // Only process markdown files
        if (!file.endsWith('.md')) continue
        
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
            const agentName = file.replace(/\.md$/, '')
            
            // Add to list if not already present
            if (!agents.includes(agentName)) {
              agents.push(agentName)
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
    if (!agents.includes(builtIn)) {
      agents.unshift(builtIn) // Add to front of list
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
  return agents.filter(name => !disabledAgents.has(name))
}

export const SessionPlugin: Plugin = async (ctx) => {
  // Discover agents from filesystem (no blocking API calls!)
  const agents = await discoverAgents(ctx.directory)
  const agentList = agents
    .map(name => `  • ${name}`)
    .join("\n")
  
  // Store pending messages for agent relay communication
  // Map<sessionID, { agent?, text }>
  const pendingMessages = new Map<string, { agent?: string, text: string }>()
  
  return {
    // Hook: Before tool execution - save args for message and compact modes
    "tool.execute.before": async (input, output) => {
      if (input.tool === "session") {
        const args = output.args as { mode: string, text: string, agent?: string }
        
        if (args.mode === "message" || args.mode === "compact") {
          // Store message for later - will be sent on session.idle event
          pendingMessages.set(input.sessionID, {
            agent: args.agent,
            text: args.text
          })
        }
      }
    },
    
    // Hook: Listen for session.idle event to send queued messages
    event: async ({ event }) => {
      if (event.type === "session.idle") {
        const sessionID = event.properties.sessionID
        const pending = pendingMessages.get(sessionID)
        
        if (pending) {
          // Remove from queue
          pendingMessages.delete(sessionID)
          
          try {
            // Session is unlocked now - safe to call session.prompt with agent parameter
            await ctx.client.session.prompt({
              path: { id: sessionID },
              body: {
                agent: pending.agent,
                parts: [{ type: "text", text: pending.text }]
              }
            })
          } catch (error) {
            console.error('[session-plugin] Failed to send message on session.idle:', error)
          }
        }
      }
    },
    
    tool: {
      session: tool({
        description: `Manage session context and conversation flow for agent relay communication.

MODE OPTIONS:

• message - Send message in current session and trigger AI response. Use for agent-to-agent relay communication, passing the torch between agents in the same conversation. Message is sent after current agent finishes.

• new - Start fresh session with new message. Use when transitioning between work phases (e.g., research → implementation → validation), starting unrelated tasks, or when current context becomes irrelevant. Fresh context prevents previous discussion from influencing new phase.

• compact - Compress session history to free tokens, then send message. Injects handoff context before compaction, then sends message after compaction completes. Use during long conversations when approaching token limits but need to preserve context for ongoing work.

• fork - Branch into child session from current point to explore alternatives. Parent session unchanged. Use to experiment with different approaches, test solutions, or explore "what if" scenarios without risk.

AGENT PARAMETER (optional):

Specify which primary agent handles the message. Enables agent-to-agent relay communication in the same conversation.

Available primary agents:
${agentList}

If omitted, uses current agent.

EXAMPLES:

  # Agent relay - pass to plan agent
  session({ 
    text: "Should we use microservices here?", 
    mode: "message",
    agent: "plan"
  })
  # Plan agent receives message as USER message and responds
  
  # Agent relay with compaction
  session({
    text: "Continue architecture review",
    mode: "compact",
    agent: "plan"
  })
  # Compacts history, then plan agent responds
  
  # Start new session for different phase
  session({
    text: "Begin security audit",
    mode: "new", 
    agent: "plan"
  })
  
  # Multi-agent relay conversation
  session({ text: "Implemented feature X", mode: "message", agent: "build" })
  session({ text: "Review feature X", mode: "message", agent: "plan" })
`,
        
        args: {
          text: tool.schema.string().describe("The text to send in the session"),
          mode: tool.schema.enum(["message", "new", "compact", "fork"]).describe("How to handle the session and text"),
          agent: tool.schema.string().optional().describe("Primary agent name (e.g., 'build', 'plan') for agent switching"),
        },
        
        async execute(args, toolCtx) {
          try {
            switch(args.mode) {
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
                      : "New session"
                  }
                })
                
                // Send first message with specified agent
                await ctx.client.session.prompt({
                  path: { id: newSession.data.id },
                  body: {
                    agent: args.agent || "build",
                    parts: [{ type: "text", text: args.text }]
                  }
                })
                
                return `New session created with ${args.agent || "build"} agent (ID: ${newSession.data.id})`
                
              case "compact":
                // Inject handoff context message (survives compaction)
                await ctx.client.session.prompt({
                  path: { id: toolCtx.sessionID },
                  body: {
                    noReply: true,
                    parts: [{
                      type: "text",
                      text: args.agent 
                        ? `[Compacting session - ${args.agent} agent will respond after completion]`
                        : "[Compacting session - response will continue after completion]"
                    }]
                  }
                })
                
                // Trigger compaction
                await ctx.client.tui.executeCommand({ 
                  body: { command: "session_compact" }
                })
                
                // Message stored in tool.execute.before will be sent via session.idle
                return args.agent 
                  ? `Compacting session... ${args.agent} agent will respond after completion.`
                  : "Compacting session... response will continue after completion."
                
              case "fork":
                // Use OpenCode's built-in fork API to copy message history
                const forkedSession = await ctx.client.session.fork({
                  path: { id: toolCtx.sessionID },
                  body: {}
                })
                
                // Send new message in forked session
                await ctx.client.session.prompt({
                  path: { id: forkedSession.data.id },
                  body: {
                    agent: args.agent || "build",
                    parts: [{ type: "text", text: args.text }]
                  }
                })
                
                return `Forked session with ${args.agent || "build"} agent - history preserved (ID: ${forkedSession.data.id})`
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            
            // Show toast to user
            await ctx.client.tui.showToast({
              body: {
                message: `Session operation failed: ${message}`,
                variant: "error",
              }
            })
            
            // Return error to agent
            return `Error: ${message}`
          }
        }
      })
    }
  }
}
