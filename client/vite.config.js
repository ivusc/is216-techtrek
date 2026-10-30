import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueDevTools from 'vite-plugin-vue-devtools';

// Filesystems that carry the project in from a host but do not implement
// inotify. Docker Desktop mounts the workspace over 9p/drvfs on Windows and
// virtiofs or grpcfuse on macOS; the kernel emits no change events for
// anything underneath, so Vite's watcher never learns that a file was saved
// and HMR silently stops working. Polling is the only way to see edits there.
//
// Moving the repo onto a native filesystem (a Dev Containers volume clone, or
// WSL2's own ext4) restores inotify, and the check below then turns polling
// back off by itself.
const FILESYSTEMS_WITHOUT_INOTIFY = new Set([
  '9p',
  'virtiofs',
  'vboxsf',
  'cifs',
  'fuse.grpcfuse',
  'fuse.osxfs',
]);

// The fstype of the longest mount point containing `dir`, per /proc/mounts
// (fields: source target fstype options). Returns '' off Linux, where native
// watching works and there is nothing to detect.
function filesystemOf(dir) {
  if (!existsSync('/proc/mounts')) return '';

  let fstype = '';
  let matched = 0;
  for (const line of readFileSync('/proc/mounts', 'utf8').split('\n')) {
    const [, target, type] = line.split(' ');
    if (!target || !type) continue;
    const prefix = target.endsWith('/') ? target : `${target}/`;
    if (`${dir}/`.startsWith(prefix) && target.length >= matched) {
      matched = target.length;
      fstype = type;
    }
  }
  return fstype;
}

const projectFilesystem = filesystemOf(fileURLToPath(new URL('.', import.meta.url)));
const usePolling = FILESYSTEMS_WITHOUT_INOTIFY.has(projectFilesystem);

if (usePolling) {
  console.log(
    `[vite] ${projectFilesystem} mount detected - watching files by polling so HMR works`,
  );
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), vueDevTools()],
  css: {
    preprocessorOptions: {
      scss: {
        // Bootstrap 5.3 still uses @import and legacy color functions
        quietDeps: true,
        silenceDeprecations: ['import', 'global-builtin', 'color-functions', 'if-function'],
      },
    },
  },
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    // Only set when the mount gives us no choice: polling re-stats every
    // watched file on an interval, which costs CPU and is slow over 9p.
    watch: usePolling ? { usePolling: true, interval: 300, binaryInterval: 1000 } : undefined,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
