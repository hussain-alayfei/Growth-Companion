// Vercel compiles api/*.js as CJS; load the ESM Express bundle via dynamic import.
module.exports = async function handler(req, res) {
  const { default: app } = await import("../artifacts/api-server/dist/vercel.mjs");
  return app(req, res);
};
