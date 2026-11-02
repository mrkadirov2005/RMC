// @MOB-107 Sentry's Metro config adds debug IDs to bundles, so uploaded source maps match crashes.
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

module.exports = getSentryExpoConfig(__dirname);
