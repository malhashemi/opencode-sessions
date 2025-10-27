import type { Plugin } from "@opencode-ai/plugin"

export const SessionPlugin: Plugin = async ({ client }) => {
  // Store tool arguments by callID to access them in the after hook
  const argsStore = new Map<string, any>()

  return {
    // Capture arguments before tool executes
    "tool.execute.before": async (input, output) => {
      const toolName = input.tool

      // Store arguments for session management tools
      if (
        toolName === "session_compact_send" ||
        toolName === "session_new_send" ||
        toolName === "session_compact_run" ||
        toolName === "session_new_run"
      ) {
        argsStore.set(input.callID, output.args)
      }
    },

    // Execute TUI operations after tool completes
    "tool.execute.after": async (input, output) => {
      const toolName = input.tool

      try {
        // List prompts - no TUI interaction needed, just return the output
        if (toolName === "session_list_prompts") {
          return
        }

        // Retrieve stored arguments
        const args = argsStore.get(input.callID)

        // Clean up stored arguments
        argsStore.delete(input.callID)

        if (!args) {
          return
        }

        // Compact and send message
        if (toolName === "session_compact_send") {
          const message = args.message

          await new Promise((resolve) => setTimeout(resolve, 50))

          // Execute compact command
          await client.tui.executeCommand({
            body: { command: "session_compact" },
          })

          // Immediately append the message (while compacting)
          await client.tui.appendPrompt({
            body: { text: message },
          })

          // Wait 30 seconds for compacting to finish
          await new Promise((resolve) => setTimeout(resolve, 30000))

          // Submit the prompt
          await client.tui.submitPrompt({
            body: {},
          })

          await client.tui.showToast({
            body: {
              message: "Session compacted and message sent!",
              variant: "success",
            },
          })
        }

        // New session and send message
        if (toolName === "session_new_send") {
          const message = args.message

          await new Promise((resolve) => setTimeout(resolve, 50))

          // Create new session
          await client.tui.executeCommand({
            body: { command: "session_new" },
          })

          await new Promise((resolve) => setTimeout(resolve, 100))

          // Append the message
          await client.tui.appendPrompt({
            body: { text: message },
          })

          await new Promise((resolve) => setTimeout(resolve, 100))

          // Submit the prompt
          await client.tui.submitPrompt({
            body: {},
          })

          await client.tui.showToast({
            body: {
              message: "New session created and message sent!",
              variant: "success",
            },
          })
        }

        // Compact and run command
        if (toolName === "session_compact_run") {
          const command = args.command

          await new Promise((resolve) => setTimeout(resolve, 50))

          // Execute compact command
          await client.tui.executeCommand({
            body: { command: "session_compact" },
          })

          // Immediately append the command (while compacting)
          await client.tui.appendPrompt({
            body: { text: command },
          })

          // Wait 30 seconds for compacting to finish
          await new Promise((resolve) => setTimeout(resolve, 30000))

          // Submit the prompt
          await client.tui.submitPrompt({
            body: {},
          })

          await client.tui.showToast({
            body: {
              message: "Session compacted and prompt executed!",
              variant: "success",
            },
          })
        }

        // New session and run command
        if (toolName === "session_new_run") {
          const command = args.command

          await new Promise((resolve) => setTimeout(resolve, 50))

          // Create new session
          await client.tui.executeCommand({
            body: { command: "session_new" },
          })

          await new Promise((resolve) => setTimeout(resolve, 100))

          // Append the command
          await client.tui.appendPrompt({
            body: { text: command },
          })

          await new Promise((resolve) => setTimeout(resolve, 100))

          // Submit the prompt
          await client.tui.submitPrompt({
            body: {},
          })

          await client.tui.showToast({
            body: {
              message: "New session created and prompt executed!",
              variant: "success",
            },
          })
        }
      } catch (error) {
        await client.tui.showToast({
          body: {
            message: `Error: ${error instanceof Error ? error.message : String(error)}`,
            variant: "error",
          },
        })
      }
    },
  }
}
