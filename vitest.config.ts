import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    environment: 'nuxt',
    environmentOptions: { nuxt: { domEnvironment: 'happy-dom' } },
    include: ['test/**/*.test.ts'],
    // Page-mount tests boot a Nuxt app; under machine load (several dev servers) 5 s is not enough.
    testTimeout: 30_000,
  },
})
