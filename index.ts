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
 * @version 0.0.3
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
  
  return {
    tool: {
      session: tool({
        description: `Manage session context and conversation flow across different phases of work.

MODE OPTIONS:

• message - Send message in current session and trigger AI response. Use for programmatic messaging, agent switching mid-conversation, or continuing discussion with different agent perspective.

• context - Silently inject text without triggering AI response. Use to add instructions, constraints, or reference material mid-conversation while preserving flow.

• new - Start fresh session with new message. Use when transitioning between work phases (e.g., research → implementation → validation), starting unrelated tasks, or when current context becomes irrelevant. Fresh context prevents previous discussion from influencing new phase. Can trigger slash commands in clean state.

• compact - Compress session history to free tokens, then continue with message. Use during long conversations when approaching token limits but need to preserve context for ongoing work.

• fork - Branch into child session from current point to explore alternatives. Parent session unchanged. Use to experiment with different approaches, test solutions, or explore "what if" scenarios without risk.

AGENT PARAMETER (optional):

Specify which primary agent handles the message. Enables agent-to-agent handoffs and multi-agent collaboration in same session.

Available primary agents:
${agentList}

If omitted, uses current agent.

EXAMPLES:

  # Send message with agent switch and get response
  session({ 
    text: "What are the security implications?", 
    mode: "message",
    agent: "plan"
  })
  
  # Silent context injection (no response)
  session({ 
    text: "Follow PEP 8 for all Python code", 
    mode: "context"
  })
  
  # Start new session for different phase
  session({
    text: "/validate Check for security issues",
    mode: "new", 
    agent: "plan"
  })
  
  # Multi-agent discussion with responses
  session({ text: "Implemented feature X", mode: "message", agent: "build" })
  session({ text: "Review feature X", mode: "message", agent: "plan" })
`,
        
        args: {
          text: tool.schema.string().describe("The text to send or inject into the session"),
          mode: tool.schema.enum(["message", "context", "new", "compact", "fork"]).describe("How to handle the session and text"),
          agent: tool.schema.string().optional().describe("Primary agent name (e.g., 'build', 'plan') for agent switching"),
        },
        
        async execute(args, toolCtx) {
          try {
            switch(args.mode) {
              case "message":
                // Queue message (executes after tool returns)
                await ctx.client.session.prompt({
                  path: { id: toolCtx.sessionID },
                  body: { 
                    agent: args.agent,
                    parts: [{ type: "text", text: args.text }]
                  }
                })
                
                // Show toast for visible feedback
                await ctx.client.tui.showToast({
                  body: {
                    message: args.agent 
                      ? `Message sent to ${args.agent} agent` 
                      : "Message sent successfully",
                    variant: "success",
                  }
                })
                
                // Return meaningful message (tool completes, then queued message executes)
                return args.agent 
                  ? `Message sent to ${args.agent} agent`
                  : "Message sent successfully"
                
              case "context":
                // Silent injection with optional agent switching
                await ctx.client.session.prompt({
                  path: { id: toolCtx.sessionID },
                  body: { 
                    agent: args.agent,
                    noReply: true,
                    parts: [{ type: "text", text: args.text }]
                  }
                })
                return args.agent 
                  ? `Context injected via ${args.agent} agent (no AI response)`
                  : "Context injected silently into current session"
                
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
                // Compact session, then send with optional agent
                await ctx.client.tui.executeCommand({ 
                  body: { command: "session_compact" }
                })
                
                // Always use SDK for reliable message queuing
                await ctx.client.session.prompt({
                  path: { id: toolCtx.sessionID },
                  body: {
                    agent: args.agent,
                    parts: [{ type: "text", text: args.text }]
                  }
                })
                
                return args.agent 
                  ? `Session compacting... ${args.agent} agent will respond after completion`
                  : "Session compacting... Message queued to send after completion"
                
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
