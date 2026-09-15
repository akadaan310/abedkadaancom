/** @type {import('next').NextConfig} */
const nextConfig = {
  // The laboratory core is framework-independent; the site only renders its state.
  outputFileTracingIncludes: {
    '/**': ['./ledger/**/*', './lab/corpus/data/**/*'],
  },
};

export default nextConfig;
