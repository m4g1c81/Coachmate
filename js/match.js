/* CoachMate – segnapunti, statistiche, storico */
(function (global) {
  'use strict';
  const CM = global.CM;
  const { h, icon, iconBadge, grad, Router, page, Store, Team, Player, Match, Record } = CM;
  const US = '#1F6BFA', THEM = '#FA4278';

  const ui = { statPlayer: null, nextRotation: 0, nextWeServe: true, warm: null };

  // =================== CONFIGURAZIONE ===================
  function renderSetup(fixtureID) {
    const fixture = fixtureID ? Store.data.fixtures.find(f => f.id === fixtureID) : null;
    const team = Store.team;
    const st = { training: false, keep: false, opponent: fixture ? fixture.opponent : '', weServe: true,
      rotation: team.startRotation || 0, rules: CM.clone(team.rules) };
    const p = page('Segnapunti');
    const body = h('div', { class: 'stack' });
    p.appendChild(body);

    function draw() {
      const t = Store.team;
      body.innerHTML = '';
      const lab = Team.labeler(t);
      const court = CM.createCourt();
      court.update({ formation: CM.Engine.formation(Object.assign(CM.defaultSituation(), { system: t.system, rotation: st.rotation, useLibero: t.useLibero }), lab),
        labeler: lab, showZones: true, showAreas: false, interactive: false });
      body.append(
        h('div', { class: 'card row' }, iconBadge('court', ['#FA4278', '#FF8C1F'], 46),
          h('div', null, h('b', { style: { fontSize: '19px' } }, fixture ? 'Partita del calendario' : 'Nuova partita'),
            h('div', { class: 'small muted' }, 'Il segnapunti ruota la squadra da solo a ogni cambio palla.'))),
        CM.formGroup(null, [
          h('div', { class: 'form-row' }, CM.chipPicker([{ label: 'Partita', value: false }, { label: 'Allenamento', value: true }], st.training, v => { st.training = v; draw(); }, ['#FA4278', '#FF8C1F'])),
          st.training ? CM.formRow('Salva nello storico', CM.toggle(st.keep, v => { st.keep = v; })) : null
        ], st.training ? 'Allenamento: l\'avversario è facoltativo (es. squadra A contro B) e non conta nelle vittorie e sconfitte. Se non lo salvi, a fine sessione sparisce.'
          : 'Partita ufficiale o amichevole: viene salvata nello storico e conta nelle statistiche.'),
        CM.formGroup('Squadra', [
          CM.formRow('Squadra', CM.select(Store.data.teams.map(x => ({ label: `${x.name} (${x.system})`, value: x.id })), t.id, v => {
            Store.data.selectedTeamID = v; Store.commit(); const nt = Store.team; st.rules = CM.clone(nt.rules); st.rotation = nt.startRotation || 0; draw(); })),
          t.players.length ? null : h('div', { class: 'form-row small muted' }, 'Nessun giocatore: in campo vedrai solo i ruoli. Puoi aggiungerli in Squadre.')
        ]),
        CM.formGroup(st.training ? 'Altra squadra (facoltativo)' : 'Avversario', [
          h('div', { class: 'form-row' }, CM.textInput(st.opponent, st.training ? 'Es. Squadra B, Riserve…' : 'Nome squadra avversaria', v => { st.opponent = v; }, 'left'))]),
        CM.formGroup('Primo set', [
          CM.formRow('Batte per primo', CM.select([{ label: t.name, value: true }, { label: st.opponent || (st.training ? 'Squadra B' : 'Avversari'), value: false }], st.weServe, v => { st.weServe = v; })),
          CM.formRow('Rotazione di partenza', CM.select(CM.Rot.all.map(k => ({ label: CM.Rot.name(k), value: k })), st.rotation, v => { st.rotation = v; draw(); })),
          h('div', { style: { padding: '10px' } }, h('div', { style: { maxWidth: '360px', margin: '0 auto' } }, court.el))
        ]),
        rulesEditor(st.rules, draw),
        CM.gradButton(st.training ? 'Inizia allenamento' : 'Inizia partita', 'play', ['#FA4278', '#FF8C1F'], start));
    }
    function start() {
      const t = Store.team;
      t.rules = CM.clone(st.rules); t.startRotation = st.rotation;
      const opp = st.opponent.trim() || (st.training ? 'Squadra B' : 'Avversari');
      const m = CM.newMatch(t, opp, st.rules, st.weServe, st.rotation);
      if (st.training) { m.training = true; m.keepInHistory = st.keep; }
      if (fixture) {
        m.fixtureID = fixture.id;
        if (fixture.called.length) {
          const starters = new Set(Object.values(t.lineup));
          m.players = t.players.filter(pl => fixture.called.includes(pl.id) || starters.has(pl.id) || pl.id === t.libero2).map(CM.clone);
        }
      }
      Store.undo = [];
      Store.data.currentMatch = m;
      ui.statPlayer = null;
      Store.commit();
      Router.go('/match');
    }
    draw();
  }

  function rulesEditor(r, redraw) {
    const set = (k, v) => { r[k] = v; redraw(); };
    return CM.formGroup('Regolamento', [
      h('div', { class: 'form-row' }, h('button', { class: 'btn-plain', onclick: e => CM.menu(e.currentTarget, Object.keys(CM.RULE_PRESETS).map(k => ({
        label: CM.RULE_PRESETS[k].label, action: () => { Object.assign(r, CM.rulesFrom(k)); redraw(); } }))) }, '📋 Carica un modello')),
      CM.formRow('Formula', CM.select([{ label: 'Al meglio dei set', value: 'bestOf' }, { label: 'Set fissi', value: 'fixed' }], r.mode, v => set('mode', v))),
      r.mode === 'bestOf' ? CM.stepperRow(`Set per vincere: ${r.setsToWin} (su ${r.setsToWin * 2 - 1})`, r.setsToWin, 1, 3, v => set('setsToWin', v)) : null,
      r.mode === 'bestOf' ? CM.formRow('Tie-break nel set decisivo', CM.toggle(r.tieBreak, v => set('tieBreak', v))) : null,
      r.mode === 'bestOf' && r.tieBreak ? CM.stepperRow(`Tie-break a ${r.tieBreakPoints} punti`, r.tieBreakPoints, 5, 25, v => set('tieBreakPoints', v)) : null,
      r.mode === 'fixed' ? CM.stepperRow(`Set da giocare: ${r.totalSets}`, r.totalSets, 1, 5, v => set('totalSets', v)) : null,
      CM.stepperRow(`Set a ${r.pointsPerSet} punti`, r.pointsPerSet, 5, 30, v => set('pointsPerSet', v)),
      CM.formRow('Vantaggio di 2 punti', CM.toggle(r.winByTwo, v => set('winByTwo', v))),
      CM.stepperRow(r.capPoints ? `Punteggio massimo: ${r.capPoints}` : 'Punteggio massimo: nessuno', r.capPoints, 0, 40, v => set('capPoints', v)),
      CM.stepperRow(r.maxSubs ? `Cambi per set: ${r.maxSubs}` : 'Cambi per set: illimitati', r.maxSubs, 0, 12, v => set('maxSubs', v)),
      CM.stepperRow(`Time-out per set: ${r.timeouts}`, r.timeouts, 0, 3, v => set('timeouts', v)),
      CM.formRow('Rientri con regola FIPAV', CM.toggle(r.strictReentry, v => set('strictReentry', v)))
    ], 'CSEN, UISP e altri enti amatoriali hanno regolamenti che cambiano da comitato a comitato: imposta qui quelli del tuo campionato. Regole FIPAV 2026/27: 8 sostituzioni per set, ogni giocatore entra una sola volta per set.');
  }

  // =================== PARTITA IN CORSO ===================
  let matchCourt = null;
  function renderMatch() {
    const m0 = Store.data.currentMatch;
    if (!m0) { renderSetup(); return; }
    if (m0.finished && !m0.savedToHistory) Store.archiveCurrentMatch();
    const p = page(m0.training ? 'Allenamento' : 'Segnapunti', { right: [{ icon: 'more', label: 'Menu', onclick: e => matchMenu(e.currentTarget) }] });
    const layout = h('div', { class: 'court-layout' });
    const controls = h('div', { class: 'cl-controls' });
    const courtCol = h('div', { class: 'cl-court' });
    const info = h('div', { class: 'cl-info' });
    layout.append(controls, courtCol, info);
    p.appendChild(layout);
    matchCourt = CM.createCourt();
    const badge = h('div', { class: 'court-badge' });
    matchCourt.el.appendChild(badge);
    courtCol.appendChild(matchCourt.el);
    ui.nextRotation = m0.startRotation; ui.nextWeServe = !m0.firstServeUs;

    const unsub = Store.subscribe(() => { if (location.hash === '#/match') draw(); else unsub(); });
    window.addEventListener('hashchange', unsub, { once: true });

    function draw() {
      const m = Store.data.currentMatch;
      if (!m) { unsub(); renderSetup(); return; }
      const lab = Match.labeler(m);
      matchCourt.update({ formation: CM.Engine.formation(Match.situation(m), lab), labeler: lab, showAreas: false, interactive: false });
      badge.innerHTML = '';
      badge.append(icon(m.weServe ? 'serve' : 'hand', 14), ` ${m.weServe ? 'IN BATTUTA' : 'IN RICEZIONE'} · ${CM.Rot.name(m.rotation)}`);
      badge.style.background = m.weServe ? grad('#FF8C1F', '#FFCC1A') : grad('#21C778', '#0DA89E');
      badge.style.display = 'inline-flex'; badge.style.alignItems = 'center'; badge.style.gap = '4px';

      controls.innerHTML = ''; info.innerHTML = '';
      const w = Match.setWinner(m);
      if (m.finished) controls.appendChild(finishedPanel(m));
      else if (m.betweenSets) controls.appendChild(nextSetPanel(m));
      else if (w !== null) controls.appendChild(setEndPanel(m, w));
      else controls.appendChild(scoreboard(m));

      if (!m.finished && !m.betweenSets) {
        if (Match.isEmpty(m)) info.appendChild(warmupCard(m));
        if (m.lastPointUs !== null && m.lastPointUs !== undefined) info.appendChild(lastPointBar(m));
        const mx = mixedWarning(m); if (mx) info.appendChild(mx);
        info.appendChild(actionRow(m));
        if (Store.data.settings.statsEnabled !== false) info.appendChild(statsPanel(m)); else info.appendChild(statsToggleCard());
        info.appendChild(opponentCard(m));
        info.appendChild(statusCard(m));
      }
    }
    draw();
  }

  function mutate(fn) { Store.mutateMatch(fn); CM.haptic(); }

  function scoreboard(m) {
    const side = (name, score, sets, serving, color, onTap, isUs) => {
      const el = h('button', { class: 'score-side' + (serving ? ' serving' : ''), style: { background: `linear-gradient(135deg, ${color}8C, ${color}40)` } },
        h('div', { class: 'row', style: { gap: '5px', justifyContent: 'center', maxWidth: '100%' } },
          h('span', { style: { opacity: serving ? 1 : 0, color: '#FFCC1A' } }, '●'), h('span', { class: 'score-name' }, name)),
        h('div', { class: 'score-num', style: serving ? { textShadow: `0 0 18px ${color}` } : null }, score),
        h('div', { class: 'set-dots' }, sets ? Array.from({ length: sets }, () => h('i', { style: { background: color } })) : h('i', { style: { background: 'rgba(255,255,255,0.15)' } })));
      let timer = null;
      el.addEventListener('pointerdown', () => { timer = setTimeout(() => { timer = 'long'; scoreMenu(el, isUs); }, 550); });
      el.addEventListener('pointerup', () => { if (timer !== 'long') clearTimeout(timer); });
      el.addEventListener('pointerleave', () => { if (timer !== 'long') clearTimeout(timer); });
      el.onclick = e => { if (timer === 'long') { timer = null; e.preventDefault(); return; } onTap(); };
      el.oncontextmenu = e => e.preventDefault();
      return el;
    };
    return h('div', { class: 'scoreboard' },
      h('div', { class: 'row', style: { marginBottom: '12px' } },
        h('span', { class: 'tiny bold', style: { color: '#FFCC1A', letterSpacing: '1.5px' } }, `SET ${Match.setNumber(m)}${Match.isDeciding(m) ? ' · TIE-BREAK' : ''}`),
        h('span', { class: 'spacer' }), h('span', { class: 'tiny', style: { opacity: 0.6 } }, `a ${Match.target(m)} punti`)),
      h('div', { class: 'row', style: { gap: '10px' } },
        side(m.teamName, m.us, Match.setsUs(m), m.weServe, US, () => point(true), true),
        h('span', { style: { fontSize: '40px', fontWeight: 900, opacity: 0.35 } }, ':'),
        side(m.opponent, m.them, Match.setsThem(m), !m.weServe, THEM, () => point(false), false)),
      m.completedSets.length ? h('div', { class: 'row', style: { gap: '6px', marginTop: '12px' } }, m.completedSets.map(s => h('span', { class: 'pill mono', style: { background: (s.us > s.them ? US : THEM) + '80', color: '#fff' } }, `${s.us}-${s.them}`))) : null,
      h('div', { class: 'tiny', style: { textAlign: 'center', opacity: 0.55, marginTop: '10px' } }, 'Tocca il punteggio di chi ha fatto punto · tieni premuto per correggere'));
  }
  function point(us) { mutate(m => us ? Match.pointUs(m) : Match.pointThem(m)); }

  function scoreMenu(anchor, us) {
    CM.menu(anchor, [
      { label: 'Togli un punto (senza cambiare rotazione)', icon: 'minus', action: () => mutate(m => { if (us) m.us = Math.max(0, m.us - 1); else m.them = Math.max(0, m.them - 1); m.lastPointUs = null; }) },
      { label: 'Aggiungi un punto (senza cambiare rotazione)', icon: 'plus', action: () => mutate(m => { if (us) m.us++; else m.them++; m.lastPointUs = null; }) },
      'sep', { label: 'Correggi punteggio…', icon: 'pencil', action: fixSheet }]);
  }

  function lastPointBar(m) {
    return h('div', { class: 'card tight row' },
      h('span', { style: { width: '10px', height: '10px', borderRadius: '50%', background: m.lastPointUs ? US : THEM } }),
      h('div', { style: { flex: 1, minWidth: 0 } }, h('div', { class: 'small bold' }, 'Ultimo punto: ' + (m.lastPointUs ? m.teamName : m.opponent)),
        h('div', { class: 'tiny muted' }, 'Sbagliato? Annullalo: torna anche la rotazione.')),
      h('button', { class: 'pill', style: { background: grad('#ED3845', '#FF8C1F'), color: '#fff', padding: '8px 12px' }, disabled: !Store.undo.length, onclick: () => Store.undoMatch() }, icon('undo', 14), 'Annulla'));
  }

  function actionRow(m) {
    const btn = (label, ic, colors, disabled, fn) => h('button', { class: 'action-btn', disabled, onclick: fn },
      h('span', { class: 'icon-badge', style: { width: '34px', height: '34px', borderRadius: '50%', background: grad(colors[0], colors[1]) } }, icon(ic)), label);
    const r = m.rules;
    return h('div', { class: 'row', style: { gap: '8px' } },
      btn('Correggi', 'pencil', ['#0DA89E', '#0DC7F2'], false, fixSheet),
      btn(`T.O. ${m.timeoutsUs}/${r.timeouts}`, 'timer', ['#1F6BFA', '#0DC7F2'], m.timeoutsUs >= r.timeouts, () => mutate(x => x.timeoutsUs++)),
      btn(`T.O. avv. ${m.timeoutsThem}/${r.timeouts}`, 'timer', ['#FA4278', '#FF8C1F'], m.timeoutsThem >= r.timeouts, () => mutate(x => x.timeoutsThem++)),
      btn(r.maxSubs ? `Cambi ${m.subsUsed}/${r.maxSubs}` : `Cambi ${m.subsUsed}`, 'swap', ['#8552FA', '#1F6BFA'], false, subsSheet));
  }

  function statusCard(m) {
    const lab = Match.labeler(m), s = Match.situation(m), lines = [];
    if (m.weServe) lines.push(`Batte ${lab(CM.Engine.server(s))}.`);
    else lines.push(`In ricezione: se fate punto ruotate e batte ${lab(CM.Engine.server(Object.assign({}, s, { rotation: CM.Rot.next(m.rotation) })))}.`);
    lines.push(`Alza ${lab(CM.Engine.activeSetter(s))}. Attaccanti di prima linea: ${CM.Engine.frontAttackers(s)}.`);
    if (m.useLibero) {
      const r = CM.Engine.liberoReplaces(s);
      lines.push(r ? `Libero in campo al posto di ${lab(r)}.` : 'Libero fuori: batte il centrale, il libero rientra quando perdete il servizio.');
    }
    return CM.noteCard('Rotazione ' + CM.Rot.name(m.rotation), lines.join('\n'), 'rotate', m.weServe ? ['#FF8C1F', '#FFCC1A'] : ['#21C778', '#0DA89E']);
  }

  function mixedWarning(m) {
    if (!m.mixed) return null;
    const z = CM.Mixed.zoneGenders(Match.situation(m), r => Match.gender(m, r));
    const v = CM.Mixed.violations(z, m.mixed);
    return v.length ? CM.noteCard('Attenzione: ' + m.mixed.name, v.join('\n'), 'group', ['#ED3845', '#FF8C1F'], 'alert-card') : null;
  }

  // ---------- Statistiche ----------
  function onCourt(m) {
    const map = CM.Engine.courtMap(Match.situation(m));
    return [4, 3, 2, 5, 6, 1].map(z => ({ role: map[z], id: m.occupants[map[z]] })).filter(x => x.id);
  }
  function statsToggleCard() {
    return h('div', { class: 'card tight row' }, iconBadge('chart', ['#8552FA', '#1F6BFA'], 30), h('b', { style: { flex: 1 } }, 'Statistiche'),
      CM.toggle(false, v => { Store.data.settings.statsEnabled = v; Store.commit(); }));
  }
  function statsPanel(m) {
    const card = h('div', { class: 'card tight stack', style: { gap: '10px' } });
    card.append(h('div', { class: 'row' }, iconBadge('chart', ['#8552FA', '#1F6BFA'], 30), h('b', { style: { flex: 1 } }, 'Statistiche'),
      h('button', { class: 'btn-soft small', onclick: () => reportSheet(liveRecord(m)) }, icon('doc', 16), 'Report'),
      CM.toggle(true, v => { Store.data.settings.statsEnabled = v; Store.commit(); })));
    const players = onCourt(m);
    if (!players.length) {
      card.append(h('div', { class: 'small muted' }, 'Assegna i giocatori alla formazione (Squadre) per registrare le statistiche.'));
      return card;
    }
    card.append(h('div', { class: 'hscroll' }, players.map(pl => {
      const on = ui.statPlayer === pl.id;
      return h('button', { class: 'player-chip' + (on ? ' on' : ''), onclick: () => { ui.statPlayer = on ? null : pl.id; Store.commit(); } },
        CM.roleDot(pl.role, m.system, 22), Player.display(Match.player(m, pl.id)) || CM.Role.short(pl.role, m.system));
    })));
    if (ui.statPlayer && players.some(x => x.id === ui.statPlayer)) {
      card.append(h('div', { class: 'stack', style: { gap: '8px' } }, CM.Stats.groups.map(g => h('div', { class: 'row', style: { gap: '6px' } },
        h('span', { class: 'tiny bold muted', style: { width: '66px' } }, g.title.toUpperCase()),
        g.actions.map(a => h('button', { class: 'stat-btn' + (CM.Stats.actions[a].point === false ? ' err' : ''), style: { background: grad(g.colors[0], g.colors[1]) }, title: CM.Stats.actions[a].title,
          onclick: () => record(a, ui.statPlayer) }, CM.Stats.actions[a].short))))),
        h('div', { class: 'row small' }, h('span', { style: { flex: 1 } }, 'Assegna anche il punto in automatico'),
          CM.toggle(Store.data.settings.statsAutoPoint !== false, v => { Store.data.settings.statsAutoPoint = v; Store.save(); })));
    } else card.append(h('div', { class: 'small muted' }, 'Scegli un giocatore, poi tocca il gesto: ace, ricezione, attacco, muro…'));
    return card;
  }
  function record(action, playerID) {
    const auto = Store.data.settings.statsAutoPoint !== false;
    ui.statPlayer = null;
    mutate(m => {
      Match.addStat(m, action, playerID);
      const pt = CM.Stats.actions[action].point;
      if (auto && pt !== null) { if (pt) Match.pointUs(m); else Match.pointThem(m); }
    });
  }
  function liveRecord(m) {
    const sets = m.completedSets.slice();
    if (!m.betweenSets && !m.finished && (m.us || m.them)) sets.push({ us: m.us, them: m.them });
    return { teamName: m.teamName, opponent: m.opponent, date: m.date, sets, statRows: Match.statRows(m) };
  }

  // ---------- Avversari ----------
  function opponentCard(m) {
    const z = m.oppSetterZone;
    return h('div', { class: 'card tight row' }, iconBadge('people', ['#FA4278', '#ED3845'], 30),
      h('div', { style: { flex: 1, minWidth: 0 } }, h('div', { class: 'small bold' }, 'Rotazione ' + m.opponent),
        h('div', { class: 'tiny muted' }, z ? `Palleggiatore in zona ${z} · ${z >= 2 && z <= 4 ? '2 attaccanti a rete' : '3 attaccanti a rete'}`
          : 'Indica dove parte il loro palleggiatore: poi la seguo io a ogni cambio palla.')),
      h('button', { class: 'pill', style: { background: grad('#FA4278', '#ED3845'), color: '#fff', padding: '7px 12px' }, onclick: e => CM.menu(e.currentTarget, [
        ...[1, 6, 5, 4, 3, 2].map(zz => ({ label: 'Palleggiatore in zona ' + zz, action: () => mutate(x => { x.oppSetterZone = zz; }) })),
        z ? 'sep' : null, z ? { label: 'Non seguire', danger: true, action: () => mutate(x => { x.oppSetterZone = null; }) } : null]) }, z ? 'P' + z : 'Imposta'));
  }

  // ---------- Riscaldamento ----------
  function warmupCard(m) {
    const w = ui.warm;
    const timeEl = h('b', { class: 'mono', style: { fontSize: '26px' } }, w ? fmt(w.remaining) : '');
    const card = h('div', { class: 'card tight stack', style: { gap: '10px' } },
      h('div', { class: 'row' }, iconBadge('timer', ['#FF8C1F', '#FFCC1A'], 30),
        h('div', { style: { flex: 1 } }, h('b', null, 'Riscaldamento al servizio'), h('div', { class: 'tiny muted' }, 'Regole 2026/27: 90" per squadra, a turno')), timeEl),
      h('div', { class: 'row', style: { gap: '8px' } },
        CM.chip(m.teamName, w && w.turn === 0, [US, '#0DC7F2'], () => startWarm(0), 'play'),
        CM.chip(m.opponent, w && w.turn === 1, [THEM, '#FF8C1F'], () => startWarm(1), 'play'),
        w ? h('button', { class: 'circle-btn', onclick: () => { clearInterval(w.timer); ui.warm = null; Store.commit(); } }, icon('stop', 16)) : null));
    function fmt(s) { return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
    function startWarm(turn) {
      if (ui.warm) clearInterval(ui.warm.timer);
      ui.warm = { turn, remaining: 90 };
      ui.warm.timer = setInterval(() => {
        if (!ui.warm) return;
        ui.warm.remaining--;
        const el = document.querySelector('.warm-time');
        if (ui.warm.remaining <= 0) { clearInterval(ui.warm.timer); ui.warm = null; CM.haptic(300); CM.toast('Tempo scaduto', 'timer'); Store.commit(); return; }
        if (el) { el.textContent = fmt(ui.warm.remaining); el.style.color = ui.warm.remaining <= 10 ? 'var(--red)' : ''; }
      }, 1000);
      Store.commit();
    }
    timeEl.classList.add('warm-time');
    return card;
  }

  // ---------- Pannelli di fine set / partita ----------
  function setEndPanel(m, weWon) {
    return h('div', { style: { background: grad(weWon ? US : THEM, '#0A173D'), color: '#fff', borderRadius: '24px', padding: '20px', textAlign: 'center' }, class: 'stack' },
      h('div', null, icon('flag', 40)),
      h('h2', { style: { margin: 0 } }, `Fine set ${Match.setNumber(m)}`),
      h('div', { class: 'bold' }, `${weWon ? m.teamName : m.opponent} vince ${Math.max(m.us, m.them)}-${Math.min(m.us, m.them)}`),
      h('div', { class: 'row', style: { gap: '10px' } },
        CM.gradButton('Annulla punto', 'undo', ['#6B7080', '#8E93A3'], () => Store.undoMatch(), true),
        CM.gradButton('Conferma', 'check', ['#21C778', '#0DA89E'], () => {
          mutate(x => Match.closeSet(x));
          const mm = Store.data.currentMatch;
          if (mm.finished) { Store.undo = []; Store.archiveCurrentMatch(); }
          else { ui.nextRotation = mm.startRotation; ui.nextWeServe = !mm.firstServeUs; Store.commit(); }
        }, true)));
  }
  function nextSetPanel(m) {
    const decider = m.rules.mode === 'bestOf' && m.rules.tieBreak && Match.setsUs(m) === m.rules.setsToWin - 1 && Match.setsThem(m) === m.rules.setsToWin - 1;
    return h('div', { class: 'card stack' },
      h('div', { class: 'row' }, iconBadge('play', ['#21C778', '#0DA89E'], 40),
        h('div', null, h('b', { style: { fontSize: '19px' } }, `Set ${Match.setNumber(m)}${decider ? ' · tie-break' : ''}`), h('div', { class: 'small muted mono' }, `Set: ${Match.setsUs(m)} – ${Match.setsThem(m)}`))),
      h('div', { class: 'tiny bold muted' }, 'ROTAZIONE DI PARTENZA'),
      CM.chipPicker(CM.Rot.all.map(k => ({ label: CM.Rot.name(k), value: k })), ui.nextRotation, v => { ui.nextRotation = v; Store.commit(); }, ['#21C778', '#0DA89E']),
      h('div', { class: 'tiny bold muted' }, 'BATTE PER PRIMO'),
      h('div', { class: 'row', style: { gap: '6px' } },
        CM.chip(m.teamName, ui.nextWeServe, [US, '#0DC7F2'], () => { ui.nextWeServe = true; Store.commit(); }),
        CM.chip(m.opponent, !ui.nextWeServe, [THEM, '#FF8C1F'], () => { ui.nextWeServe = false; Store.commit(); })),
      h('div', { class: 'small muted' }, 'Di norma il nuovo set lo inizia a battere chi ha ricevuto per primo nel set precedente. La formazione torna quella titolare.'),
      CM.gradButton('Inizia il set', 'play', ['#21C778', '#0DA89E'], () => mutate(x => Match.startNextSet(x, ui.nextRotation, ui.nextWeServe))),
      h('button', { class: 'btn-plain danger', disabled: !Store.undo.length, onclick: () => Store.undoMatch() }, 'Ho sbagliato: riapri il set precedente'));
  }
  function finishedPanel(m) {
    const su = Match.setsUs(m), sh = Match.setsThem(m), won = su > sh, draw = su === sh;
    const notSaved = m.training && !m.keepInHistory;
    return h('div', { class: 'stack', style: { background: grad(won ? '#21C778' : (draw ? US : THEM), '#0A173D'), color: '#fff', borderRadius: '26px', padding: '22px', textAlign: 'center' } },
      h('div', { style: { color: won ? '#FFCC1A' : '#fff' } }, icon(won ? 'trophy' : 'flag', 56)),
      h('div', { style: { fontSize: '34px', fontWeight: 900 } }, won ? 'Vittoria!' : (draw ? 'Pareggio' : 'Sconfitta')),
      h('div', { class: 'bold mono', style: { fontSize: '19px' } }, `${m.teamName}  ${su} – ${sh}  ${m.opponent}`),
      h('div', { class: 'row', style: { gap: '6px', justifyContent: 'center', flexWrap: 'wrap' } }, m.completedSets.map(s => h('span', { class: 'pill mono', style: { background: 'rgba(255,255,255,0.18)', color: '#fff' } }, `${s.us}-${s.them}`))),
      h('div', { class: 'small bold' }, notSaved ? 'Allenamento: non salvato nello storico' : '✓ Salvata nello storico'),
      h('div', { class: 'row', style: { gap: '10px' } },
        CM.gradButton('Report', 'doc', ['rgba(255,255,255,0.28)', 'rgba(255,255,255,0.16)'], () => reportSheet(liveRecord(m)), true),
        CM.gradButton('Chiudi partita', 'x', ['rgba(255,255,255,0.28)', 'rgba(255,255,255,0.16)'], () => { Store.finishMatch(); Router.go('/'); }, true)));
  }

  // ---------- Menu ----------
  function matchMenu(anchor) {
    const m = Store.data.currentMatch;
    if (!m) return;
    CM.menu(anchor, [
      { label: 'Annulla ultima azione', icon: 'undo', disabled: !Store.undo.length, action: () => Store.undoMatch() },
      { label: 'Correggi punteggio…', icon: 'pencil', action: fixSheet },
      'sep',
      { label: 'Sostituzioni', icon: 'swap', action: subsSheet },
      m.liberoBench ? { label: `Scambia libero (${Player.display(Match.player(m, m.liberoBench)) || '2° libero'})`, icon: 'swap', action: () => mutate(x => Match.swapLibero(x)) } : null,
      { label: 'Correggi servizio', icon: 'serve', action: () => mutate(x => { x.weServe = !x.weServe; }) },
      'sep',
      { label: m.training ? 'Termina allenamento' : 'Termina partita', icon: 'flag', danger: true, action: () => CM.confirmDialog(
        m.training ? 'Terminare l\'allenamento?' : 'Terminare la partita?',
        m.training && !m.keepInHistory ? 'L\'allenamento non viene salvato nello storico.' : 'Verrà salvata nello storico come interrotta, con il punteggio raggiunto.',
        'Termina', () => { Store.finishMatch(); Router.go('/'); }) }
    ]);
  }

  // ---------- Correzione manuale ----------
  function fixSheet() {
    const m = Store.data.currentMatch;
    if (!m) return;
    const d = CM.clone(m);
    CM.sheet('Correggi punteggio', body => {
      const draw = () => {
        body.innerHTML = '';
        const scoreRow = (name, key, color) => h('div', { class: 'form-row' },
          h('span', { style: { width: '12px', height: '12px', borderRadius: '50%', background: color } }), h('b', { style: { flex: 1 } }, name),
          h('button', { class: 'circle-btn', style: { color: 'var(--red)' }, onclick: () => { d[key] = Math.max(0, d[key] - 1); draw(); } }, icon('minus', 18)),
          h('b', { class: 'mono', style: { fontSize: '28px', minWidth: '44px', textAlign: 'center' } }, d[key]),
          h('button', { class: 'circle-btn', style: { color: 'var(--green)' }, onclick: () => { d[key]++; draw(); } }, icon('plus', 18)));
        body.append(
          CM.formGroup(`Punteggio set ${Match.setNumber(d)}`, [scoreRow(d.teamName, 'us', US), scoreRow(d.opponent, 'them', THEM)],
            'Per un solo punto sbagliato è più comodo «Annulla»: rimette a posto anche rotazione e servizio.'),
          CM.formGroup('Servizio', [h('div', { class: 'form-row' }, CM.chipPicker([{ label: d.teamName, value: true }, { label: d.opponent, value: false }], d.weServe, v => { d.weServe = v; draw(); }))]),
          CM.formGroup('Rotazione della tua squadra', [h('div', { class: 'form-row' }, CM.chipPicker(CM.Rot.all.map(k => ({ label: CM.Rot.name(k), value: k })), d.rotation, v => { d.rotation = v; draw(); }))]),
          CM.formGroup('Time-out usati', [
            CM.stepperRow(`${d.teamName}: ${d.timeoutsUs}`, d.timeoutsUs, 0, d.rules.timeouts, v => { d.timeoutsUs = v; draw(); }),
            CM.stepperRow(`${d.opponent}: ${d.timeoutsThem}`, d.timeoutsThem, 0, d.rules.timeouts, v => { d.timeoutsThem = v; draw(); })]),
          d.completedSets.length ? CM.formGroup('Set conclusi', d.completedSets.map((s, i) => h('div', { class: 'form-row' },
            h('b', { style: { flex: 1 } }, `${i + 1}° set`),
            h('input', { type: 'number', class: 'num-input', value: s.us, oninput: e => { s.us = +e.target.value || 0; } }), '–',
            h('input', { type: 'number', class: 'num-input', value: s.them, oninput: e => { s.them = +e.target.value || 0; } })))) : null);
      };
      draw();
    }, { cancelLabel: 'Annulla', action: { label: 'Salva', run: () => { d.lastPointUs = null; mutate(x => Object.assign(x, d)); } } });
  }

  // ---------- Sostituzioni ----------
  function subsSheet() {
    CM.sheet('Sostituzioni', (body, close) => {
      const m = Store.data.currentMatch;
      if (!m) return;
      const canSub = !m.rules.maxSubs || m.subsUsed < m.rules.maxSubs;
      const onCourtIDs = new Set(Object.values(m.occupants));
      const bench = m.players.filter(p => !onCourtIDs.has(p.id) && p.role !== 'Libero' && p.id !== m.liberoBench);
      const used = new Set(Object.values(m.subs || {}).flatMap(x => [x.starter, x.sub]));
      const candidates = role => {
        if (!m.rules.strictReentry) return bench;
        const info = m.subs[role];
        if (info) { if (info.closed) return []; if (m.occupants[role] === info.sub) return m.players.filter(p => p.id === info.starter); return []; }
        return bench.filter(p => !used.has(p.id));
      };
      const problems = (role, pl) => {
        if (!m.mixed) return [];
        const after = CM.clone(m); after.occupants[role] = pl.id;
        return CM.Mixed.violations(CM.Mixed.zoneGenders(Match.situation(after), r => Match.gender(after, r)), m.mixed);
      };
      body.append(h('div', { class: 'card' },
        h('div', { class: 'row' }, iconBadge('swap', ['#8552FA', '#1F6BFA'], 40), h('b', null, m.rules.maxSubs ? `Cambi usati: ${m.subsUsed} su ${m.rules.maxSubs}` : `Cambi usati: ${m.subsUsed} (illimitati)`)),
        m.players.length ? null : h('div', { class: 'small muted', style: { marginTop: '6px' } }, 'Per fare i cambi aggiungi i giocatori (anche le riserve) nella sezione Squadre.'),
        h('div', { class: 'tiny muted', style: { marginTop: '6px' } }, 'Regole 2026/27: 8 sostituzioni per set; ogni giocatore può entrare una sola volta per set.')));
      if (m.liberoBench) body.append(CM.formGroup('Libero', [
        CM.formRow('In campo', h('span', { class: 'bold' }, Player.listName(Match.player(m, m.occupants.L)))),
        h('button', { class: 'form-row btn-plain', style: { width: '100%' }, onclick: () => { close(); mutate(x => Match.swapLibero(x)); } },
          icon('swap', 18), 'Scambia con ' + Player.listName(Match.player(m, m.liberoBench)))], 'Lo scambio tra liberi non conta come sostituzione.'));
      for (const role of CM.COURT_ROLES) {
        const opts = candidates(role);
        const rows = [];
        if (!canSub) rows.push(h('div', { class: 'form-row small muted' }, 'Cambi esauriti per questo set'));
        else if (!opts.length) rows.push(h('div', { class: 'form-row small muted' }, m.subs[role] && m.subs[role].closed ? 'Posizione chiusa: il titolare è già rientrato.' : 'Nessun giocatore disponibile in panchina.'));
        else for (const pl of opts) {
          const pr = problems(role, pl);
          rows.push(h('button', { class: 'form-row', style: { width: '100%', textAlign: 'left', opacity: pr.length ? 0.6 : 1 }, disabled: pr.length > 0, onclick: () => {
            close();
            mutate(x => {
              const cur = x.occupants[role];
              if (x.rules.strictReentry && cur) {
                if (x.subs[role]) x.subs[role].closed = true; else x.subs[role] = { starter: cur, sub: pl.id, closed: false };
              }
              x.occupants[role] = pl.id; x.subsUsed++;
            });
          } }, icon('chevron', 16), h('div', { style: { flex: 1 } }, h('div', { class: 'bold', style: { color: 'var(--blue)' } }, `Entra ${Player.listName(pl)}${pl.gender ? ` (${pl.gender})` : ''}`),
            pr.length ? h('div', { class: 'tiny', style: { color: 'var(--red)' } }, 'Non ammesso: ' + pr[0]) : null)));
        }
        body.append(h('div', null, h('div', { class: 'row', style: { margin: '0 16px 6px', gap: '8px' } }, CM.roleDot(role, m.system, 22),
          h('span', { class: 'small bold muted' }, `${CM.Role.fullName(role, m.system)}: ${Player.listName(Match.player(m, m.occupants[role]))}`)),
        h('div', { class: 'form-group' }, rows)));
      }
    });
  }

  // =================== REPORT ===================
  function reportTable(r) {
    const rows = r.statRows || [];
    const S = CM.Stats;
    const tot = {};
    rows.forEach(x => { for (const k in x.stats) tot[k] = (tot[k] || 0) + x.stats[k]; });
    const tr = (name, st, cls) => h('tr', { class: cls || '' },
      h('td', { class: 'bold' }, name), h('td', { class: 'bold' }, S.points(st)),
      h('td', null, `${S.n(st, 'ace')}/${S.n(st, 'serveErr')}/${S.serves(st)}`),
      h('td', null, S.recAvg(st) != null ? `${S.recAvg(st).toFixed(1)} · ${S.recPos(st)}%` : '–'),
      h('td', null, `${S.n(st, 'attackPoint')}/${S.n(st, 'attackErr')}/${S.attacks(st)}`),
      h('td', null, S.attEff(st) != null ? S.attEff(st) + '%' : '–'),
      h('td', null, S.n(st, 'blockPoint')),
      h('td', { style: S.errors(st) ? { color: 'var(--red)' } : null }, S.errors(st)));
    const pts = r.id ? Record.standingPoints(r) : null;
    return h('div', { class: 'card stack report-card' },
      h('div', { class: 'row', style: { alignItems: 'flex-start' } },
        h('div', { style: { flex: 1 } }, h('div', { class: 'tiny bold', style: { color: 'var(--orange)', letterSpacing: '1.5px' } }, 'COACHMATE VOLLEYBALL'),
          h('h2', { style: { margin: '2px 0' } }, `${r.teamName} – ${r.opponent}`), h('div', { class: 'small muted' }, CM.fmtDateTime(r.date))),
        pts != null ? h('div', { style: { background: grad('#21C778', '#0DA89E'), color: '#fff', borderRadius: '12px', padding: '8px 12px', textAlign: 'center' } },
          h('b', { style: { fontSize: '22px' } }, '+' + pts), h('div', { class: 'tiny' }, 'punti')) : null),
      r.sets.length ? h('div', { class: 'row wrap', style: { gap: '6px' } }, r.sets.map((s, i) => h('span', { class: 'pill mono', style: { background: (s.us > s.them ? US : THEM) + '26' } }, `${i + 1}° ${s.us}-${s.them}`))) : null,
      rows.length ? h('div', { style: { overflowX: 'auto' } }, h('table', { class: 'report' },
        h('tr', null, ['Giocatore', 'Punti', 'Battuta\nace/err/tot', 'Ricezione\nmedia · pos.', 'Attacco\npt/err/tot', 'Eff.\natt.', 'Muri', 'Errori'].map(t => h('th', null, t))),
        rows.map(x => tr(x.name, x.stats)), tr('Squadra', tot, 'total')))
        : h('div', { class: 'small muted' }, 'Nessuna statistica registrata. Nel segnapunti scegli un giocatore e tocca il gesto (ace, ricezione, attacco…).'),
      rows.length ? h('div', { class: 'tiny muted' }, 'Ricezione: # perfetta = 3, + buona = 2, – scarsa = 1, errore = 0. «pos.» = ricezioni positive (# e +). Efficienza attacco = (punti − errori) / attacchi.') : null);
  }
  function reportText(r) {
    const S = CM.Stats;
    const lines = [`🏐 ${r.teamName} – ${r.opponent}`, CM.fmtDateTime(r.date), 'Set: ' + r.sets.map(s => `${s.us}-${s.them}`).join(', ')];
    if (r.statRows && r.statRows.length) {
      lines.push('', 'Statistiche (punti · ace · ricezione · attacco):');
      for (const x of r.statRows) lines.push(`${x.name}: ${S.points(x.stats)} pt · ${S.n(x.stats, 'ace')} ace · ric ${S.recPos(x.stats) ?? '–'}% · att ${S.n(x.stats, 'attackPoint')}/${S.attacks(x.stats)}`);
    }
    return lines.join('\n');
  }
  function reportSheet(r) {
    CM.sheet('Report partita', body => {
      body.append(reportTable(r),
        h('div', { class: 'row', style: { gap: '10px' } },
          CM.gradButton('Condividi', 'share', ['#21C778', '#0DA89E'], () => CM.shareText(reportText(r), 'Report partita'), true),
          CM.gradButton('Stampa / PDF', 'doc', ['#8552FA', '#1F6BFA'], () => printReport(r), true)));
    });
  }
  function printReport(r) {
    const w = window.open('', '_blank');
    if (!w) { CM.toast('Consenti le finestre popup per stampare', 'warn'); return; }
    const table = reportTable(r);
    w.document.write(`<!doctype html><html lang="it"><head><meta charset="utf-8"><title>Report ${r.teamName} – ${r.opponent}</title>
      <link rel="stylesheet" href="${location.href.split('#')[0].replace(/index\.html$/, '')}css/style.css"><style>body{background:#fff;color:#000;padding:20px} body::before{display:none}</style></head><body></body></html>`);
    w.document.body.appendChild(w.document.importNode(table, true));
    w.document.close();
    setTimeout(() => w.print(), 600);
  }

  // =================== STORICO ===================
  function renderHistory() {
    const p = page('Storico partite');
    const draw = () => {
      p.innerHTML = '';
      const hist = Store.data.history;
      if (!hist.length) {
        p.appendChild(h('div', { class: 'card', style: { textAlign: 'center', padding: '40px 20px' } }, h('div', { class: 'muted' }, icon('list', 46)),
          h('h3', null, 'Nessuna partita'), h('div', { class: 'muted small' }, 'Le partite giocate con il segnapunti compariranno qui.')));
        return;
      }
      const box = (v, l, c) => h('div', { style: { flex: 1, background: grad(c[0], c[1]), color: '#fff', borderRadius: '18px', padding: '14px 4px', textAlign: 'center', boxShadow: `0 6px 14px ${c[0]}55` } },
        h('div', { style: { fontSize: '28px', fontWeight: 900 } }, v), h('div', { class: 'tiny bold' }, l));
      p.appendChild(h('div', { class: 'stack' },
        h('div', { class: 'row', style: { gap: '8px' } }, box(Store.wins(), 'Vinte', ['#21C778', '#0DA89E']), box(Store.losses(), 'Perse', ['#FA4278', '#FF8C1F']),
          box(Store.standingPoints(), 'Punti', ['#FF8C1F', '#FFCC1A']), box(hist.length, 'Totali', [US, '#0DC7F2'])),
        h('div', { class: 'list' }, hist.map(r => {
          const won = Record.won(r), lost = Record.lost(r), pts = Record.standingPoints(r);
          const letter = r.interrupted ? '–' : (won ? 'V' : (lost ? 'S' : 'P'));
          const c = r.interrupted ? ['#8E93A3', '#B0B4C0'] : (won ? ['#21C778', '#0DA89E'] : (lost ? ['#FA4278', '#ED3845'] : [US, '#0DC7F2']));
          return h('div', { class: 'list-row' },
            h('button', { style: { display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0, textAlign: 'left' }, onclick: () => reportSheet(r) },
              h('span', { class: 'icon-badge', style: { width: '40px', height: '40px', background: grad(c[0], c[1]), fontWeight: 900, fontSize: '18px' } }, letter),
              h('div', { style: { flex: 1, minWidth: 0 } }, h('div', { class: 'bold' }, `${r.teamName} – ${r.opponent}`),
                h('div', { class: 'small muted mono' }, r.sets.map(s => `${s.us}-${s.them}`).join('  ·  ')),
                h('div', { class: 'tiny muted row', style: { gap: '6px' } }, CM.fmtDateTime(r.date),
                  r.training ? h('span', { class: 'tag', style: { background: '#8552FA33', color: 'var(--purple)' } }, 'allenamento') : null,
                  r.interrupted ? h('span', { class: 'tag', style: { background: '#FF8C1F33', color: 'var(--orange)' } }, 'interrotta') : null)),
              h('div', { style: { textAlign: 'right' } }, h('div', { style: { fontSize: '22px', fontWeight: 900 } }, `${Record.setsUs(r)}-${Record.setsThem(r)}`),
                pts != null ? h('div', { class: 'tiny bold', style: { color: 'var(--green)' } }, `+${pts} pt`) : null,
                r.statRows ? h('span', { style: { color: 'var(--purple)' } }, icon('chart', 14)) : null)),
            h('button', { class: 'circle-btn', style: { color: 'var(--red)' }, 'aria-label': 'Elimina', onclick: () => CM.confirmDialog('Eliminare la partita?', `${r.teamName} – ${r.opponent}`, 'Elimina', () => {
              Store.data.history = Store.data.history.filter(x => x !== r); Store.commit(); draw(); }) }, icon('trash', 16)));
        }))));
    };
    draw();
  }

  CM.viewRegistrars = CM.viewRegistrars || [];
  CM.viewRegistrars.push(R => {
    R.add('/match', renderMatch);
    R.add('/match/fixture/:id', id => { if (Store.data.currentMatch) renderMatch(); else renderSetup(id); });
    R.add('/history', renderHistory);
  });
  Object.assign(CM, { rulesEditor, reportSheet });
})(window);
