// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  {
    // evals/: deliberately broken fixtures for the agent eval suite. .claude/, .impeccable/: tooling, not app code.
    ignores: ['evals/**', '.claude/**', '.impeccable/**', 'docs/**', 'server/mock/fixtures.json'],
  },
)
