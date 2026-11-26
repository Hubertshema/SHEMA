# Android recording compatibility

## Supported behavior

| Capability | CallVault behavior | Requirement / limitation |
| --- | --- | --- |
| Call event monitoring | Supported when `READ_PHONE_STATE` is granted and monitoring is enabled | The app stores ringing, active, ended, and unanswered events where Android delivers them. Phone number and direction are not guaranteed. |
| Background call-event monitoring | Best effort via `PHONE_STATE` broadcast | Android/OEM battery controls can delay or suppress delivery. This is not audio capture. |
| Microphone recording | Supported with explicit consent, `RECORD_AUDIO`, and a visible foreground-service notification | Captures the device microphone only; an active cellular call can cause silence or local-only audio. |
| Two-sided cellular-call recording | Not supported | `VOICE_CALL`, uplink, and downlink sources require the system-only `CAPTURE_AUDIO_OUTPUT` permission. |
| Automatic microphone recording | Supported only after the user enables it in the foreground and the notification is visible | Android can prevent background microphone service starts after reboot/process termination; opening the app restores it when permitted. |

## Compatibility diagnostics

The native `RecordingControlModule` reports the manufacturer, model, Android API level, phone-state permission, microphone permission, monitoring state, and supported modes in the app. It deliberately reports two-sided cellular recording as unavailable for ordinary app installations.

## Device test record

No physical-device test details were supplied to the repository. Before release, record the exact manufacturer, model, Android version/API level, call direction/event results, microphone file result, and background behavior here. Do not infer call-audio support from a microphone permission or a non-empty microphone file.

## Permission and privacy requirements

- `READ_PHONE_STATE` is used only for call-state events.
- `RECORD_AUDIO` is requested only when microphone-only recording is enabled.
- The foreground notification truthfully identifies microphone monitoring/recording.
- Obtain the consent required for every participant in the applicable jurisdiction before recording.
