# WordCamp Companion

**Contributors:** akirk
**Tags:** wordcamp, events, schedule, conference, notes
**Requires at least:** 5.0
**Tested up to:** 7.0
**Requires PHP:** 7.4
**License:** GPLv2 or later
**License URI:** http://www.gnu.org/licenses/gpl-2.0.html
**Stable tag:** 1.0.1

Plan the WordCamp you are attending, save sessions, follow a minimal live companion timeline, and export your session notes. You can try it out and use it in [my.wordpress.net](https://my.wordpress.net/?myapps-i=wordcamp-companion) at [https://my.wordpress.net/?myapps-i=wordcamp-companion](https://my.wordpress.net/?myapps-i=wordcamp-companion) .

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

### Where are saved sessions stored?

Saved sessions are stored as `wcc_session` posts authored by the current WordPress user. The selected WordCamp is stored as a term in the `wcc_wordcamp` taxonomy.

### Does the companion page load the full remote schedule?

No. The companion page is hydrated from locally stored WordCamp metadata and saved sessions. Full schedule and gap candidate data are loaded only when needed.

### Can multiple users use this on the same site?

Yes. Saved sessions are authored by user, and each user has their own selected and attending WordCamps.

### What happens when the plugin is uninstalled?

Uninstalling deletes saved sessions, WordCamp terms and metadata, plugin user settings, and cached WordCamp API responses. Deactivating the plugin does not delete data.

## External Services

This plugin uses public WordCamp REST APIs to provide event and schedule data:

- `https://central.wordcamp.org/wp-json/wp/v2/wordcamps` is used to list upcoming WordCamps.
- The selected WordCamp site's REST API is used to load schedule, speaker, track, and category data when planning a day.

These requests are made by your WordPress site and do not require API keys. The plugin sends the selected event URL and normal REST request parameters needed to fetch public schedule data.

The companion view can also display links to Google Maps and OpenStreetMap for venue addresses. Those map services are opened only when a user clicks the map links.

## Screenshots

<img width="982" height="1562" alt="wordcamp-companion-timeline" src="https://github.com/user-attachments/assets/40e8e549-725e-4746-959a-c549f1d7c141" />

1. Companion timeline with arrival, track changes, saved sessions, and day endings.

<img width="980" height="1566" alt="wordcamp-companion-add-session" src="https://github.com/user-attachments/assets/3839a83c-3663-4cf8-9dfc-2100b53942a0" />
2. Add sessions to your day

<img width="980" height="1556" alt="wordcamp-companion-add-notes" src="https://github.com/user-attachments/assets/ff5d488c-ebba-4cba-8288-2899900c3c63" />
3. Take notes

https://github.com/user-attachments/assets/9a955b34-9d07-482a-a889-a43c07e64767

4. Timeline updates throughout the day.

## Changelog

### 1.0.1

- Add the WordCamp Companion app with upcoming WordCamp selection, schedule planning, companion timeline, saved sessions, notes, and export.

## Upgrade Notice

### 1.0.1

Initial submission-ready version.
