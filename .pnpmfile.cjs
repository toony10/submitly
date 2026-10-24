// Used by `submitly`'s React 18 test run (`pnpm --filter submitly test:react18`).
// `react-dom-18` / `@types/react-dom-18` are aliases of the React 18 packages, but
// pnpm would satisfy their `react` / `@types/react` peers with the workspace's
// React 19. Point those peers at the aliased React 18 copies instead.
//
// The aliases are declared once, in packages/submitly/package.json
// (`"react-18": "npm:react@18.x.y"`, ...). Both the major to match and the version to
// point the peer at are read from there, so bumping an alias cannot silently turn this off.
const { devDependencies } = require("./packages/submitly/package.json");

function alias(name) {
  const spec = devDependencies[name];
  const match = /^npm:(.+)@(\d+)\.\d+\.\d+$/.exec(spec ?? "");

  if (!match) {
    throw new Error(`.pnpmfile.cjs: expected "${name}" in packages/submitly/package.json to be an exact "npm:<pkg>@<version>" alias, got ${JSON.stringify(spec)}`);
  }

  return { spec, major: match[2] };
}

const react = alias("react-18");
const types = alias("@types/react-18");
const reactDom = alias("react-dom-18");
const typesDom = alias("@types/react-dom-18");

function readPackage(pkg) {
  // Only the aliased React 18 copies of these packages match; the workspace's own are on 19.
  if (pkg.name === "react-dom" && pkg.version.startsWith(`${reactDom.major}.`)) {
    delete pkg.peerDependencies.react;
    pkg.dependencies = { ...pkg.dependencies, react: react.spec };
  }

  if (pkg.name === "@types/react-dom" && pkg.version.startsWith(`${typesDom.major}.`)) {
    delete pkg.peerDependencies["@types/react"];
    pkg.dependencies = { ...pkg.dependencies, "@types/react": types.spec };
  }

  return pkg;
}

module.exports = { hooks: { readPackage } };
