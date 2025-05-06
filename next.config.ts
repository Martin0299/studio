
import type {NextConfig} from 'next';
import fs from 'fs';
import path from 'path';

// Read package.json to get the version
let appVersion = '0.0.0'; // Default fallback version
try {
  const packageJsonPath = path.resolve(process.cwd(), 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
    const packageJson = JSON.parse(packageJsonContent);
    appVersion = packageJson.version || '0.0.0';
  } else {
    console.warn("package.json not found. Using default app version.");
  }
} catch (error) {
  console.error("Error reading package.json for app version:", error);
}


const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  env: {
    APP_VERSION: appVersion,
  },
};

export default nextConfig;
