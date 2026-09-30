/**
 * KYOGYERA LEAGUE — Google Sheets helper
 * =======================================
 * Paste this whole file into your score sheet: Extensions → Apps Script,
 * replace everything in Code.gs, click Save, then reload the sheet.
 * A new "Kyogyera" menu appears with:
 *
 *   1. Set up tabs & dropdowns — creates any missing tabs (with the starter
 *      fixtures for 20 March 2027), adds dropdown lists (teams, players,
 *      Live/HT/FT, Yellow/Red…) and formats date/minute/phone columns as plain text.
 *      Safe to run again; it never deletes your data.
 *   2. Create Google Forms — builds three forms for helpers at the pitch:
 *      "Log a goal", "Log a card", "Man of the Match". Answers land in the
 *      GoalsForm / CardsForm / MOTMForm tabs and show on the site automatically.
 *   3. Refresh form lists — updates the match and player lists in the forms
 *      (run after editing the Players tab or filling in knockout teams).
 *   4. Auto-refresh form lists — does step 3 every 10 minutes by itself.
 *   5. Refresh Season 1 photos — replaces the Season 1 rows of the Photos tab
 *      with the photo list that ships with the website (your own rows stay).
 *   6. Admin codes — creates the sign-in codes for the website's Admin page
 *      (admin / referee / editor), or makes new ones. See Admin.gs.
 *
 * The first time you run something, Google asks you to authorise the script
 * ("Google hasn't verified this app" → Advanced → Go to … → Allow). It only
 * touches this spreadsheet and the three forms it creates.
 */

const STARTER = {"Teams": [
    ["TeamName","Group","Badge","Short"],
    ["BATAKA FC 2000-2005","A","",""],
    ["ABOMUTIMA FC 2013-2018","A","",""],
    ["AKARERE FC 2015-2020","A","",""],
    ["AKAKOMIIRE FC 2018-2024","A","",""],
    ["KYANGABUKAMA FC 2009-2014","B","",""],
    ["AMARO FC 2014-2019","B","",""],
    ["ENSHERA FC 2016-2022","B","",""],
    ["ABASWAAMI FC 2019-2025","B","",""],
    ["ABABAAGI FC 2011-2016","C","",""],
    ["KAJWAMBARA FC 2012-2017","C","",""],
    ["SC MASIRI 2017-2023","C","",""]],
  "GroupFixtures": [
    ["MatchID","Group","TeamHome","TeamAway","ScoreHome","ScoreAway","Date","Status","MOTM","MOTMTeam"],
    ["GA1","A","BATAKA FC 2000-2005","ABOMUTIMA FC 2013-2018","","","08:00","","",""],
    ["GA2","A","AKARERE FC 2015-2020","AKAKOMIIRE FC 2018-2024","","","08:25","","",""],
    ["GB1","B","KYANGABUKAMA FC 2009-2014","AMARO FC 2014-2019","","","08:50","","",""],
    ["GB2","B","ENSHERA FC 2016-2022","ABASWAAMI FC 2019-2025","","","09:15","","",""],
    ["GC1","C","ABABAAGI FC 2011-2016","KAJWAMBARA FC 2012-2017","","","09:40","","",""],
    ["GA3","A","BATAKA FC 2000-2005","AKARERE FC 2015-2020","","","10:05","","",""],
    ["GA4","A","ABOMUTIMA FC 2013-2018","AKAKOMIIRE FC 2018-2024","","","10:30","","",""],
    ["GB3","B","KYANGABUKAMA FC 2009-2014","ENSHERA FC 2016-2022","","","10:55","","",""],
    ["GB4","B","AMARO FC 2014-2019","ABASWAAMI FC 2019-2025","","","11:20","","",""],
    ["GC2","C","KAJWAMBARA FC 2012-2017","SC MASIRI 2017-2023","","","11:45","","",""],
    ["GA5","A","AKAKOMIIRE FC 2018-2024","BATAKA FC 2000-2005","","","12:10","","",""],
    ["GA6","A","ABOMUTIMA FC 2013-2018","AKARERE FC 2015-2020","","","12:35","","",""],
    ["GB5","B","ABASWAAMI FC 2019-2025","KYANGABUKAMA FC 2009-2014","","","13:00","","",""],
    ["GB6","B","AMARO FC 2014-2019","ENSHERA FC 2016-2022","","","13:25","","",""],
    ["GC3","C","SC MASIRI 2017-2023","ABABAAGI FC 2011-2016","","","13:50","","",""]],
  "KnockoutFixtures": [
    ["MatchID","Round","Slot","TeamHome","TeamAway","ScoreHome","ScoreAway","Date","Status","Note","MOTM","MOTMTeam"],
    ["K1","QF","QF1","","","","","14:30","","","",""],
    ["K2","QF","QF2","","","","","14:55","","","",""],
    ["K3","QF","QF3","","","","","15:20","","","",""],
    ["K4","QF","QF4","","","","","15:45","","","",""],
    ["K5","SF","SF1","","","","","16:20","","","",""],
    ["K6","SF","SF2","","","","","16:45","","","",""],
    ["K7","Final","Final","","","","","17:30","","","",""]],
  "Config": [
    ["Key","Value"],
    ["LeagueName","Kyogyera League"],
    ["Venue","Kitabuguma Playground, Bishop McAllister, Sheema"],
    ["Season","2027 · Season 2"],
    ["MatchDate","2027-03-20"],
    ["LastUpdated","Fixtures published — match day is Saturday 20 March 2027"],
    ["About","The Kyogyera League brings old boys and old girls back home for the biggest reunion on the calendar. After a brilliant first season in 2026, Season 2 is here: eleven OB/OG teams, each built from a different set of school years, battle it out at Kitabuguma Playground for bragging rights and the Kyogyera trophy."],
    ["MapQuery","Bishop McAllister College Kyogyera, Sheema"],
    ["Directions",""],
    ["HalfMinutes","10"],
    ["RedCardBan","1"]],
  "Info": [
    ["Section","Title","Body","Link"],
    ["Rules","Match length","To be confirmed by the organising committee.",""],
    ["Rules","Who can play","Old boys and old girls of the school, playing for the team of their year group.",""],
    ["Rules","Points & ranking","Win 3, draw 1, loss 0. Group ties are broken by goal difference, goals scored, then head-to-head.",""],
    ["Rules","Knockouts","Top 2 in each group + the 2 best third-placed teams reach the quarterfinals. A level knockout match goes straight to penalties.",""],
    ["Rules","Cards","A red card means the player sits out the rest of that match.",""],
    ["Contacts","Tournament coordinator","Phone number to be added",""],
    ["Contacts","Fixtures & results desk","Phone number to be added",""]],
  "Photos": [
    ["Url","Caption","MatchID","Team","Credit","Season"],
    ["sn1-01.jpg","Warming up on the pitch","","","","Season 1 · 2026"],
    ["sn1-02.jpg","One big Kyogyera family","","","","Season 1 · 2026"],
    ["sn1-03.jpg","The eagle at school","","","","Season 1 · 2026"],
    ["sn1-04.jpg","Tents up at Kitabuguma","","","","Season 1 · 2026"],
    ["sn1-05.jpg","Team talk","","","","Season 1 · 2026"],
    ["sn1-06.jpg","Pure joy","","","","Season 1 · 2026"],
    ["sn1-07.jpg","Carried away!","","","","Season 1 · 2026"],
    ["sn1-08.jpg","Something on the grill","","","","Season 1 · 2026"],
    ["sn1-09.jpg","Friends in jerseys","","","","Season 1 · 2026"],
    ["sn1-10.jpg","Squad goals","","","","Season 1 · 2026"],
    ["sn1-11.jpg","Handshakes all round","","","","Season 1 · 2026"],
    ["sn1-12.jpg","All smiles","","","","Season 1 · 2026"],
    ["sn1-13.jpg","Reunited","","","","Season 1 · 2026"],
    ["sn1-14.jpg","Three friends","","","","Season 1 · 2026"],
    ["sn1-15.jpg","Numbers on the back","","","","Season 1 · 2026"],
    ["sn1-16.jpg","Coach's orders","","","","Season 1 · 2026"],
    ["sn1-17.jpg","The crowd gathers","","","","Season 1 · 2026"],
    ["sn1-18.jpg","Lined up on the pitch","","","","Season 1 · 2026"],
    ["sn1-19.jpg","Supporters in blue","","","","Season 1 · 2026"],
    ["sn1-20.jpg","Back at school","","","","Season 1 · 2026"],
    ["sn1-21.jpg","Celebrating in the trees","","","","Season 1 · 2026"],
    ["sn1-22.jpg","A warm welcome","","","","Season 1 · 2026"],
    ["sn1-23.jpg","Big smiles","","","","Season 1 · 2026"],
    ["sn1-24.jpg","Friends reunited","","","","Season 1 · 2026"],
    ["sn1-25.jpg","Striking a pose","","","","Season 1 · 2026"],
    ["sn1-26.jpg","Walking in together","","","","Season 1 · 2026"],
    ["sn1-27.jpg","Arriving at the ground","","","","Season 1 · 2026"],
    ["sn1-28.jpg","Matching in black","","","","Season 1 · 2026"],
    ["sn1-29.jpg","Too cool","","","","Season 1 · 2026"],
    ["sn1-30.jpg","Shades on","","","","Season 1 · 2026"],
    ["sn1-31.jpg","Game face","","","","Season 1 · 2026"],
    ["sn1-32.jpg","VIP","","","","Season 1 · 2026"]],
  "Ads": [
    ["Message","Call","WhatsApp","Link","Active"],
    ["DO YOU WANT ANY DESIGNS, IN ALL FORMS AND STYLES? REACH OUT TO PETERSON — CALL 0781 464 585 OR WHATSAPP 0707 488 457","0781464585","0707488457","","yes"]],
  "History": [
    ["Season","Year","Champion","RunnerUp","TopScorer","MOTMKing","Notes"],
    ["Season 1","2026","","","","","The first Kyogyera League. Add the champions and award winners here."]]};

const TAB_HEADERS = {
  Teams: ['TeamName', 'Group', 'Badge', 'Short'],
  GroupFixtures: ['MatchID', 'Group', 'TeamHome', 'TeamAway', 'ScoreHome', 'ScoreAway', 'Date', 'Status', 'MOTM', 'MOTMTeam', 'KickoffAt', 'SecondHalfAt'],
  KnockoutFixtures: ['MatchID', 'Round', 'Slot', 'TeamHome', 'TeamAway', 'ScoreHome', 'ScoreAway', 'Date', 'Status', 'Note', 'MOTM', 'MOTMTeam', 'KickoffAt', 'SecondHalfAt'],
  Config: ['Key', 'Value'],
  Players: ['Team', 'Player', 'Number', 'Position', 'Photo'],
  Goals: ['MatchID', 'Team', 'Scorer', 'Assist', 'Minute', 'Type'],
  Cards: ['MatchID', 'Team', 'Player', 'Card', 'Minute'],
  MatchStats: ['MatchID', 'Team', 'Possession', 'Shots', 'ShotsOnTarget', 'Corners', 'Fouls', 'Offsides', 'Saves'],
  Announcements: ['Time', 'Message', 'Level', 'Active'],
  Info: ['Section', 'Title', 'Body', 'Link'],
  Photos: ['Url', 'Caption', 'MatchID', 'Team', 'Credit', 'Season'],
  Sponsors: ['Name', 'Logo', 'Url', 'Tier'],
  Ads: ['Message', 'Call', 'WhatsApp', 'Link', 'Active'],
  History: ['Season', 'Year', 'Champion', 'RunnerUp', 'TopScorer', 'MOTMKing', 'Notes'],
};

// Columns kept as plain text so Google's live CSV link never drops them.
const TEXT_COLUMNS = {
  GroupFixtures: ['MatchID', 'Date', 'KickoffAt', 'SecondHalfAt'], KnockoutFixtures: ['MatchID', 'Date', 'KickoffAt', 'SecondHalfAt'], Config: ['Value'],
  Goals: ['MatchID', 'Minute'], Cards: ['MatchID', 'Minute'], MatchStats: ['MatchID'],
  Announcements: ['Time'], Players: ['Number'], Photos: ['MatchID'],
  Ads: ['Call', 'WhatsApp'], // keeps the leading 0 of phone numbers
};

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Kyogyera')
    .addItem('1. Set up tabs & dropdowns', 'setupSheet')
    .addItem('2. Create Google Forms', 'createForms')
    .addItem('3. Refresh form lists', 'refreshForms')
    .addItem('4. Auto-refresh form lists (every 10 min)', 'installAutoRefresh')
    .addSeparator()
    .addItem('5. Refresh Season 1 photos', 'refreshSeason1Photos')
    .addSeparator()
    .addItem('6. Admin codes (website sign-in)', 'showAdminCodes')
    .addToUi();
}

/* ------------------------------------------------------------------ setup */

function setupSheet() {
  const ss = SpreadsheetApp.getActive();
  const made = [];
  Object.keys(TAB_HEADERS).forEach((name) => {
    let sh = ss.getSheetByName(name);
    if (!sh) {
      sh = ss.insertSheet(name);
      made.push(name);
      const rows = STARTER[name];
      const head = rows ? rows[0] : TAB_HEADERS[name];
      textFormat(sh, name, head, Math.max(200, rows ? rows.length + 50 : 200));
      sh.getRange(1, 1, 1, head.length).setValues([head]);
      if (rows && rows.length > 1) sh.getRange(2, 1, rows.length - 1, head.length).setValues(rows.slice(1));
    } else {
      // Existing tab: add any missing columns at the end, keep plain-text columns as text.
      const width = Math.max(sh.getLastColumn(), 1);
      const head = sh.getRange(1, 1, 1, width).getValues()[0].map(String);
      const missing = TAB_HEADERS[name].filter((h) => head.indexOf(h) < 0);
      if (missing.length) sh.getRange(1, head.filter(String).length + 1, 1, missing.length).setValues([missing]);
      const full = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
      textFormat(sh, name, full, Math.max(sh.getMaxRows(), 200), true);
    }
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, sh.getLastColumn()).setFontWeight('bold').setBackground('#0b1a4a').setFontColor('#f2c14e');
  });
  // Put the tabs in a sensible order.
  Object.keys(TAB_HEADERS).forEach((name, i) => { ss.setActiveSheet(ss.getSheetByName(name)); ss.moveActiveSheet(i + 1); });
  ss.setActiveSheet(ss.getSheetByName('GroupFixtures'));
  addDropdowns();
  SpreadsheetApp.getUi().alert('Kyogyera setup done.\n\n' + (made.length ? 'New tabs: ' + made.join(', ') : 'All tabs already existed — dropdowns and formats refreshed.') +
    '\n\nNext: share the sheet as "Anyone with the link: Viewer" and put its ID in config.js (see README).');
}

function textFormat(sh, name, head, rows, convert) {
  (TEXT_COLUMNS[name] || []).forEach((col) => {
    const c = head.indexOf(col) + 1;
    if (!c) return;
    const range = sh.getRange(2, c, rows - 1, 1);
    const shown = convert ? range.getDisplayValues() : null;
    range.setNumberFormat('@');
    if (shown) range.setValues(shown);
  });
}

function colRange(sh, header) {
  const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  const c = head.indexOf(header) + 1;
  return c ? sh.getRange(2, c, sh.getMaxRows() - 1, 1) : null;
}

function listRule(values) {
  return SpreadsheetApp.newDataValidation().requireValueInList(values, true).setAllowInvalid(false).build();
}
function rangeRule(range, strict) {
  return SpreadsheetApp.newDataValidation().requireValueInRange(range, true).setAllowInvalid(!strict).build();
}

function addDropdowns() {
  const ss = SpreadsheetApp.getActive();
  const teamsRange = ss.getSheetByName('Teams').getRange('A2:A');
  const playersRange = ss.getSheetByName('Players').getRange('B2:B');
  const ids = matchList().map((m) => m.id);
  const set = (tab, header, rule) => {
    const sh = ss.getSheetByName(tab);
    const r = sh && colRange(sh, header);
    if (r) r.setDataValidation(rule);
  };
  ['GroupFixtures', 'KnockoutFixtures'].forEach((tab) => {
    set(tab, 'Status', listRule(['Live', 'HT', 'FT']));
    set(tab, 'MOTMTeam', rangeRule(teamsRange, false));
    set(tab, 'MOTM', rangeRule(playersRange, false));
  });
  set('KnockoutFixtures', 'TeamHome', rangeRule(teamsRange, false));
  set('KnockoutFixtures', 'TeamAway', rangeRule(teamsRange, false));
  ['Goals', 'Cards', 'MatchStats'].forEach((tab) => {
    set(tab, 'MatchID', listRule(ids));
    set(tab, 'Team', rangeRule(teamsRange, false));
  });
  set('Goals', 'Scorer', rangeRule(playersRange, false));
  set('Goals', 'Assist', rangeRule(playersRange, false));
  set('Goals', 'Type', listRule(['Penalty', 'OG']));
  set('Cards', 'Player', rangeRule(playersRange, false));
  set('Cards', 'Card', listRule(['Yellow', 'Red']));
  set('Players', 'Team', rangeRule(teamsRange, false));
  set('Announcements', 'Level', listRule(['Urgent']));
  set('Announcements', 'Active', listRule(['yes', 'no']));
  set('Ads', 'Active', listRule(['yes', 'no']));
}

/* ------------------------------------------------------------------ data */

function rowsOf(tab) {
  const sh = SpreadsheetApp.getActive().getSheetByName(tab);
  if (!sh || sh.getLastRow() < 2) return [];
  const values = sh.getDataRange().getDisplayValues();
  const head = values[0].map((h) => String(h).toLowerCase().replace(/[^a-z0-9]/g, ''));
  return values.slice(1).filter((r) => r.some(String)).map((r) => {
    const o = {};
    head.forEach((h, i) => { if (h && !o[h]) o[h] = String(r[i]).trim(); });
    return o;
  });
}

const shortName = (n) => String(n || '').replace(/\s*\d{4}\s*[-–]\s*\d{2,4}\s*$/, '').trim();

function teamList() {
  return rowsOf('Teams').filter((r) => r.teamname).map((r) => shortName(r.teamname));
}

function matchList() {
  const out = [];
  rowsOf('GroupFixtures').forEach((r) => {
    if (r.matchid) out.push({ id: r.matchid, label: `${r.matchid} · ${shortName(r.teamhome)} v ${shortName(r.teamaway)}` });
  });
  rowsOf('KnockoutFixtures').forEach((r) => {
    if (!r.matchid) return;
    const teams = r.teamhome || r.teamaway ? `${shortName(r.teamhome) || 'TBD'} v ${shortName(r.teamaway) || 'TBD'}` : (r.slot || r.round || 'Knockout');
    out.push({ id: r.matchid, label: `${r.matchid} · ${teams}` });
  });
  return out;
}

function playersOf(team) {
  const key = shortName(team).toUpperCase();
  return rowsOf('Players').filter((r) => shortName(r.team).toUpperCase() === key && r.player).map((r) => r.player);
}

const NOT_IN_LIST = 'Not in list — type the name below';

/* ----------------------------------------------------------------- forms */

const FORMS = {
  goals: { title: 'Kyogyera League — Log a goal', tab: 'GoalsForm', people: ['Scorer', 'Assist'] },
  cards: { title: 'Kyogyera League — Log a card', tab: 'CardsForm', people: ['Player'] },
  motm: { title: 'Kyogyera League — Man of the Match', tab: 'MOTMForm', people: ['Player'] },
};

function createForms() {
  const ss = SpreadsheetApp.getActive();
  const props = PropertiesService.getDocumentProperties();
  const teams = teamList();
  if (!teams.length) { SpreadsheetApp.getUi().alert('Fill in the Teams tab first (run "1. Set up tabs & dropdowns").'); return; }
  const links = [];
  Object.keys(FORMS).forEach((kind) => {
    const spec = FORMS[kind];
    const existing = props.getProperty('form_' + kind);
    if (existing) {
      try { const f = FormApp.openById(existing); updateForm(f); links.push(spec.title + ':\n' + f.getPublishedUrl()); return; } catch (e) { /* deleted — make a new one */ }
    }
    const form = FormApp.create(spec.title);
    form.setDescription('For helpers at Kitabuguma Playground. Your answer appears on the Kyogyera League website within a minute.')
      .setCollectEmail(false).setShowLinkToRespondAgain(true).setConfirmationMessage('Thanks! Logged. Tap "Submit another response" for the next one.');

    form.addListItem().setTitle('Match').setChoiceValues(matchList().map((m) => m.label)).setRequired(true);
    const teamItem = form.addMultipleChoiceItem().setTitle('Team')
      .setHelpText(kind === 'goals' ? 'The team that GETS the goal (for an own goal too).' : '').setRequired(true);
    if (kind !== 'motm') form.addTextItem().setTitle('Minute').setHelpText('e.g. 34 or 45+2');
    if (kind === 'goals') {
      form.addMultipleChoiceItem().setTitle('Type').setChoiceValues(['Normal', 'Penalty', 'Own goal']).setRequired(true)
        .setHelpText('Own goal: on the next page choose "Not in list" and type the name of the player who scored it.');
    }
    if (kind === 'cards') form.addMultipleChoiceItem().setTitle('Card').setChoiceValues(['Yellow', 'Red']).setRequired(true);

    const pages = teams.map((t) => {
      const page = form.addPageBreakItem().setTitle(t);
      spec.people.forEach((who) => {
        form.addListItem().setTitle(who).setChoiceValues(peopleChoices(t, who)).setRequired(who !== 'Assist');
        form.addTextItem().setTitle(who + ' (typed)').setHelpText('Only if the name is not in the list above.');
      });
      return page;
    });
    // Each team page ends the form (instead of running on into the next team's page).
    pages.forEach((p, i) => { if (i > 0) p.setGoToPage(FormApp.PageNavigationType.SUBMIT); });
    teamItem.setChoices(teams.map((t, i) => teamItem.createChoice(t, pages[i])));

    form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
    SpreadsheetApp.flush();
    Utilities.sleep(1500);
    const sheet = ss.getSheets().find((sh) => {
      const u = sh.getFormUrl();
      try { return u && FormApp.openByUrl(u).getId() === form.getId(); } catch (e) { return false; }
    });
    if (sheet) {
      const old = ss.getSheetByName(spec.tab);
      if (old && old.getSheetId() !== sheet.getSheetId()) old.setName(spec.tab + ' (old)');
      sheet.setName(spec.tab);
    }
    props.setProperty('form_' + kind, form.getId());
    links.push(spec.title + ':\n' + form.getPublishedUrl());
  });
  SpreadsheetApp.getUi().alert('Forms ready. Share these links with your helpers (e.g. on WhatsApp):\n\n' + links.join('\n\n'));
}

function peopleChoices(team, who) {
  const list = playersOf(team);
  return (who === 'Assist' ? ['No assist'] : []).concat(list, [NOT_IN_LIST]);
}

function updateForm(form) {
  let team = null;
  form.getItems().forEach((it) => {
    const type = it.getType();
    if (type === FormApp.ItemType.PAGE_BREAK) { team = it.getTitle(); return; }
    if (type !== FormApp.ItemType.LIST) return;
    const title = it.getTitle();
    if (title === 'Match') it.asListItem().setChoiceValues(matchList().map((m) => m.label));
    else if (team && ['Scorer', 'Assist', 'Player'].indexOf(title) >= 0) it.asListItem().setChoiceValues(peopleChoices(team, title));
  });
}

function refreshForms(quiet) {
  const props = PropertiesService.getDocumentProperties();
  let n = 0;
  Object.keys(FORMS).forEach((kind) => {
    const id = props.getProperty('form_' + kind);
    if (!id) return;
    try { updateForm(FormApp.openById(id)); n++; } catch (e) { /* form deleted */ }
  });
  if (quiet !== true) SpreadsheetApp.getUi().alert(n ? `Updated ${n} form(s) with the latest matches and players.` : 'No forms yet — run "2. Create Google Forms" first.');
}

function autoRefresh() { refreshForms(true); }

function installAutoRefresh() {
  ScriptApp.getProjectTriggers().filter((t) => t.getHandlerFunction() === 'autoRefresh').forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('autoRefresh').timeBased().everyMinutes(10).create();
  SpreadsheetApp.getUi().alert('Done — the form lists now refresh themselves every 10 minutes.');
}

/* ------------------------------------------------------ season 1 photos */

// Replaces every Photos row whose Season starts with "Season 1" with the
// Season 1 photo list that ships with the website. Other rows are kept.
function refreshSeason1Photos() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName('Photos');
  const starter = STARTER.Photos;
  if (!sh || !starter) { SpreadsheetApp.getUi().alert('No Photos tab — run "1. Set up tabs & dropdowns" first.'); return; }
  const values = sh.getDataRange().getValues();
  const head = values[0].map(String);
  const seasonCol = head.indexOf('Season');
  if (seasonCol < 0) { SpreadsheetApp.getUi().alert('The Photos tab has no Season column — run "1. Set up tabs & dropdowns" first.'); return; }
  const keep = values.slice(1).filter((r) => r.some(String) && !/^season 1\b/i.test(String(r[seasonCol])));
  const fresh = starter.slice(1).map((r) => head.map((h) => { const i = starter[0].indexOf(h); return i >= 0 ? r[i] : ''; }));
  const rows = fresh.concat(keep);
  sh.getRange(2, 1, Math.max(sh.getMaxRows() - 1, 1), head.length).clearContent();
  if (rows.length) sh.getRange(2, 1, rows.length, head.length).setValues(rows);
  SpreadsheetApp.getUi().alert('Photos updated: ' + fresh.length + ' Season 1 photos' + (keep.length ? ', plus your ' + keep.length + ' other photo(s) kept.' : '.'));
}
