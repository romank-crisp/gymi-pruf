import type { NextConfig } from 'next'
import path from 'node:path'

const nextConfig: NextConfig = {
  // Pin the workspace root to this directory. Without this, Next.js
  // walks up and finds the parent monorepo's pnpm-lock.yaml, which
  // confuses Turbopack about which app is which.
  turbopack: {
    root: path.resolve(__dirname),
  },
  // better-sqlite3 is a native module — exclude it from the server
  // bundler so it loads from node_modules at runtime.
  serverExternalPackages: ['better-sqlite3'],
}

export default nextConfig
