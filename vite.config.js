import { defineConfig, loadEnv } from 'vite'
import FullReload from 'vite-plugin-full-reload'

const PLATFORM_MODES = new Set([
  'development',
  'web',
  'crazygames',
  'poki',
  'gamedistribution',
  'mobile'
])

const PLATFORM_OUTPUT_DIR = {
  development: 'dist',
  web: 'dist-web',
  crazygames: 'dist-crazygames',
  poki: 'dist-poki',
  gamedistribution: 'dist-gamedistribution',
  mobile: 'dist-mobile'
}

export default defineConfig(({ command, mode }) => {
  // Load mode-specific env values (example: .env.crazygames, .env.poki)
  const env = loadEnv(mode, process.cwd(), '')

  // Prefer explicit env platform, otherwise map known modes to platform names.
  const platformFromMode = PLATFORM_MODES.has(mode) ? mode : 'development'
  const platform = env.VITE_PLATFORM || platformFromMode

  // Firebase stays opt-in; project currently defaults to disabled.
  const isFirebaseEnabled = env.VITE_ENABLE_FIREBASE === 'true'

  // Ad-free variant wiring is kept for future rollout.
  const isAdFree = env.VITE_AD_FREE === 'true'
  const isCrazyGamesSdkOnly = env.VITE_CG_SDK_ONLY === 'true'

  const outDir = PLATFORM_OUTPUT_DIR[platform] || `dist-${platform}`
  // Future ad-free example:
  // const outDir = mode === 'crazygames-noads' ? 'dist-crazygames-noads' : (PLATFORM_OUTPUT_DIR[platform] || `dist-${platform}`)

  console.log(`[Vite] Command: ${command}`)
  console.log(`[Vite] Mode: ${mode}`)
  console.log(`[Vite] Platform: ${platform}`)
  console.log(`[Vite] Ad-free variant: ${isAdFree}`)
  console.log(`[Vite] CrazyGames SDK-only: ${isCrazyGamesSdkOnly}`)
  console.log(`[Vite] Firebase enabled: ${isFirebaseEnabled}`)

  return {
    plugins: [
      FullReload(['src/visuals/**/*.css', 'index.html'])
    ],
    base: './',

    // Keep explicit define defaults to avoid undefined runtime env flags.
    define: {
      'import.meta.env.VITE_PLATFORM': JSON.stringify(platform),
      'import.meta.env.VITE_AD_FREE': JSON.stringify(env.VITE_AD_FREE || 'false'),
      'import.meta.env.VITE_CG_SDK_ONLY': JSON.stringify(env.VITE_CG_SDK_ONLY || 'false'),

      // Firebase config (disabled unless VITE_ENABLE_FIREBASE=true)
      'import.meta.env.VITE_ENABLE_FIREBASE': JSON.stringify(env.VITE_ENABLE_FIREBASE || 'false'),
      'import.meta.env.VITE_FIREBASE_API_KEY': JSON.stringify(env.VITE_FIREBASE_API_KEY || ''),
      'import.meta.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify(env.VITE_FIREBASE_AUTH_DOMAIN || ''),
      'import.meta.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(env.VITE_FIREBASE_PROJECT_ID || ''),
      'import.meta.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify(env.VITE_FIREBASE_STORAGE_BUCKET || ''),
      'import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(env.VITE_FIREBASE_MESSAGING_SENDER_ID || ''),
      'import.meta.env.VITE_FIREBASE_APP_ID': JSON.stringify(env.VITE_FIREBASE_APP_ID || ''),
      'import.meta.env.VITE_FIREBASE_MEASUREMENT_ID': JSON.stringify(env.VITE_FIREBASE_MEASUREMENT_ID || ''),

      // Platform SDK IDs
      'import.meta.env.VITE_GD_GAME_ID': JSON.stringify(env.VITE_GD_GAME_ID || ''),
      'import.meta.env.VITE_CG_LB_ENCRYPTION_KEY': JSON.stringify(env.VITE_CG_LB_ENCRYPTION_KEY || '')
    },

    build: {
      outDir,
      assetsDir: 'assets',
      assetsInlineLimit: 0,
      emptyOutDir: true,
      sourcemap: mode === 'development',

      rollupOptions: {
        output: {
          // Split Firebase into a separate chunk only when enabled.
          manualChunks: isFirebaseEnabled
            ? { firebase: ['firebase/app', 'firebase/analytics'] }
            : undefined
        },
        // Prevent Firebase from being bundled when disabled.
        external: isFirebaseEnabled
          ? []
          : ['firebase/app', 'firebase/analytics', 'firebase/auth', 'firebase/firestore']
      }
    },

    server: {
      port: 3000,
      open: true,
      host: true,
      headers: {
        'Cache-Control': 'no-store',
        'Clear-Site-Data': '"cache", "cookies", "storage"'
      }
    },

    optimizeDeps: {
      include: isFirebaseEnabled ? ['firebase/app', 'firebase/analytics'] : [],
      exclude: isFirebaseEnabled ? [] : ['firebase/app', 'firebase/analytics']
    }
  }
})
