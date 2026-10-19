// app.json is the config. A web export hosted under a subpath (GitHub Pages
// serves the repository at /<repo>/) sets PLAYER_WEB_BASE_URL at export time;
// every other build, Electron's root-hosted export included, leaves it unset.
module.exports = ({ config }) => {
  const baseUrl = process.env.PLAYER_WEB_BASE_URL;
  if (!baseUrl) return config;
  return { ...config, experiments: { ...config.experiments, baseUrl } };
};
