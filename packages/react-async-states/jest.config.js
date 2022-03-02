// Or async function
module.exports = async () => {
  return {
    verbose: true,
    coverageDirectory: "build",
    collectCoverageFrom: [
      "**/*.{js,jsx,ts,tsx}",
      "!**/node_modules/**",
      "../async-state/**",
      "../shared/**"
    ],
  };
};
