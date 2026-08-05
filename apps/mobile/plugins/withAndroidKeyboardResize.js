const { withAndroidManifest } = require("expo/config-plugins");

// By default Android leaves the WebView's layout untouched when the
// keyboard opens, so on-page inputs near the bottom (like a form's last
// field or submit button) end up hidden behind the keyboard. adjustResize
// tells Android to shrink the window instead, letting the WebView's own
// scroll-into-view behavior keep the focused input visible above it.
module.exports = function withAndroidKeyboardResize(config) {
  return withAndroidManifest(config, (config) => {
    const mainActivity = config.modResults.manifest.application[0].activity.find(
      (a) => a.$["android:name"] === ".MainActivity"
    );
    if (mainActivity) {
      mainActivity.$["android:windowSoftInputMode"] = "adjustResize";
    }
    return config;
  });
};
