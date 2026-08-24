export default {
  base: process.env.GITHUB_ACTIONS ? "/codexBrowserGame/" : "/",
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          three: ["three"],
          animation: ["gsap"],
        },
      },
    },
  },
};
