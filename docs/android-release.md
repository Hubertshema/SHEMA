# CallVault Android Release & Distribution Guide

## 1. Overview
This guide outlines the process for configuring release builds, generating signing keystores, managing versions, and producing production-ready APK and Android App Bundle (AAB) deliverables for Google Play Store distribution.

---

## 2. Keystore Generation & Signing Configuration
1. Generate a production release keystore (keep secure and back up safely):
   ```bash
   keytool -genkey -v -keystore release.keystore -alias callvault-release-key -keyalg RSA -keysize 2048 -validity 10000
   ```
2. Configure signing in `android/gradle.properties` or environment variables:
   ```properties
   MYAPP_UPLOAD_STORE_FILE=release.keystore
   MYAPP_UPLOAD_KEY_ALIAS=callvault-release-key
   MYAPP_UPLOAD_STORE_PASSWORD=your_store_password
   MYAPP_UPLOAD_KEY_PASSWORD=your_key_password
   ```
3. Update `android/app/build.gradle` to include the signing config for release buildTypes.

---

## 3. Version Management
In `android/app/build.gradle`:
- `versionCode`: Increment sequentially with every release (e.g., `1`, `2`, `3`).
- `versionName`: Semantic version string (e.g., `"1.0.0"`, `"1.0.1"`).

---

## 4. ProGuard & R8 Code Shrinking
Ensure `android/app/proguard-rules.pro` retains React Native, cryptographic, and native module packages:
```pro
-keep class com.shema.** { *; }
-keep class com.facebook.react.** { *; }
-dontwarn com.facebook.react.**
```

---

## 5. Building Release Artifacts
1. Clean previous build outputs:
   ```bash
   cd android
   ./gradlew clean
   ```
2. Generate Android App Bundle (AAB) for Google Play:
   ```bash
   ./gradlew bundleRelease
   ```
   *Output path*: `android/app/build/outputs/bundle/release/app-release.aab`
3. Generate Universal APK for direct distribution / testing:
   ```bash
   ./gradlew assembleRelease
   ```
   *Output path*: `android/app/build/outputs/apk/release/app-release.apk`
