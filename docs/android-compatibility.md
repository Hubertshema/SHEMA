# CallVault Android Compatibility & Recording Policy Report (Phase 3 & Phase 4)

## Device & Environment Specifications
- **Tested Environment**: Android Emulator / Physical Android Device
- **Android Version**: Android 12.0+ (API Level 31+) / Backward compatible down to API 24 (Android 7.0)
- **Architecture**: React Native CLI 0.88.1, Kotlin 2.2.0

## Permissions Used
- `android.permission.READ_PHONE_STATE`: Required to monitor telephony call states (ringing, offhook, idle) via `TelephonyManager` / `TelephonyCallback`.

## Call-State Detection Support
- **Incoming Ringing**: Fully supported via `TelephonyManager.CALL_STATE_RINGING`.
- **Active Call**: Fully supported via `TelephonyManager.CALL_STATE_OFFHOOK`.
- **Call Ended**: Fully supported via `TelephonyManager.CALL_STATE_IDLE`.

## Phase 4 Call-Audio Recording Compatibility Assessment
> [!IMPORTANT]
> **Definitive OS Recording Policy Determination**:
> Modern Android operating systems (Android 9 Pie through Android 14/15+) strictly prohibit ordinary third-party applications from capturing telephony audio (`VOICE_CALL`, `VOICE_DOWNLINK`, `VOICE_UPLINK` audio sources). 
> 
> **Compliance & Architectural Action**:
> - Per strict development rules, CallVault **does not** attempt root-based bypasses, accessibility workarounds, hidden microphone recording, or undocumented API exploits.
> - CallVault transparently reports this platform limitation and operates in **Secure Call Event Monitoring and AES-256-GCM Encrypted Vault Archiving mode**, ensuring full regulatory compliance and robust local security without violating Android privacy restrictions.
