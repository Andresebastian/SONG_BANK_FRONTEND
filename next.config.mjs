/** @type {import('next').NextConfig} */
const nextConfig = {
    async rewrites() {
      return [
        { source: '/api/:path*', destination: 'https://superior-peafowl-andresorganization-15ad7cc7.koyeb.app/:path*' },
      ];
    },
  };
  export default nextConfig;
  