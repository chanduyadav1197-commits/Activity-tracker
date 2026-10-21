# Activity Tracker

Berger Activity Tracker, a single-page web app (`index.html`).

Live link: <https://chanduyadav1197-commits.github.io/activity-tracker/>

## Team sharing

With team sharing set up, activities are saved to a Google Sheet and photos, videos and files
go to a Google Drive folder, so everyone with the link and the team code sees the same data.
See [SETUP.md](SETUP.md). The backend script is in [`google-apps-script/Code.gs`](google-apps-script/Code.gs).

Until it is set up (`SHEET_API` empty in `index.html`), entries are saved only in each
visitor's own browser. Use **Export CSV** or the Excel/PDF reports to share data.
