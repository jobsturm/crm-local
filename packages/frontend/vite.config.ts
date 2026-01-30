import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import electron from 'vite-plugin-electron/simple';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  const isElectron = mode === 'electron' || process.env.ELECTRON === 'true';
  const isProduction = command === 'build';

  return {
    // Use relative paths for Electron production builds
    base: isProduction ? './' : '/',
    plugins: [
      vue(),
      isElectron &&
        electron({
          main: {
            entry: 'electron/main.ts',
          },
          preload: {
            input: 'electron/preload.ts',
          },
        }),
    ].filter(Boolean),
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:3456',
          changeOrigin: true,
        },
      },
    },
  };
});
