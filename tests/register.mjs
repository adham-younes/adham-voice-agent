import { registerHooks } from 'node:module'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) specifier = new URL('../' + specifier.slice(2), import.meta.url).href
    if (specifier.startsWith('file:') || specifier.startsWith('.')) {
      const url = new URL(specifier, context.parentURL)
      if (existsSync(fileURLToPath(url) + '.ts')) return nextResolve(url.href + '.ts', context)
    }
    return nextResolve(specifier, context)
  },
})
