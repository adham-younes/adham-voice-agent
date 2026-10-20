export const DEFAULT_CONVERSATION_MODEL = 'gemini-3.5-flash-lite'

export function resolveConversationModel(value?: string) {
  const model = value?.trim()
  // Migrate the deprecated default even if an older deployment set it explicitly.
  return !model || model === 'gemini-2.5-flash' ? DEFAULT_CONVERSATION_MODEL : model
}
