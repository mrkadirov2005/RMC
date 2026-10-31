// @MOB-172 Android installs an update over the old app only when versionCode grows, so it is derived
// from the version in app.json: 1.2.3 → 10203. Change only "version" for a new release.
module.exports = ({ config }) => {
  const [major, minor, patch] = String(config.version).split('.').map(Number);
  return { ...config, android: { ...config.android, versionCode: major * 10000 + minor * 100 + patch } };
};
