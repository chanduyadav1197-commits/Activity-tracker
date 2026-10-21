# Team sharing setup (Google Sheets + Google Drive)

One-time setup, about 10 minutes. After this, everyone using the tracker link sees the
same activities, photos and videos.

- **Activities** are saved to a Google Sheet (tabs: *Activities* and *Applicators*).
- **Photos, videos and files** are saved to a Google Drive folder called
  *Berger Activity Tracker - Media*, with one sub-folder per activity.
- Everything is stored in **your** Google account (free accounts have 15 GB).

## 1. Create the Google Sheet

1. Go to <https://sheets.new> and name the sheet **Berger Activity Tracker**.
2. Click **Extensions → Apps Script**.

## 2. Add the script

1. In the Apps Script editor, delete everything in `Code.gs`.
2. Copy all of [`google-apps-script/Code.gs`](google-apps-script/Code.gs) from this repo and paste it in.
3. Near the top, change `CHANGE-ME` to your own team code, for example
   `const TEAM_CODE = "berger-guj-2026";`
   Share this code only with your team. The tracker asks for it once on each phone.
4. Click 💾 **Save**.

## 3. Run setup once

1. In the toolbar, choose **setup** in the function list and click ▶ **Run**.
2. Google asks for permission. Click **Review permissions**, choose your account, then
   **Advanced → Go to (project name) (unsafe) → Allow**. This warning appears because the
   script is your own and not reviewed by Google.
3. Your sheet now has the *Activities* and *Applicators* tabs, and the Drive folder is created.

## 4. Publish it as a web app

1. Click **Deploy → New deployment**.
2. Click ⚙️ next to *Select type* and choose **Web app**.
3. Set **Execute as: Me** and **Who has access: Anyone**.
4. Click **Deploy** and copy the **Web app URL** (it ends in `/exec`).

## 5. Connect the tracker

Put the URL in `index.html`:

```js
const SHEET_API="https://script.google.com/macros/s/XXXXXXXX/exec";
```

Commit, and GitHub Pages updates the live link in 1–2 minutes. Open the tracker, enter the
team code, and the Reports card shows **● Team sync on**.

## Letting the team open the Sheet and Drive folder

Teammates don't need this to use the tracker. To let managers browse the data directly,
click **Share** on the Google Sheet and on the Drive folder, and add them as **Viewer**.

## Good to know

- Each photo, video or file can be up to **30 MB**. Photos are shrunk automatically before upload.
- Uploaded media is set to *anyone with the link can view*, so the tracker can show it to the
  team. The links are long and random, and they only appear to people who have the team code.
- Activities submitted without internet are kept on the phone and shared automatically
  when it's back online.
- To change the script later, edit it, then use **Deploy → Manage deployments → ✏️ Edit →
  Version: New version → Deploy**. The URL stays the same.
- To change the team code, edit `TEAM_CODE` and deploy a new version. Everyone is asked for
  the new code the next time they open the tracker.
