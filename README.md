# Kyogyera League website

A website for the **Kyogyera League**, the OBs & OGs football tournament played on **Saturday 20 March 2027** at Kitabuguma Playground, Bishop McAllister, Sheema.

- It has no server, no database and no build step. It is plain HTML, CSS and JavaScript, and it runs on GitHub Pages for free.
- All the data lives in **one Google Sheet**. Every page reads it and refreshes the live tabs every 45 seconds, so nobody needs to reload.
- Helpers at the pitch can log goals, cards and Man of the Match through **Google Forms**. The answers land in the same sheet.
- The site works out standings, qualification, the bracket, leaderboards, team stats and records by itself.
- It works well on phones: tables you can swipe, a bottom nav bar, "Add to home screen", and it keeps working on a weak signal.

## Pages

| Page | What's on it |
|---|---|
| **Home** `index.html` | Countdown, then on the day: live now, up next, a progress bar. Also: about the league, *Tap to view* cards, latest results, leaders, photos, sponsors |
| **Matches** `matches.html` | The day's running order (Group stage → QF → SF → Final), results and upcoming. Filter by group or team |
| **Match centre** `match.html?id=GA1` | Scoreboard, LIVE/HT/FT, goals, timeline, Man of the Match, stat bars, photos, a "Who will win?" pie chart |
| **Groups** `groups.html` | Group tables (live during matches) and the race for the best 3rd place |
| **Kyogyera Table** `table.html` | All 11 teams in one table, with form, PPG and how far each got |
| **Knockouts** `knockout.html` | Qualified teams and the bracket QF → SF → Final → Champion |
| **Stats** `stats.html` | Golden Boot, assists, Man of the Match, cards, a full player table, team rankings, tournament charts |
| **Teams** `teams.html`, `team.html?t=bataka` | Win-rate pie chart, form, squad list, top scorers, stats vs the league average, photos |
| **Gallery** `gallery.html` | Match-day photos. Tap to view full screen and swipe |
| **Info** `info.html` | Match-day updates, venue with map, rules, contacts (tap to call or WhatsApp), sponsors |
| **Data check** `check.html` | For the admin: a connection test for every tab, plus typos and mismatches in the sheet |

```
*.html            one file per page
styles.css        look & feel (navy / gold)
config.js         ← put your Google Sheet ID here
sw.js, manifest.webmanifest   offline support + "Add to home screen"
js/               data loading, calculations, layout, charts, one script per page
data/             starter data (one CSV per sheet tab)
data/demo/        made-up scores, goals, cards, photos… (add ?demo to any page address)
assets/           league badge, icons, link-preview image
assets/badges/    team badges    assets/photos/  photos    assets/sponsors/  sponsor logos
tools/apps-script/Code.gs    Google Sheets helper: tabs, dropdowns, Google Forms
tools/set-site-url.sh      sets the address used in WhatsApp link previews
```

---

## 1. Set up the Google Sheet (about 10 minutes, on a computer)

1. Create a new, empty Google Sheet, for example "Kyogyera League 2027".
2. Choose **Extensions → Apps Script**. Delete what's in `Code.gs` and paste in the whole of **`tools/apps-script/Code.gs`**. Click 💾 **Save** and close the tab.
3. Reload the sheet. A **Kyogyera** menu appears. Choose **Kyogyera → 1. Set up tabs & dropdowns**.
   - Google asks you to authorise the script: *Google hasn't verified this app → Advanced → Go to … (unsafe) → Allow*. It's your own script, and it only touches this sheet and the forms it creates.
   - It creates every tab, fills in the 11 teams and all 22 fixtures for 20 March 2027, and adds the dropdowns:
     - Status: Live / HT / FT
     - Card: Yellow / Red
     - Goal type: Penalty / OG
     - Teams and players, taken from the Teams and Players tabs
4. **Share → General access → Anyone with the link → Viewer.**
   - The public can *read* the sheet (the website has to).
   - Only people you add as *Editors* can change it.
5. Copy the sheet's **ID** from the address bar, the long part between `/d/` and `/edit`:
   `https://docs.google.com/spreadsheets/d/`**`1AbC…xyz`**`/edit`
6. Paste it into `config.js`: `SHEET_ID: '1AbC…xyz',`

That's the whole connection. This fast link shows edits on the site within about a minute. Open **Data check** on the site to confirm every tab says ✓.

> **Can't use Apps Script?** You can also build the tabs by hand: import each file from `data/` with *File → Import → Upload → Replace current sheet*. Keep row 1 (the column names) exactly as it is.
>
> **Alternative to SHEET_ID:** *File → Share → Publish to web*, one CSV link per tab, pasted into `SHEET_CSV_URLS` in `config.js`. It works, but Google can take ~5 minutes to update those links.

### The tabs

| Tab | Needed? | Columns (row 1) | What it's for |
|---|---|---|---|
| `Teams` | ✅ | TeamName, Group, Badge, Short | The 11 teams |
| `GroupFixtures` | ✅ | MatchID, Group, TeamHome, TeamAway, ScoreHome, ScoreAway, Date, Status, MOTM, MOTMTeam | 15 group matches |
| `KnockoutFixtures` | ✅ | MatchID, Round, Slot, TeamHome, TeamAway, ScoreHome, ScoreAway, Date, Status, Note, MOTM, MOTMTeam | QF1–4, SF1–2, Final |
| `Config` | ✅ | Key, Value | LeagueName, Venue, Season, **MatchDate**, LastUpdated, About, MapQuery, Directions |
| `Players` | recommended | Team, Player, Number, Position | Squads: dropdowns, squad lists, correct spelling |
| `Goals` | optional | MatchID, Team, Scorer, Assist, Minute, Type | Goals typed in by the admin |
| `Cards` | optional | MatchID, Team, Player, Card, Minute | Cards typed in by the admin |
| `MatchStats` | optional | MatchID, Team, Possession, Shots, ShotsOnTarget, Corners, Fouls, Offsides, Saves | Two rows per match. Any extra number column you add shows up too |
| `GoalsForm`, `CardsForm`, `MOTMForm` | optional | *(made by the forms)* | Answers from the Google Forms |
| `Announcements` | optional | Time, Message, Level, Active | Banner on every page, e.g. "QF1 delayed 15 min". Level `Urgent` = red |
| `Info` | optional | Section, Title, Body, Link | Rules, contacts (a Section called `Contacts` gets Call/WhatsApp buttons) |
| `Photos` | optional | Url, Caption, MatchID, Team, Credit, Season | Gallery. Comes with 30 photos from Season 1 (2026) |
| `Sponsors` | optional | Name, Logo, Url, Tier | Sponsor logos on Home, Info and every footer |
| `Ads` | optional | Message, Call, WhatsApp, Link, Active | Adverts that slide across the Home page |

Optional tabs can be left empty or deleted. That part of the site then just stays hidden.

### Updating the sheet's script later (no copy-paste)

The script inside the sheet is linked to `tools/apps-script/` with Google's **clasp** tool. When `Code.gs` changes:

```sh
cd tools/apps-script
npx -y @google/clasp push      # sends Code.gs into the sheet's script
```

Then reload the sheet. If the change adds tabs, columns or dropdowns, run **Kyogyera → 1. Set up tabs & dropdowns** once more. It only adds what's missing and never deletes data.

Setup on a new computer, once:

1. Turn on *Google Apps Script API* at https://script.google.com/home/usersettings.
2. Run `npx -y @google/clasp login` and sign in with the sheet owner's Google account.

`tools/apps-script/.clasp.json` holds the script's ID, which on its own gives no access. Your sign-in is stored in `~/.clasprc.json` in your home folder, outside the project.

---

## 2. Entering data: Sheet or Google Forms?

**The Google Sheet is the main place for data. Forms are an optional helper for goals, cards and Man of the Match.**

| | Google Sheet (admin) | Google Forms (helpers) |
|---|---|---|
| Use for | Scores, **Live/HT/FT**, fixtures, knockout teams, announcements, fixing mistakes | Logging goals, cards, Man of the Match |
| Who | 1–2 trusted people with **edit** access | Anyone with the form link. They can't change or break anything else |
| On a phone | Google Sheets app, with dropdowns | Big buttons: match → team → player → Submit |
| Mistakes | Edit the cell | The admin deletes the wrong row in the `GoalsForm`/`CardsForm`/`MOTMForm` tab |

Both end up in the same sheet, and the site reads both. A goal logged by a form and the same goal typed into the `Goals` tab would count **twice**, so for each kind of event decide who logs it.

A good split for match day:

- **Admin (Sheet):** fixtures, scores and Status (`Live` → `HT` → `FT`), then the knockout teams once the qualifiers are confirmed.
- **Helper 1 (Goals form):** every goal, with scorer, assist and minute.
- **Helper 2 (Cards form + MOTM form):** cards, and the Man of the Match after each final whistle.

### Creating the forms

1. Fill the **Players** tab with each squad (Team, Player, Number, Position). The forms use it for their player lists.
2. **Kyogyera → 2. Create Google Forms.** It builds three forms:
   - **Log a goal:** Match, Team (the team that *gets* the goal), Minute, Normal/Penalty/Own goal, then that team's player list for Scorer and Assist.
   - **Log a card:** Match, Team, Minute, Yellow/Red, Player.
   - **Man of the Match:** Match, Team, Player.

   Each list has a "Not in list — type the name below" option.
3. A box shows the three form links. Send them to your helpers, e.g. on WhatsApp, and ask them to open them in Chrome or the Google Forms page.
4. After you change the Players tab or type in knockout teams, run **Kyogyera → 3. Refresh form lists**. Or run **4. Auto-refresh** once, and the lists will update themselves every 10 minutes.

Answers appear on the site within about a minute.

---

## 3. Put the site on GitHub Pages

1. Put your Sheet ID into `config.js`, as in step 1.
2. Create a GitHub repository, e.g. `kyogyera-league`, and push this folder to it (it is already a git repository).
3. In the repository: **Settings → Pages → Source: Deploy from a branch → `main` / `(root)` → Save**.
4. After a minute the site is live at `https://<your-username>.github.io/kyogyera-league/`.
5. Set the address for **WhatsApp link previews** (the badge card that shows when someone shares the link):
   ```sh
   sh tools/set-site-url.sh https://<your-username>.github.io/kyogyera-league/
   ```
   Then commit and push again.

Preview with made-up data by adding `?demo` to any page address. To test on your computer, run `python3 -m http.server` in this folder and open http://localhost:8000. Opening the HTML file directly doesn't work.

**Add to home screen:** in Chrome, tap ⋮ → *Add to Home screen* (on iPhone: Share → *Add to Home Screen*). The site then opens like an app, with the badge as its icon. After the first visit it keeps working on a weak signal. If the connection drops it shows the last scores it saved and says "Offline".

---

## 4. Match day, 20 March 2027

All 22 matches are on one day, so the date lives in **one** cell: `MatchDate` in the Config tab. The **Date** column of the fixtures holds only kick-off times (`08:00`, `2:30pm`).

The starter schedule assumes **one pitch and 25-minute slots**. Edit the times if your plan is different:

| Time | Matches |
|---|---|
| 08:00 – 13:50 | 15 group matches, every 25 min (no team plays two in a row) |
| 13:50 – 14:30 | break while the qualifiers are confirmed |
| 14:30, 14:55, 15:20, 15:45 | Quarterfinals 1–4 |
| 16:20, 16:45 | Semifinals 1–2 |
| 17:30 | Final |

### Live scores

| Status | What the site shows |
|---|---|
| *(blank)* | Upcoming, or full time once both scores are filled in |
| `Live` | Red **LIVE** badge. The score (0-0 if blank) counts in the tables straight away |
| `HT` | Half time |
| `FT` | Full time: final, counts toward ✓ Confirmed qualification and the bracket |

At kick-off choose `Live`. Change ScoreHome/ScoreAway as goals go in. At the final whistle choose `FT`.

### Knockouts

- **Qualifiers:** the **Knockouts** page lists the 8 qualified teams. They show **✓ Confirmed** once all group matches are `FT`. Type them into `KnockoutFixtures`.
- **Bracket:** QF1 + QF2 → SF1, QF3 + QF4 → SF2, SF1 + SF2 → Final.
- **Level knockout match:** enter the score (e.g. 1 and 1). In **Note**, write the winner first: `AMARO FC won 4-3 on penalties`.

### Announcements

Add a row to the `Announcements` tab, e.g. `15:40 | QF4 delayed 5 minutes | Urgent | yes`. It appears as a banner at the top of every page. Visitors can close it. Set Active to `no` to take it down.

### Photos

- **From Google Drive:** upload to a Drive folder, share the photos as *Anyone with the link*, and paste each photo's link into the `Photos` tab (Url column). Add a Caption, and optionally the MatchID or Team, so the photo also appears on that match or team page.
- **In the repo:** put the file in `assets/photos/` and just type its file name in Url. If you also put a small copy (about 480 px) with the same name in `assets/photos/thumbs/`, the gallery loads faster.
- **Season:** leave it empty for this season's photos. Last year's photos say `Season 1 · 2026`, and the gallery shows them in their own section.
- Keep photos under ~1 MB each (phone photos "Large" size) so they load fast on mobile data.

### Adverts on the Home page

Every ~25 seconds a gold strip slides in above the bottom bar, and the advert's message passes across it:

- **Tapping it** opens WhatsApp (if a WhatsApp number is set), or calls the **Call** number, or opens the **Link**.
- **Touching it** pauses it.
- **×** hides adverts for the rest of that visit.

With several adverts, they take turns. Add a row to the `Ads` tab:

| Message | Call | WhatsApp | Link | Active |
|---|---|---|---|---|
| DO YOU WANT ANY DESIGNS, IN ALL FORMS AND STYLES? REACH OUT TO PETERSON — CALL 0781 464 585 OR WHATSAPP 0707 488 457 | 0781464585 | 0707488457 | | yes |

Set **Active** to `no` to stop an advert. Keep the phone columns formatted as *plain text* so Sheets doesn't drop the leading 0. The setup script does this for you.

### Sponsors and team badges

- **Sponsors:** put the logo in `assets/sponsors/` (or use a Drive/web link). Add a row to the `Sponsors` tab with Name, Logo and optionally the website Url.
- **Team badges:** a square PNG with a transparent background in `assets/badges/`, e.g. `bataka.png`. Type the file name in the `Badge` column of the Teams tab. Teams without a badge show a coloured circle with a 3-letter code.

### Tips

- Team names are matched loosely: `BATAKA FC 2000-2005`, `Bataka FC` and `bataka` are the same team.
- Pick player names from the dropdowns (or keep the spelling identical). That's how goals and awards add up.
- Open **Data check** (footer link) after each match. It flags a score that doesn't match the goals logged, names not in the squad, unknown teams and so on.
- Don't rename tabs or row-1 column names. If you must, map the new names in `TAB_NAMES` in `config.js`.

---

## How the site calculates things

- **Points:** win 3, draw 1, loss 0. `Live` matches count as they stand, as a live table.
- **Group ranking:** points, then goal difference, then goals scored, then a head-to-head mini-table among the tied teams. If they're still level after that, they're sorted alphabetically.
- **Best third-placed teams:** points, then goal difference, then goals scored, compared across the three groups. Group C has only 3 teams, so its teams play one match fewer.
- **Confirmed:** a group's top 2 are confirmed once all of that group's matches are full time. The best thirds are confirmed once all 15 group matches are.
- **Kyogyera Table:** all 11 teams by points, then goal difference, then goals scored. It counts group matches, with a toggle to include knockouts. PPG (points per game) is fairer to Group C.
- **Pie charts:** the win-rate pie charts use every finished match. "Who will win?" is a light-hearted guess from results so far.
- **Fair play:** yellow = 1 point, red = 3. Fewest points per game wins.
