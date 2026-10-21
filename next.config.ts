import path from 'node:path';
import type { NextConfig } from 'next';
const nextConfig: NextConfig = { outputFileTracingRoot: path.resolve('.'), output: 'export', trailingSlash: true, images: { unoptimized: true } };
export default nextConfig;
