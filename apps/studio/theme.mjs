// The console's one stylesheet. It lives apart from view.mjs because the shell
// is now an application frame — rail, command bar, workbench — and a page of
// CSS inlined in the middle of the markup made the frame's own structure
// unreadable. Nothing here is page-specific: a view earns a class, never an
// inline rule set.

export const STYLES = `
:root{color-scheme:dark;
--bg:#0a0908;--bg2:#100e0c;--panel:#18140f;--panel2:#1f1a14;--panel3:#271f17;
--line:#2a251d;--line2:#3a3226;--line3:#4d4331;
--fg:#f3ede2;--dim:#a99d89;--faint:#6e6250;
--accent:#e2793d;--accent2:#f4a65e;--accentdim:rgba(226,121,61,.16);
--violetaccent:#b98af0;--tealaccent:#5cc9b8;
--bad:#e5657a;--good:#5fce93;--warn:#e3b566;--info:#79d0e0;--violet:#c792ea;
--tone-conciliatory:#5fce93;--tone-firm:#7aa2f7;--tone-principled:#c792ea;--tone-evasive:#8b95a7;--tone-coercive:#e5657a;
--serif:Georgia,'Times New Roman',serif;--mono:ui-monospace,SFMono-Regular,Menlo,monospace;
--rail:216px}
*{box-sizing:border-box}
html,body{height:100%}
body{margin:0;background:
  radial-gradient(1100px 620px at 14% -8%,rgba(226,121,61,.10),transparent 60%),
  radial-gradient(900px 700px at 100% 0%,rgba(185,138,240,.07),transparent 55%),
  var(--bg);
  color:var(--fg);font:14px/1.6 ui-sans-serif,-apple-system,Segoe UI,sans-serif;-webkit-font-smoothing:antialiased}
a{color:var(--accent2)}

/* ---- frame ------------------------------------------------------------- */
.frame{display:flex;min-height:100vh}
.rail{width:var(--rail);flex:0 0 var(--rail);border-right:1px solid var(--line);background:var(--bg2);
  position:sticky;top:0;height:100vh;overflow-y:auto;padding:16px 0 24px;display:flex;flex-direction:column;gap:20px}
.brand{display:flex;align-items:center;gap:10px;padding:0 18px 2px;text-decoration:none;color:var(--fg)}
.brand .mark{width:26px;height:26px;border-radius:8px;display:grid;place-items:center;
  font-size:12px;font-weight:700;letter-spacing:.5px;color:#1a0f06;
  background:linear-gradient(135deg,var(--accent),var(--accent2));box-shadow:0 2px 10px rgba(226,121,61,.35)}
.brand b{font-size:14px;letter-spacing:.5px;font-weight:650}
.brand .sub{display:block;color:var(--faint);font-size:10px;letter-spacing:1.4px;text-transform:uppercase;line-height:1.2}
.railgroup{display:flex;flex-direction:column;gap:1px}
.railgroup .glabel{color:var(--faint);font-size:10px;text-transform:uppercase;letter-spacing:1.3px;padding:0 18px 5px}
.rail a.navlink{display:flex;align-items:center;gap:9px;color:var(--dim);text-decoration:none;padding:6px 18px;font-size:13px;
  border-left:2px solid transparent;border-radius:0 8px 8px 0;margin-right:8px}
.rail a.navlink:hover{color:var(--fg);background:var(--panel)}
.rail a.navlink.on{color:var(--accent2);background:var(--accentdim);border-left-color:var(--accent)}
.rail a.navlink .count{margin-left:auto;font-size:10.5px;color:var(--faint);font-variant-numeric:tabular-nums}
.rail a.navlink.on .count{color:var(--accent2)}
.railfoot{margin-top:auto;padding:0 18px;color:var(--faint);font-size:11px;line-height:1.5}
.railwho{display:flex;flex-direction:column;gap:2px;padding:9px 0;margin-bottom:8px;border-top:1px solid var(--line);
  padding-top:10px}
.railwho b{color:var(--dim);font-size:11.5px;font-weight:600;overflow:hidden;text-overflow:ellipsis}
.railwho form{margin:0}
button.linky{background:none;border:0;padding:0;color:var(--faint);font-size:11px;cursor:pointer;text-decoration:underline}
button.linky:hover{color:var(--accent)}

.workbench{flex:1;min-width:0;display:flex;flex-direction:column;position:relative}
.workbench::before{content:"";position:sticky;top:0;display:block;height:3px;z-index:7;
  background:linear-gradient(90deg,var(--accent),var(--violetaccent),var(--tealaccent))}
.commandbar{position:sticky;top:3px;z-index:6;display:flex;align-items:center;gap:14px;padding:10px 26px;
  border-bottom:1px solid var(--line);background:rgba(10,9,8,.86);backdrop-filter:blur(8px)}
.commandbar .crumb{color:var(--dim);font-size:12.5px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.commandbar .crumb a{color:var(--dim);text-decoration:none}
.commandbar .crumb a:hover{color:var(--accent2)}
.commandbar form{display:flex;gap:6px;align-items:center}
.searchbox{position:relative;margin-left:auto}
.searchbox input{width:280px;padding-left:30px;border-radius:999px}
.searchbox .glyph{position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--faint);font-size:12px;pointer-events:none}
.searchbox kbd{position:absolute;right:8px;top:50%;transform:translateY(-50%);color:var(--faint);font-size:10px;
  border:1px solid var(--line2);border-radius:4px;padding:0 4px;pointer-events:none}
main{padding:24px 26px 60px;max-width:1420px;width:100%}
main.narrow{max-width:1200px}

/* ---- type and headings ------------------------------------------------- */
h2{font-size:15px;margin:32px 0 12px;letter-spacing:.2px}h2:first-child{margin-top:0}
.pagehead{display:flex;align-items:baseline;gap:14px;flex-wrap:wrap;margin-bottom:6px}
.pagehead h1{font-size:21px;margin:0;font-weight:650;letter-spacing:-.2px}
.crumb{color:var(--dim);font-size:13px}.crumb a{color:var(--dim);text-decoration:none}.crumb a:hover{color:var(--accent)}
.k{color:var(--dim);font-size:12px}
.lede{color:var(--dim);font-size:13px;max-width:74ch;margin:2px 0 14px}
code{color:var(--accent);font-size:12px;font-family:var(--mono)}
.sectionhead{display:flex;align-items:baseline;gap:10px;margin:32px 0 10px}
.sectionhead h2{margin:0}
.sectionhead .k{margin-left:auto}

/* ---- surfaces ---------------------------------------------------------- */
.grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(250px,1fr))}
.card{background:var(--panel);border:1px solid var(--line);border-radius:13px;padding:14px 16px}
.card h3{margin:0 0 6px;font-size:14px}
.card.good{border-color:rgba(95,206,147,.4)}
.card.bad{border-color:rgba(229,101,122,.45)}
.card.warn{border-color:rgba(227,181,102,.4)}
.tiles{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin:14px 0}
.tile{background:var(--panel);border:1px solid var(--line);border-radius:13px;padding:12px 14px;transition:box-shadow .15s,border-color .15s}
.tile .stat-icon{width:26px;height:26px;border-radius:7px;display:grid;place-items:center;background:var(--panel2);color:var(--dim);margin-bottom:8px}
.tile .stat-icon .icon{width:14px;height:14px}
.tile .v{font-size:22px;font-weight:650;font-variant-numeric:tabular-nums;line-height:1.25}
.tile .l{color:var(--dim);font-size:11px;text-transform:uppercase;letter-spacing:.8px;margin-top:2px}
.tile .note{color:var(--faint);font-size:11px;margin-top:5px}
a.tile,a .tile{text-decoration:none;color:inherit;display:block}
a.tile:hover,a:hover .tile{border-color:var(--line3);box-shadow:0 4px 16px rgba(0,0,0,.25)}
.card{transition:box-shadow .15s,border-color .15s}
a .card:hover,.card:hover{box-shadow:0 4px 18px rgba(0,0,0,.28)}
.split{display:grid;gap:14px;grid-template-columns:minmax(0,2fr) minmax(0,1fr);align-items:start}
@media (max-width:1080px){.split{grid-template-columns:1fr}}

/* ---- tables ------------------------------------------------------------ */
table{border-collapse:collapse;width:100%;font-size:13px}
th,td{text-align:left;padding:7px 10px;border-bottom:1px solid var(--line)}
th{color:var(--dim);font-weight:500;font-size:11.5px;text-transform:uppercase;letter-spacing:.7px;
  position:sticky;top:0;background:var(--bg);z-index:1}
th a{color:inherit;text-decoration:none}th a:hover{color:var(--accent)}
td.num{text-align:right;font-variant-numeric:tabular-nums}
tr:hover td{background:rgba(255,255,255,.02)}
.wrap{overflow-x:auto}
table.dense td,table.dense th{padding:5px 10px}
td .sub{color:var(--faint);font-size:11px}

/* ---- meters ------------------------------------------------------------ */
.bar{height:5px;background:var(--line);border-radius:3px;overflow:hidden;margin-top:3px}
.bar span{display:block;height:100%;background:var(--accent)}
.progress{height:7px;background:var(--line);border-radius:4px;overflow:hidden;display:flex}
.progress .done{background:var(--good)}.progress .failed{background:var(--bad)}
.spark{display:flex;gap:2px;align-items:flex-end;height:34px}
.spark i{flex:1;background:var(--accentdim);border-top:2px solid var(--accent);min-height:2px;border-radius:1px 1px 0 0}
.funnel{display:flex;gap:2px;align-items:stretch;margin:10px 0 4px}
.funnel .step{flex:1;background:var(--panel);border:1px solid var(--line);padding:10px 12px;min-width:0;text-decoration:none;color:inherit}
.funnel .step:first-child{border-radius:9px 0 0 9px}.funnel .step:last-child{border-radius:0 9px 9px 0}
.funnel .step:hover{border-color:var(--line3);background:var(--panel2)}
.funnel .step .v{font-size:20px;font-weight:650;font-variant-numeric:tabular-nums}
.funnel .step .l{color:var(--dim);font-size:10.5px;text-transform:uppercase;letter-spacing:.9px}
.funnel .step .rule{height:2px;margin-top:8px;border-radius:2px;background:var(--line2)}
.meterrow{display:flex;align-items:center;gap:8px;margin-top:5px;font-size:12px}
.meterrow .name{min-width:118px;color:var(--dim)}
.meterrow .track{flex:1;height:6px;background:var(--line);border-radius:3px;overflow:hidden}
.meterrow .track span{display:block;height:100%;background:var(--accent)}
.meterrow .val{width:44px;text-align:right;color:var(--dim);font-variant-numeric:tabular-nums}
.stickybar{position:sticky;top:53px;z-index:5;background:rgba(7,9,13,.92);backdrop-filter:blur(6px);
  border:1px solid var(--line);border-radius:9px;padding:9px 14px;display:flex;align-items:center;gap:12px;margin:10px 0 14px}
.stickybar .progress{flex:1;max-width:320px;height:6px;margin:0}

/* ---- icons --------------------------------------------------------------*/
.icon{width:13px;height:13px;flex:none;vertical-align:-2px}
.icon.lg{width:18px;height:18px}
button .icon,a.btn .icon{margin-right:6px;vertical-align:-2.5px}

/* ---- badges, chips, facets --------------------------------------------- */
.badge{display:inline-flex;align-items:center;gap:4px;border-radius:5px;padding:1px 8px;font-size:11px;font-weight:600}
.badge.approve,.badge.done,.badge.shipped,.badge.live{background:rgba(95,206,147,.15);color:var(--good)}
.badge.reject,.badge.failed{background:rgba(229,101,122,.15);color:var(--bad)}
.badge.pending,.badge.open,.badge.draft{background:rgba(139,149,167,.15);color:var(--dim)}
.badge.review,.badge.staged{background:rgba(227,181,102,.15);color:var(--warn)}
.badge.generating,.badge.bundled{background:var(--accentdim);color:var(--accent2)}
.chip{display:inline-flex;align-items:center;gap:5px;border:1px solid var(--line2);border-radius:999px;padding:1px 10px;font-size:11px;color:var(--dim);margin:2px 4px 2px 0;text-decoration:none}
a.chip:hover{border-color:var(--accent);color:var(--fg)}
.chip.on{border-color:var(--accent);color:var(--fg);background:var(--accentdim)}
.chip.warn{border-color:rgba(227,181,102,.5);color:var(--warn)}
.chip.warn:hover{border-color:var(--warn);color:var(--warn)}
.chip b{color:var(--fg);font-weight:600}

/* ---- needs-decision strip ----------------------------------------------*/
.needs-decision{display:flex;gap:8px;align-items:center;overflow-x:auto;padding:12px 14px;margin-bottom:14px;
  background:linear-gradient(180deg,rgba(227,181,102,.08),transparent);border:1px solid rgba(227,181,102,.3);border-radius:10px}
.needs-decision .nd-label{display:flex;align-items:center;gap:6px;color:var(--warn);font-size:11.5px;font-weight:650;
  text-transform:uppercase;letter-spacing:.7px;flex:none;padding-right:8px;border-right:1px solid rgba(227,181,102,.25)}
.needs-decision .nd-row{display:flex;gap:8px;overflow-x:auto}

/* ---- quicklinks ----------------------------------------------------------*/
.quicklinks{display:flex;gap:8px;flex-wrap:wrap;margin:2px 0 16px}
.quicklinks a{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border:1px solid var(--line);border-radius:8px;
  color:var(--dim);text-decoration:none;font-size:12.5px;background:var(--panel)}
.quicklinks a:hover{color:var(--fg);border-color:var(--line3);background:var(--panel2)}

/* ---- decision toggle -----------------------------------------------------*/
.decision-toggle{display:inline-flex;border:1px solid var(--line2);border-radius:8px;overflow:hidden}
.decision-toggle button{display:flex;align-items:center;justify-content:center;background:var(--panel);color:var(--faint);
  border:none;border-right:1px solid var(--line2);border-radius:0;padding:6px 12px;font-weight:600}
.decision-toggle button:last-child{border-right:none}
.decision-toggle button:hover{background:var(--panel2);color:var(--fg)}
.decision-toggle button.active.approve{background:rgba(95,206,147,.18);color:var(--good)}
.decision-toggle button.active.reject{background:rgba(229,101,122,.18);color:var(--bad)}
.decision-toggle button.active.pending{background:rgba(139,149,167,.18);color:var(--dim)}
.decision-toggle .icon{margin:0}
.facets{display:flex;flex-direction:column;gap:8px;background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:12px 14px}
.facet{display:flex;gap:4px;align-items:baseline;flex-wrap:wrap}
.facet .flabel{min-width:64px;color:var(--faint);font-size:10px;text-transform:uppercase;letter-spacing:1.1px}
.tone{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px;vertical-align:1px}
.tonebar{display:flex;height:5px;border-radius:3px;overflow:hidden;width:70px}
.tonebar i{display:block;height:100%}

/* ---- article cover form ------------------------------------------------ */
.cover-split{display:grid;gap:18px;grid-template-columns:minmax(0,1.1fr) minmax(280px,0.9fr);align-items:start}
@media (max-width:1080px){.cover-split{grid-template-columns:1fr}}
.cover-stage{background:#f3ead3;color:#1a2433;border-radius:10px;overflow:hidden;border:1px solid var(--line)}
.cover-bleed{min-height:280px;background:#efe4c8}
.cover-bleed img{display:block;width:100%;height:auto}
.cover-empty{min-height:280px;display:grid;place-items:center;padding:24px;color:#5c5346;text-align:center}
.cover-under{padding:16px 18px 20px;border-top:1px solid #d8ccb0}
.cover-kicker{font-size:11px;letter-spacing:1.4px;text-transform:uppercase;color:#9a4e1a;margin-bottom:6px}
.cover-headline{font-family:var(--serif);font-size:26px;line-height:1.2;color:#1a2433}
.cover-form label{display:block;margin-top:12px;font-size:12px;color:var(--dim)}
.cover-form textarea,.cover-form input,.cover-form select{width:100%;margin-top:4px}
.cover-form label[aria-invalid="true"] textarea,
.cover-form label[aria-invalid="true"] input,
.cover-form label[aria-invalid="true"] select{border-color:var(--bad)}

/* ---- forms ------------------------------------------------------------- */
form.inline{margin-left:auto}
input,select,textarea{background:var(--panel);border:1px solid var(--line2);color:var(--fg);border-radius:8px;padding:6px 10px;font:inherit}
input:focus,select:focus,textarea:focus{outline:none;border-color:var(--accent)}
textarea{width:100%;resize:vertical;font-family:var(--mono);font-size:12.5px}
button{background:linear-gradient(135deg,var(--accent),var(--accent2));color:#241205;border:none;border-radius:8px;padding:7px 15px;
  font-weight:650;cursor:pointer;font:inherit;box-shadow:0 2px 8px rgba(226,121,61,.25);transition:filter .15s,box-shadow .15s}
button:hover{filter:brightness(1.08);box-shadow:0 3px 12px rgba(226,121,61,.35)}
button.danger{background:var(--bad);color:#1a0507}
button.quiet{background:var(--panel2);color:var(--fg);border:1px solid var(--line2)}
button.quiet:hover{background:var(--line)}
.toolbar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px}
.defect{color:var(--bad);font-size:12px;margin-top:4px}

/* ---- reader ------------------------------------------------------------ */
.beat{margin-top:14px}
.beat .who{color:var(--faint);font-size:10px;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:3px}
.beat .say{font-family:var(--serif);font-size:15.5px;line-height:1.7;color:var(--fg)}
.beat.narrator .say{color:var(--dim);font-style:italic}
.reply-card{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:13px 15px;margin-top:10px;cursor:pointer;transition:border-color .15s}
.reply-card:hover{border-color:var(--accent)}
.reply-card.picked{border-color:var(--accent);background:var(--panel2)}
.reply-card .say{font-family:var(--serif);font-size:14.5px;margin-top:4px}
.outcome{border-left:3px solid var(--accent);padding:10px 14px;margin-top:10px;background:var(--panel2);border-radius:0 8px 8px 0}
.tree{display:flex;gap:14px;align-items:stretch;overflow-x:auto;padding:6px 0}
.tree .col{min-width:230px;flex:1}
.tree .node{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:11px 13px;margin-bottom:10px;font-size:12.5px}
.tree .node .k{margin-top:4px}
.tree .root{border-color:var(--accent)}
.tok{background:var(--accentdim);color:var(--accent2);border-radius:4px;padding:0 4px}

/* ---- narrow ------------------------------------------------------------ */
@media (max-width:860px){
  .frame{flex-direction:column}
  .rail{width:100%;flex:none;height:auto;position:static;flex-direction:row;flex-wrap:wrap;gap:10px;padding:10px 14px}
  .railgroup{flex-direction:row;flex-wrap:wrap;align-items:center}
  .rail a.navlink{border-left:none;padding:4px 9px;border-radius:6px}
  .railfoot{display:none}
  .searchbox input{width:150px}
  main{padding:18px 14px 40px}
}

/* ---- metric registry views --------------------------------------------- */
.badge.prov-authored{background:rgba(95,206,147,.15);color:var(--good)}
.badge.prov-derived{background:rgba(121,208,224,.15);color:var(--info)}
.badge.prov-runtime{background:rgba(199,146,234,.15);color:var(--violet)}
.chip.type{background:var(--panel2);color:var(--dim);font-family:var(--mono);font-size:11px}
table.metrics td.mname{width:42%;vertical-align:top}
table.metrics td.mname .k{font-size:12px;line-height:1.45;margin-top:2px}
table.metrics td.mvalue{vertical-align:top;font-variant-numeric:tabular-nums;min-width:180px}
table.metrics td.mmeta{vertical-align:top;white-space:nowrap;width:1%}
table.metrics td.mmeta .readby{font-size:11px;margin-top:4px;white-space:normal;max-width:220px}
.track-row{display:flex;align-items:center;gap:6px;margin-top:5px;font-size:10.5px;color:var(--faint)}
.track-row .track{flex:1;height:5px;background:var(--line);border-radius:3px;overflow:hidden;min-width:60px}
.track-row .track span{display:block;height:100%;background:var(--accent)}
.track-row .end{max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.editor td.field{width:40%;vertical-align:top}
.editor td.field label{font-weight:600}
.editor td.field .k{font-size:12px;line-height:1.45}
.editor td.input{vertical-align:top;width:200px}
.editor td.input input,.editor td.input select{width:100%}
.editor .pending{color:var(--warn);font-size:11.5px}
.filters{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:12px 0}
.filters input,.filters select{padding:5px 8px}
.tiers{font-family:var(--mono);letter-spacing:1px;color:var(--accent2)}
.sectionhead .actions{margin-left:auto;display:flex;gap:8px}
`;
