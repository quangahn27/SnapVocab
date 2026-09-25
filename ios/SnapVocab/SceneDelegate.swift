internal import Expo

// Required by the iOS 27 SDK, which asserts at launch unless the app adopts the
// scene-based life cycle. `ExpoAppSceneDelegate` creates the window from the
// connecting `UIWindowScene` and starts React Native into it; see
// `UIApplicationSceneManifest` in Info.plist for how UIKit is told to use this class.
class SceneDelegate: ExpoAppSceneDelegate {}
