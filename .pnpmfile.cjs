// Used by `submitly`'s React 18 test run (`pnpm --filter submitly test:react18`).
// `react-dom-18` / `@types/react-dom-18` are aliases of the React 18 packages, but
// pnpm would satisfy their `react` / `@types/react` peers with the workspace's
// React 19. Point those peers at the aliased React 18 copies instead.
function readPackage(pkg) {
  if (pkg.name === "react-dom" && pkg.version === "18.3.1") {
    delete pkg.peerDependencies.react;
    pkg.dependencies = { ...pkg.dependencies, react: "npm:react@18.3.1" };
  }

  if (pkg.name === "@types/react-dom" && pkg.version === "18.3.7") {
    delete pkg.peerDependencies["@types/react"];
    pkg.dependencies = { ...pkg.dependencies, "@types/react": "npm:@types/react@18.3.31" };
  }

  return pkg;
}

module.exports = { hooks: { readPackage } };
