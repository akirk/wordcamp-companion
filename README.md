# WordCamp Companion

**Contributors:** akirk
**Tags:** wordcamp, events, schedule, conference, notes
**Requires at least:** 5.0
**Tested up to:** 6.9
**Requires PHP:** 7.4
**License:** GPLv2 or later
**License URI:** http://www.gnu.org/licenses/gpl-2.0.html
**Stable tag:** 1.0.1

Plan the WordCamp you are attending, save sessions, follow a minimal live companion timeline, and export your session notes.

## Description

WordCamp Companion is a logged-in WordPress app for planning WordCamp attendance.

It can list upcoming WordCamps from WordCamp Central, open the schedule for a selected event, and save the sessions you want to attend. The companion view focuses on the next practical step: arriving at the venue, walking to the right track, following saved sessions, and seeing day boundaries for multi-day events.

Saved sessions are stored as WordPress posts owned by the current user. WordCamp metadata is stored in a taxonomy so a site can support multiple users and multiple planned WordCamps.

Features include:

- Upcoming WordCamp selection.
- A "Plan your day" schedule view with parallel tracks rendered as columns.
- A companion timeline that uses saved sessions and locally stored WordCamp metadata.
- Inline session adding between saved-session gaps.
- Session overlap warnings for competing tracks.
- Session notes stored with saved sessions.
- Markdown copy and download for exporting notes.
- Optional debug time controls for testing the live companion view.

## Installation

1. Upload the plugin files to `/wp-content/plugins/wordcamp-companion/`.
2. Activate WordCamp Companion in WordPress.
3. Open the WordCamp Companion app from the app menu or visit `/wordcamp-companion/`.
4. Choose an upcoming WordCamp, mark it as attending, and start saving sessions.

## Frequently Asked Questions

### Does this require a WordCamp.org account?

No. The plugin reads public schedule data from WordCamp sites and stores your selected sessions in your own WordPress site.

### Where are saved sessions stored?

Saved sessions are stored as `wcc_session` posts authored by the current WordPress user. The selected WordCamp is stored as a term in the `wcc_wordcamp` taxonomy.

### Does the companion page load the full remote schedule?

No. The companion page is hydrated from locally stored WordCamp metadata and saved sessions. Full schedule and gap candidate data are loaded only when needed.

### Can multiple users use this on the same site?

Yes. Saved sessions are authored by user, and each user has their own selected and attending WordCamps.

## External Services

This plugin uses public WordCamp REST APIs to provide event and schedule data:

- `https://central.wordcamp.org/wp-json/wp/v2/wordcamps` is used to list upcoming WordCamps.
- The selected WordCamp site's REST API is used to load schedule, speaker, track, and category data when planning a day.

These requests are made by your WordPress site and do not require API keys. The plugin sends the selected event URL and normal REST request parameters needed to fetch public schedule data.

The companion view can also display links to Google Maps and OpenStreetMap for venue addresses. Those map services are opened only when a user clicks the map links.

## Screenshots

1. Companion timeline with arrival, track changes, saved sessions, and day endings.
2. Plan your day schedule with parallel tracks as columns.
3. Session notes page with Markdown export.

## Changelog

### 1.0.1

- Add the WordCamp Companion app with upcoming WordCamp selection, schedule planning, companion timeline, saved sessions, notes, and export.

## Upgrade Notice

### 1.0.1

Initial submission-ready version.
