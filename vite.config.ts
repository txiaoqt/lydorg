import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { readFileSync } from 'node:fs';

type PackageMetadata = {
  version?: string;
};

const packageMetadata = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as PackageMetadata;

const formatBuildTimestamp = (date: Date) =>
  date.toISOString().replace(/\D/g, '').slice(0, 14);

export default defineConfig(() => {
  const configuredVersion = process.env.VITE_APP_VERSION?.trim();
  const configuredRelease = configuredVersion?.split('+')[0];
  const releaseVersion = (
    configuredRelease && configuredRelease !== '0.0.0'
      ? configuredRelease
      : packageMetadata.version || '1.0.0'
  );
  const buildTimestamp = formatBuildTimestamp(new Date());
  const commitSha = process.env.VERCEL_GIT_COMMIT_SHA?.trim().slice(0, 7);
  const appVersion = `${releaseVersion}+${buildTimestamp}${commitSha ? `.${commitSha}` : ''}`;

  return {
    plugins: [react()],
    define: {
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: '0.0.0.0',
    },
    build: {
      outDir: 'build',
    },
  };
});
