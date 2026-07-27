const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite on web runs on wa-sqlite (WebAssembly), so Metro needs to
// treat .wasm as a bundleable asset, not source it tries to parse as JS.
config.resolver.assetExts.push('wasm');

// expo-sqlite's web persistence (OPFS) needs SharedArrayBuffer, which browsers
// only expose to cross-origin-isolated pages. The production equivalent of
// these two headers lives in vercel.json.
config.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    middleware(req, res, next);
  };
};

module.exports = config;
