// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // supabase/functions draait in Deno; controleren met npm run check:functions
    ignores: ['dist/*', 'src/lib/*.gen.ts', 'supabase/functions/*'],
  },
]);
