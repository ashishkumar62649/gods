# 2026-05-04 Open Questions

Use this file for answers while the migration continues. I will keep working with safe assumptions and reread this file during the loop.

## Current Questions

1. Should v2 use the current dark operational UI language, or should it move closer to v1's exact visual density and panel layout while keeping v2 controls?
2. For timeline history, what is the minimum useful window first: last 24 hours, last 7 days, or all retained database history?
3. For live data persistence, is it acceptable to store high-frequency snapshots at a throttled interval, for example every 30-60 seconds, instead of every single fetch/update?
4. For API keys already present in v1 `.env`, should I continue loading them locally for testing while keeping v2 `.env.example` safe and secret-free?
5. Should public API discovery prioritize free/no-key sources first, then key-based sources second, or should source quality matter more than authentication friction?

## Working Assumptions Until Answered

- Keep the current v2 UI structure, but preserve v1-style visualization density and real-time operational behavior.
- Start timeline history with the last 24 hours for high-frequency layers, then expand per domain.
- Persist high-volume live positions with throttling and batch inserts so Postgres stays healthy.
- Do not copy real secret values into v2 source files or docs.
- Prefer reliable, public, no-key sources first, while documenting key-based options in source coverage reports.


1. Use v2’s current dark operational UI language.

Do not copy v1’s exact visual layout. Use v1 only for functional reference. Keep v2 cleaner, more cinematic, more modern, and more production-ready. Bring back v1 density only where needed for operational information panels.

2. Start with last 24 hours for timeline history.

Minimum useful first version:
- Live mode
- Last 24 hours historical playback
- Forecast/future mode only for domains that naturally support it, like weather forecasts and satellite orbit prediction

After that works, expand to 7 days, then all retained database history.

3. Yes, throttled persistence is acceptable.

Store high-frequency live snapshots every 30-60 seconds first.

Do not store every single frontend/backend update unless a domain specifically needs it. Use:
- latest/current table or cache for live view
- historical snapshots table for timeline
- raw/source archive separately when needed

4. Yes, local v1 API keys can be used for testing only.

But:
- do not copy real secrets into v2 source
- do not commit real `.env`
- keep `explorer-v2/.env.example` secret-free
- load local secrets through ignored `.env`
- document required env vars
- rotate exposed keys if they were shared in ZIP/repo history

5. Prioritize source quality first, then authentication friction.

Best order:
- high-quality official no-key sources
- high-quality official key-based sources
- reliable public mirrors/aggregators
- lower-quality/noisy sources only if clearly useful

Do not choose a weak source only because it is free/no-key. For MVP smoke testing, no-key sources are useful first, but production architecture should prefer reliable, authoritative sources.

## New Questions - Interaction And Data Transport

6. For aircraft interaction modes, should the v2 default be simple dot view at high altitude and aircraft icon/3D only after zooming in, or should icons always be visible even when zoomed far out?
7. For satellite interaction, which cinematic modes matter most first: orbit trail, ground-track trail, sensor footprint cone, constellation filter, or selected-satellite chase camera?
8. For maritime interaction, should the first cinematic mode focus on vessel trails near internet cables, cable-risk inspection routes, or a ship-follow camera?
9. For binary transport, should v2 prefer binary for every high-volume map feed even if debugging becomes harder, while keeping JSON only for small panels and admin/source-health?
10. For weather sources, should all 21 sources be fetched on every full run, or should we use tiered jobs where core official sources run often and slow/heavy sources run less frequently?

## Working Assumptions For New Questions

- Keep aircraft dot mode at high altitude, switch to icons/3D when zoomed in or selected.
- Implement satellite orbit trail and selected-satellite focus first, then add footprint cones.
- Implement maritime cable-risk trails first, then vessel follow mode.
- Use binary/vector transport for high-volume globe layers, JSON for small panels and diagnostics.
- Use tiered source schedules so authoritative fast sources update frequently and heavy datasets update safely.


1. Yes, simple dot mode at high altitude with icons/3D only after zooming in.
2. Cinematic modes: orbit trail and selected-satellite chase camera first, then ground-track trail, then footprint cones and constellation filters.
3. Maritime cinematic: cable-risk trails first, then add vessel-follow camera.
4. Binary transport for high-volume globe layers; JSON for small panels and diagnostics.
5. Tiered schedules: core sources frequent, heavy sources infrequent, with per-domain policies.

And keep everything on the globe not under the globe There are many things that are going inside the globe, inside ocean and inside the earth, we need to put everything on the globe in 3d view
1. When an object is selected and we move the globe, it should move along with the object. We need to fix the cesium camera settings

And the make sure the toggle of on off button will work with the layer, it should turn on and off the layer in the globe, and the opacity should also work 
And also all the satellite images view like cloud and other weather things should be represent on the globe perfectly and should be interactive with the globe And there should be the option to turn on on turn off all the things population or other things should work correctly 
And the And the north showing toggle the end should show where we are facing right now And that should be rotatable And there should be the option of 2D to 3D view toggle And the camera setting should be saved when we are moving the globe and then we should be able to reset the camera settings to the default settings

And make make the make sure the data is correct at that particular location if we are showing a particular location about everything and fetch all the real data Do not use the smoke data or the test data use real data fetch the real data from all the sources it doesn't matter how large it is how big is it is but fetch the real data and store it into a particular database and make sure the normalization should work so that it will clean the data and then save in the database Every pipeline should work correctly

## New Questions - AI World Intelligence Layer

11. For the first local intelligence assistant, should v2 prefer Ollama/local models first and use cloud LLMs only later, or should it support both through a provider abstraction from day one?
12. Should the first assistant be read-only, answering questions from database/API context only, or should it also be allowed to create watch zones and suggested alerts after user approval?
13. For public API onboarding, should I add sources only after they have a working fetch-normalize-load path, or also keep a candidate catalog in the database for future review?

## Working Assumptions For AI Layer

- Build a provider abstraction that can use Ollama locally first and leave room for cloud LLMs later.
- Keep the first assistant read-only: explain globe events, summarize live data, and point to source provenance.
- Keep public API candidates in documentation/source registry candidates, but only mark a source active after fetch-normalize-load-DB works.
