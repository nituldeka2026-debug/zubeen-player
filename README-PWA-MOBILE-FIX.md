# Zubeen Radio v12 — PWA Mobile Install Fix v2

This update keeps the v12 radio/schedule/rotation fixes and improves mobile PWA installation handling.

- Install App button is visible on mobile and desktop when not already installed.
- Android Chrome: uses the native `beforeinstallprompt` when Chrome exposes it; otherwise shows the exact browser install path.
- iPhone/iPad: shows Safari Add to Home Screen instructions.
- Manifest includes separate `any` and `maskable` 192/512 PNG icons.
- Service worker cache version bumped to force the new PWA assets.
- Mobile web-app meta tags added.
