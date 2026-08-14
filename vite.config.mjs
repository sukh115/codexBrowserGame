export default {
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
