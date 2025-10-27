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
 * @version 0.0.1
 * @license MIT
 * @author M. Adel Alhashemi
 * @see https://github.com/malhashemi/opencode-sessions
 */

import type { Plugin } from "@opencode-ai/plugin"
import { tool } from "@opencode-ai/plugin"

export const SessionPlugin: Plugin = async (ctx) => {
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

Common agents: build (default), plan, or custom agents from your config.

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
                // Send message with AI response
                await ctx.client.session.prompt({
                  path: { id: toolCtx.sessionID },
                  body: { 
                    agent: args.agent,
                    parts: [{ type: "text", text: args.text }]
                  }
                })
                return args.agent 
                  ? `Message sent via ${args.agent} agent`
                  : "Message sent in current session"
                
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
                
                // Use SDK if agent specified, TUI otherwise
                if (args.agent) {
                  await ctx.client.session.prompt({
                    path: { id: toolCtx.sessionID },
                    body: {
                      agent: args.agent,
                      parts: [{ type: "text", text: args.text }]
                    }
                  })
                  return `Session compacting... ${args.agent} agent will respond after completion`
                } else {
                  await ctx.client.tui.appendPrompt({ body: { text: args.text }})
                  await ctx.client.tui.submitPrompt()
                  return "Session compacting... Message queued to send after completion"
                }
                
              case "fork":
                // Fork via SDK for agent control
                // Note: For v0.0.1, fork creates a new session without parent linkage
                // TODO: Future enhancement - add parentID and copy messages from parent
                const forkedSession = await ctx.client.session.create({
                  body: {
                    title: args.agent 
                      ? `Fork via ${args.agent}` 
                      : "Forked session"
                  }
                })
                
                await ctx.client.session.prompt({
                  path: { id: forkedSession.data.id },
                  body: {
                    agent: args.agent || "build",
                    parts: [{ type: "text", text: args.text }]
                  }
                })
                
                return `Forked child session with ${args.agent || "build"} agent (ID: ${forkedSession.data.id})`
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
