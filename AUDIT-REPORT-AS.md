# Zubeen Player — Code Audit Fixes (অসমীয়া)

এই সংস্কৰণটো local audit আৰু local smoke testing-ৰ বাবে update কৰা হৈছে। Live website/Render-ত deploy কৰা হোৱা নাই।

## কৰা পৰিৱৰ্তন

1. **Admin API security**
   - `ADMIN_KEY` নাথাকিলে admin API access বন্ধ থাকে (HTTP 503)।
   - Key configured থাকিলে ভুল/নথকা key-ত admin endpoints HTTP 401 দিয়ে।
   - `/api/admin/songs` GET endpoint-টোও protected কৰা হৈছে।
2. **Static file security**
   - Server-এ এতিয়া allowlist-ত থকা public files-হে serve কৰে।
   - `server.js`, `.bak` files, `data/catalog.json`, `.env` আৰু unknown paths public HTTP-ৰে পোৱা নাযায়।
   - Unknown path-ত HTTP 404 দিয়ে; homepage HTML-টো ভুলকৈ 200 হিচাপে ঘূৰাই নিদিয়ে।
3. **Tune In / YouTube readiness**
   - YouTube player ready হোৱাৰ আগতে Tune In request আহিলে playback intent সংৰক্ষণ কৰি player ready হোৱাৰ পিছত play/cue কৰে।
4. **Song advance duplicate-call guard**
   - Frontend-ত `advanceAndPlay()` request-সমূহৰ বাবে in-flight guard যোগ কৰা হৈছে, যাতে ended/watchdog event একেলগে আহিলে duplicate advance call কমে।
5. **IST schedule**
   - `schedule.html`-ৰ clock/date explicit `Asia/Kolkata`-ত চলে।
   - Disabled program-সমূহ active/ON AIR হিচাপে দেখুওৱা নহয়।
   - Server আৰু main app-এ active program বাছোঁতে `enabled:false` program বাদ দিয়ে।
6. **Schedule validation**
   - Admin schedule save কৰোঁতে `HH:MM` সময় validate কৰা হয়।
   - সকলো program disabled কৰি schedule save কৰিবলৈ নিদিয়ে।
7. **Service worker cache**
   - Cache version bump কৰা হৈছে।
   - `/api/*` response cache নকৰে আৰু network error হ'লে API request-ৰ ঠাইত homepage HTML নিদিয়ে।
8. **Setup documentation**
   - `.env.example`-ত `ADMIN_KEY` বাধ্যতামূলক কৰাৰ বিষয়ে উল্লেখ কৰা হৈছে।

## Local tests

- `node --check server.js` — PASS
- `node --check app.js` — PASS
- `node --check sw.js` — PASS
- HTML files parse check — PASS
- Inline JavaScript syntax checks — PASS
- JSON files parse check — PASS
- Local HTTP smoke tests — PASS
- Internal source/backup/data path blocked — PASS
- Unknown URL returns 404 — PASS
- Admin API disabled without key / rejects wrong key / accepts correct test key — PASS
- Invalid schedule time and all-disabled schedule rejected — PASS
- Radio advance endpoint smoke test — PASS; tested 8 advances without immediate same-song repeat

## গুৰুত্বপূৰ্ণ সীমাবদ্ধতা

- এইটো browser/device-ত সম্পূৰ্ণ গান বজাই কৰা test নহয়। YouTube API/Internet-ৰ বাস্তৱ playback, lock-screen background playback, Android/iPhone behavior আৰু বহু listener-ৰ real-time timing পৃথকভাৱে পৰীক্ষা কৰিব লাগিব।
- Radio station state আৰু history এতিয়াও process memory-ত থাকে; server restart-ৰ পিছত সেই data স্থায়ীভাৱে নাথাকে।
- `ADMIN_KEY` configure নকৰিলে admin panel-ৰ management feature বন্ধ থাকিব। Live deploy কৰাৰ আগতে environment-ত দীঘলীয়া random secret set কৰিব লাগিব।
- Live deployment কৰা হোৱা নাই।
