const { withAppBuildGradle, withGradleProperties } = require('@expo/config-plugins');

/**
 * Re-applies the Android release signing config that `expo prebuild` wipes.
 *
 * `MYAPP_RELEASE_STORE_FILE` deliberately points *out* of the generated tree,
 * at the `snapVocab.keystore` that is committed in the repo root — `file()`
 * resolves it against `android/app/`. A copy kept inside `android/app/` would
 * be untracked, and a clean prebuild deletes untracked files there, so it kept
 * disappearing and taking release signing with it.
 *
 * This only defines the `release` signing config. `buildTypes.release` still
 * uses `signingConfigs.debug` from the template, which is what the project has
 * always done — switch that line by hand when release builds should actually
 * be signed with the keystore.
 */

const PROPERTIES = {
  MYAPP_RELEASE_STORE_FILE: '../../snapVocab.keystore',
  MYAPP_RELEASE_KEY_ALIAS: 'snapVocab-alias',
  MYAPP_RELEASE_STORE_PASSWORD: '123456',
  MYAPP_RELEASE_KEY_PASSWORD: '123456',
};

// The end of the template's `debug` entry plus the close of `signingConfigs`.
const ANCHOR = `            keyPassword 'android'
        }
    }`;

// Guarded by `hasProperty` so a checkout without the properties still builds.
const RELEASE_SIGNING_CONFIG = `        release {
            if (project.hasProperty('MYAPP_RELEASE_STORE_FILE')) {
                storeFile file(MYAPP_RELEASE_STORE_FILE)
                storePassword MYAPP_RELEASE_STORE_PASSWORD
                keyAlias MYAPP_RELEASE_KEY_ALIAS
                keyPassword MYAPP_RELEASE_KEY_PASSWORD
            }
        }
`;

const withSigningProperties = (config) =>
  withGradleProperties(config, (config) => {
    for (const [key, value] of Object.entries(PROPERTIES)) {
      const existing = config.modResults.find(
        (item) => item.type === 'property' && item.key === key
      );
      if (existing) {
        existing.value = value;
      } else {
        config.modResults.push({ type: 'property', key, value });
      }
    }
    return config;
  });

const withSigningConfig = (config) =>
  withAppBuildGradle(config, (config) => {
    const contents = config.modResults.contents;

    if (contents.includes('MYAPP_RELEASE_STORE_FILE')) {
      return config;
    }
    if (!contents.includes(ANCHOR)) {
      throw new Error(
        'with-release-signing could not find the signingConfigs block in build.gradle. ' +
          'The Expo template has changed — update ANCHOR in this plugin.'
      );
    }

    config.modResults.contents = contents.replace(
      ANCHOR,
      `            keyPassword 'android'\n        }\n${RELEASE_SIGNING_CONFIG}    }`
    );
    return config;
  });

module.exports = (config) => withSigningConfig(withSigningProperties(config));
