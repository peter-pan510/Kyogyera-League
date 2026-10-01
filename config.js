/* ============================================================================
 * KYOGYERA LEAGUE — SITE CONFIGURATION
 * ============================================================================
 * This is the only file you edit to connect the site to your Google Sheet.
 *
 * RECOMMENDED — fast live link (scores show within seconds):
 *   1. In Google Sheets: Share → General access → "Anyone with the link" → Viewer.
 *   2. Copy the sheet's ID from its address bar:
 *        https://docs.google.com/spreadsheets/d/THIS-LONG-PART-IS-THE-ID/edit
 *   3. Paste it into SHEET_ID below. That's it — every tab is found by its name.
 *
 * ALTERNATIVE — "Publish to web" links (Google can take ~5 minutes to update them):
 *   leave SHEET_ID empty and paste a published CSV link per tab in SHEET_CSV_URLS.
 *
 * With neither set, the site shows the starter files in /data.
 * Add ?demo to any page address to preview with made-up scores (/data/demo).
 * ========================================================================== */

window.KYOGYERA_CONFIG = {
  SHEET_ID: '1BefNkXvEjbRwUV1JAbQOr6sDZjf9t4gXedznfMpqJIA',

  // The public address of the website (used for the QR code on the poster and print sheet).
  SITE_URL: 'https://peter-pan510.github.io/Kyogyera-League/',

  // The sheet's Admin web service (tools/apps-script/Admin.gs), used by the Admin page to save changes.
  ADMIN_API_URL: 'https://script.google.com/macros/s/AKfycbxxGdC5zpTpPfMRBSdTwvB3XYf4jvk2nZgLHd4X9VrYLMbxozvq-MaXOBjzQ6JYUIbc/exec',

  // Only if a tab in your sheet has a different name from the one on the right:
  // TAB_NAMES: { groupFixtures: 'Group Fixtures' },
  TAB_NAMES: {},

  // Alternative to SHEET_ID: "File → Share → Publish to web → <tab> → CSV" links.
  SHEET_CSV_URLS: {
    teams: '',            // Teams: TeamName, Group, Badge, Short
    groupFixtures: '',    // GroupFixtures: MatchID, Group, TeamHome, TeamAway, ScoreHome, ScoreAway, Date, Status, MOTM, MOTMTeam
    knockoutFixtures: '', // KnockoutFixtures: MatchID, Round, Slot, TeamHome, TeamAway, ScoreHome, ScoreAway, Date, Status, Note, MOTM, MOTMTeam
    config: '',           // Config: Key, Value (LeagueName, Venue, Season, MatchDate, LastUpdated, About, MapQuery, Directions)
    players: '',          // Players: Team, Player, Number, Position
    goals: '',            // Goals: MatchID, Team, Scorer, Assist, Minute, Type
    cards: '',            // Cards: MatchID, Team, Player, Card, Minute
    matchStats: '',       // MatchStats: MatchID, Team, Possession, Shots, ShotsOnTarget, Corners, Fouls, Offsides, Saves
    goalsForm: '',        // GoalsForm / CardsForm / MOTMForm: Google Form answers (made by tools/apps-script/Code.gs)
    cardsForm: '',
    motmForm: '',
    announcements: '',    // Announcements: Time, Message, Level, Active
    info: '',             // Info: Section, Title, Body, Link
    photos: '',           // Photos: Url, Caption, MatchID, Team, Credit, Season
    sponsors: '',         // Sponsors: Name, Logo, Url, Tier
    ads: '',              // Ads: Message, Call, WhatsApp, Link, Active  (the strip that slides across every page)
  },

  // Scores, goals, cards and announcements are re-downloaded this often (seconds).
  REFRESH_SECONDS: 45,
  // Teams, players, info, photos and sponsors change rarely — re-downloaded this often.
  SLOW_REFRESH_SECONDS: 300,

  // Qualification rules (top N per group + best M third-placed teams).
  QUALIFY_TOP_PER_GROUP: 2,
  QUALIFY_BEST_THIRDS: 2,
};
