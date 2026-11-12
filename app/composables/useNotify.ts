export type NotifyLevel = 'error' | 'success' | 'warning' | 'info'

const LEVELS: Record<NotifyLevel, { color: 'error' | 'success' | 'warning' | 'info', icon: string }> = {
  error: { color: 'error', icon: 'i-lucide-circle-alert' },
  success: { color: 'success', icon: 'i-lucide-circle-check' },
  warning: { color: 'warning', icon: 'i-lucide-triangle-alert' },
  info: { color: 'info', icon: 'i-lucide-info' },
}

/**
 * The only way to show a toast (handoff §7: toasts carry role="status").
 * Nuxt UI's toast has no role of its own and Reka announces it through a hidden region; this sets
 * role="status" on the toast and type "background" so that announcement is polite.
 */
export function useNotify() {
  const toast = useToast()
  function notify(message: string, level: NotifyLevel = 'info', description?: string) {
    const { color, icon } = LEVELS[level]
    // `role` is not in Nuxt UI's Toast type but is forwarded to the toast element as an attribute.
    const attrs = { role: 'status' }
    toast.add({ title: message, description, color, icon, type: 'background', ...attrs })
  }
  return { notify }
}
