/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        port: '',
        pathname: '/sosh-images/**',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
        port: '',
        pathname: '/**',
      }
    ],
    domains: [
      'storage.googleapis.com',
      'lh3.googleusercontent.com'
    ]
  },
  experimental: {
    serverComponentsExternalPackages: ['sharp']
  }
}

module.exports = nextConfig