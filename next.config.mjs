/** @type {import('next').NextConfig} */
const isGitHubPages = process.env.GITHUB_PAGES === 'true'

const nextConfig = {
  ...(isGitHubPages ? {
    output: 'export',
    trailingSlash: true,
    basePath: '/Valbid',
    assetPrefix: '/Valbid/',
  } : {}),
  images: { unoptimized: true },
}

export default nextConfig
