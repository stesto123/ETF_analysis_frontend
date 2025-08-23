Testing the ETF Flutter app on Android and iOS (external testers)

Goal: allow testers not connected to your local network to install builds.

Overview
- For Android you can produce an APK or AAB (app bundle) and publish it to a GitHub Release or Firebase App Distribution. Testers can download the APK from the release page and install it on their devices.
- For iOS you must use TestFlight (App Store Connect). Building and uploading iOS archives requires a macOS machine or CI on macos-latest and valid Apple credentials/certificates.

Quick Android flow (ready-to-run CI provided):
1. Trigger the GitHub Actions workflow "Android CI & Release" (Workflow -> Run workflow).
2. The job builds an APK and AAB and will create a GitHub Release containing the artifacts.
3. Share the release URL with testers. Testers download the APK and install it (they must enable installs from unknown sources).

iOS notes (requires setup):
- Building/uploading to TestFlight requires macOS. Use the provided iOS workflow template as a starting point and configure Fastlane or App Store Connect API keys.
- After upload, invite external testers in App Store Connect -> TestFlight. Testers will receive an email and can install via the TestFlight app.

Security & prerequisites
- For Android release via GitHub the workflow uses the built-in GITHUB_TOKEN and creates a release. No external secret required for that path.
- For Firebase App Distribution or Google Play you will need service account keys; store them in GitHub Secrets and configure the workflow accordingly (examples are documented in the workflow file comments).
- For iOS/TestFlight you will need an App Store Connect API key or App-specific password and provisioning profiles. These should be added to GitHub Secrets and configured for fastlane.

Tester instructions (Android APK)
1. On the Android device go to Settings -> Security and enable install from unknown sources (or use the browser prompt when installing).
2. Download the APK from the GitHub Release page.
3. Open the APK file and install.

Tester instructions (iOS TestFlight)
1. Accept the TestFlight invitation email from App Store Connect.
2. Install the TestFlight app from the App Store.
3. Open TestFlight and install the build.

CI and automation next steps
- Option A (fast): use the provided Android workflow — it builds and attaches artifacts to a GitHub Release.
- Option B (recommended for larger teams): integrate Firebase App Distribution (both platforms) or Google Play internal testing (Android) and TestFlight (iOS). This gives managed distribution and update notifications.

If you want, I can:
- Configure Firebase App Distribution workflow (requires you to provide a Firebase service account JSON and project/app IDs), or
- Add a Play Store internal-track deployment step (requires Google Play service account), or
- Implement a fully working iOS Fastlane + GitHub Actions flow (requires Apple secrets and macOS-runner access).

See the `.github/workflows/android-distribution.yml` and `.github/workflows/ios-distribution.yml` files for CI templates.
