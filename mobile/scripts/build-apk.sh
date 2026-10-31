#!/usr/bin/env bash
# @MOB-172 Builds the signed Android APK for download from the website (no Play Store, no EAS
# account). Needs JDK 17+ and the Android SDK (ANDROID_HOME). Output: dist/temurbek-school-<version>.apk
#
# The keystore signs every version. Android only installs an update over the old app when both are
# signed with the same key, so keep credentials/ backed up: losing it means every user has to
# uninstall and install again.
set -euo pipefail
cd "$(dirname "$0")/.."

KEYSTORE="${KEYSTORE:-credentials/temurbek-release.keystore}"
KEY_ALIAS="${KEY_ALIAS:-temurbek}"
PASSWORD_FILE="${PASSWORD_FILE:-credentials/keystore-password.txt}"
export EXPO_PUBLIC_API_URL="${EXPO_PUBLIC_API_URL:-https://api-temurbek.e-tizim.uz}"
export EXPO_PUBLIC_APP_ENV="${EXPO_PUBLIC_APP_ENV:-production}"
# Crash reporting has no Sentry project yet: skip source map upload.
export SENTRY_DISABLE_AUTO_UPLOAD=true
export NODE_ENV=production

if [ ! -f "$KEYSTORE" ]; then
  mkdir -p "$(dirname "$KEYSTORE")"
  openssl rand -base64 24 | tr -d '/+=' > "$PASSWORD_FILE"
  chmod 600 "$PASSWORD_FILE"
  keytool -genkeypair -v -keystore "$KEYSTORE" -alias "$KEY_ALIAS" -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass "$(cat "$PASSWORD_FILE")" -keypass "$(cat "$PASSWORD_FILE")" \
    -dname "CN=TEMURBEK SCHOOL, O=TEMURBEK SCHOOL, C=UZ"
  chmod 600 "$KEYSTORE"
  echo "Created $KEYSTORE. Back up credentials/ now."
fi
PASSWORD="$(cat "$PASSWORD_FILE")"
VERSION="$(node -p "require('./app.json').expo.version")"

# prebuild rewrites the npm scripts in package.json; keep the file as it was.
cp package.json /tmp/temurbek-package.json
npx expo prebuild --platform android --clean --no-install
cp /tmp/temurbek-package.json package.json
# Use an NDK that is already installed (newest) instead of downloading React Native's default (~1 GB).
if [ -z "${NDK_VERSION:-}" ] && [ -d "${ANDROID_HOME:-}/ndk" ]; then
  NDK_VERSION="$(ls "$ANDROID_HOME/ndk" | sort -V | tail -1)"
fi
if [ -n "${NDK_VERSION:-}" ]; then
  sed -i.bak "s/^apply plugin: \"expo-root-project\"/ext.ndkVersion = \"$NDK_VERSION\"\napply plugin: \"expo-root-project\"/" android/build.gradle
  rm -f android/build.gradle.bak
  echo "Using NDK $NDK_VERSION"
fi
(
  cd android
  ./gradlew assembleRelease --no-daemon \
    -Pandroid.injected.signing.store.file="$(cd .. && pwd)/$KEYSTORE" \
    -Pandroid.injected.signing.store.password="$PASSWORD" \
    -Pandroid.injected.signing.key.alias="$KEY_ALIAS" \
    -Pandroid.injected.signing.key.password="$PASSWORD" \
    -PreactNativeArchitectures="${ARCHS:-arm64-v8a,armeabi-v7a}"
)
mkdir -p dist
cp android/app/build/outputs/apk/release/app-release.apk "dist/temurbek-school-$VERSION.apk"
echo "Built dist/temurbek-school-$VERSION.apk"
