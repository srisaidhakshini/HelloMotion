# Native camera milestone

This is a Windows 11 x64 development integration, not a tested public release.

The media source in `source/` is adapted from Microsoft's MIT-licensed Windows-Camera sample, commit `626f8b19c5f367602f2e89c6b314573d3776c9df`. Original copyright notices and license are retained in `MICROSOFT-LICENSE`. Changes remove the physical-camera wrapper modes and packaged-app configuration, assign HelloMotion a separate CLSID, advertise 960×540 RGB32/NV12, and replace generated pixels with a local pipe reader.

## Build and setup

Prerequisites: Visual Studio 2022 Build Tools with the Desktop development with C++ workload and Windows 11 SDK. Node dependencies must already be installed.

From the repository root:

```
npm run camera:build
```

One-time development registration, in an administrator PowerShell:

```
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/setup-camera.ps1
```

Start the app normally. Click **Test pattern**, then **Call output off** to enable output. Choose **HelloMotion Windows Virtual Camera** in the calling application's camera settings. The device is registered for the current user's session, while the source DLL's COM registration is machine-wide. Keep the repository in place until unregistering.

For an automated capture check that opens only HelloMotion, with no physical camera access:

```
node scripts/test-camera.cjs
```

Stop HelloMotion and all camera clients before removing the COM registration:

```
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/setup-camera.ps1 -Remove
```

## Data path

Renderer canvas → bounded Electron IPC → latest-frame buffer → random local named pipe → Media Foundation source → calling app.

The pipe carries a 32-byte header followed by top-down BGRA pixels. Header: ASCII HMF1, version 1, width 960, height 540, stride 3840, byte count 2073600, sequence, reserved. Integer fields are little endian. At most four pipe clients are accepted. The source returns black when disconnected, on a malformed packet, or after a producer stall. The server expires frames after 500 ms. Pixels remain in memory, with no video files or network listener. The first implementation uses Windows' default pipe access controls and an unpredictable endpoint; explicit per-user/service ACLs remain a release-hardening task.

The producer targets 24 fps while the virtual device advertises 30 fps and repeats the latest frame. The preview is mirrored; outgoing webcam frames are reversed to normal orientation. Test-pattern text remains readable. The native sample currently reads a pipe synchronously with a 150 ms deadline; an asynchronous latest-frame reader and measured performance are required before release.

## Acceptance gates

- Native x64 projects compile and the pixel probe passes.
- WhatsApp Desktop and Google Meet receive moving video on a second device.
- Webcam plus effects, camera changes, app closure, camera-client closure, and producer stalls behave correctly.
- No virtual-camera input feedback, frozen personal frames, or device left behind on normal shutdown.
- Installer installs/removes the source from a stable system-accessible directory and includes third-party notices.
- CPU, memory, latency, and gesture reliability measured on an 8 GB laptop.

Until these checks pass, do not claim calling-app compatibility or ship the unsigned development build as a finished installer.
