/**
 * Notify Plugin
 *
 * Sends a native terminal notification when the agent is done and waiting for input.
 * Supports multiple terminal protocols:
 * - OSC 777: Ghostty, iTerm2, WezTerm, rxvt-unicode
 * - OSC 99: Kitty
 * - Windows toast: Windows Terminal (WSL)
 */

import type { Plugin } from "@opencode-ai/plugin"

function toast(title: string, body: string): string {
  const type = "Windows.UI.Notifications"
  const mgr = `[${type}.ToastNotificationManager, ${type}, ContentType = WindowsRuntime]`
  const template = `[${type}.ToastTemplateType]::ToastText01`
  const xml = `[${type}.ToastNotificationManager]::GetTemplateContent(${template})`
  return [
    `${mgr} > $null`,
    `$xml = ${xml}`,
    `$xml.GetElementsByTagName('text')[0].AppendChild($xml.CreateTextNode('${body}')) > $null`,
    `[${type}.ToastNotificationManager]::CreateToastNotifier('${title}').Show([${type}.ToastNotification]::new($xml))`,
  ].join("; ")
}

function osc777(title: string, body: string) {
  process.stdout.write(`\x1b]777;notify;${title};${body}\x07`)
}

function osc99(title: string, body: string) {
  process.stdout.write(`\x1b]99;i=1:d=0;${title}\x1b\\`)
  process.stdout.write(`\x1b]99;i=1:p=body;${body}\x1b\\`)
}

async function windows(title: string, body: string, $: any) {
  await $`powershell.exe -NoProfile -Command ${toast(title, body)}`.quiet()
}

async function notify(title: string, body: string, $: any) {
  if (process.env.WT_SESSION) return windows(title, body, $)
  if (process.env.KITTY_WINDOW_ID) return osc99(title, body)
  osc777(title, body)
}

export const NotifyPlugin: Plugin = async ({ $ }) => ({
  event: async ({ event }) => {
    if (event.type === "session.idle") await notify("opencode", "Ready for input", $)
  },
})
