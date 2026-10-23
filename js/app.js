/* CoachMate – avvio, home e lavagna tattica */
(function (global) {
  'use strict';
  const CM = global.CM;
  const { h, icon, iconBadge, grad, Router, page, Store, Team, Player, Match, Record } = CM;

  // =================== HOME ===================
  function tile(route, title, subtitle, ic, colors) {
    return h('button', { class: 'tile', style: { background: grad(colors[0], colors[1]) }, onclick: () => Router.go(route) },
      h('div', { class: 'tile-bg' }, icon(ic)),
      h('div', { class: 'tile-icon', style: { color: colors[0] } }, icon(ic, 22)),
      h('div', null, h('b', null, title), h('small', null, subtitle)));
  }

  function renderHome() {
    const p = page('CoachMate', { noBar: true });
    p.style.paddingTop = 'calc(var(--safe-top) + 16px)';
    const d = Store.data, t = Store.team;
    const hero = h('button', { class: 'hero', onclick: () => Router.go('/team/' + t.id) },
      h('div', { class: 'ball-bg' }, icon('ball', 200)),
      h('div', { class: 'row' }, h('span', { class: 'brand' }, 'COACHMATE VOLLEYBALL'), h('span', { class: 'spacer' }), icon('pencil', 20)),
      h('div', { class: 'team-name' }, t.name),
      t.championship ? h('div', { style: { opacity: 0.8, fontWeight: 600 } }, t.championship) : null,
      h('div', { class: 'row wrap', style: { gap: '6px', marginTop: '10px' } },
        h('span', { class: 'pill' }, t.system), h('span', { class: 'pill' }, t.useLibero ? 'Libero' : 'No libero'),
        h('span', { class: 'pill' }, `${t.players.length} atleti`), t.mixed ? h('span', { class: 'pill' }, t.mixed.name) : null),
      h('div', { class: 'stats' },
        h('div', null, h('b', null, Store.wins()), h('span', { style: { color: '#4BE39A' } }, 'Vinte')),
        h('div', null, h('b', null, Store.losses()), h('span', { style: { color: '#FF7AA2' } }, 'Perse')),
        h('div', null, h('b', null, Store.standingPoints()), h('span', { style: { color: '#FFD84D' } }, 'Punti')),
        h('div', null, h('b', null, d.history.length), h('span', { style: { color: '#5FE0FF' } }, 'Partite'))));

    let banner = null;
    const m = d.currentMatch;
    if (m) {
      banner = h('button', { class: 'banner', style: { background: grad('#ED3845', '#FF8C1F') }, onclick: () => Router.go('/match') },
        h('span', { class: 'icon-badge', style: { width: '46px', height: '46px', background: 'rgba(255,255,255,0.25)', borderRadius: '50%' } }, icon('play', 20)),
        h('div', { style: { flex: 1, minWidth: 0 } },
          h('div', { class: 'tiny bold', style: { letterSpacing: '1px', opacity: 0.85 } }, m.training ? 'ALLENAMENTO IN CORSO' : 'PARTITA IN CORSO'),
          h('div', { class: 'bold' }, `${m.teamName} vs ${m.opponent}`),
          h('div', { class: 'small mono bold', style: { opacity: 0.9 } }, `Set ${Match.setNumber(m)} · ${m.us}–${m.them} · set ${Match.setsUs(m)}-${Match.setsThem(m)}`)),
        icon('chevron', 22));
    } else {
      const f = Store.nextFixture();
      if (f) {
        const dt = new Date(f.date);
        banner = h('button', { class: 'banner', style: { background: grad('#8552FA', '#1F6BFA') }, onclick: () => Router.go('/fixture/' + f.id) },
          h('div', { style: { width: '54px', height: '54px', borderRadius: '14px', background: 'rgba(255,255,255,0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' } },
            h('b', { style: { fontSize: '22px', lineHeight: 1 } }, dt.getDate()), h('span', { class: 'tiny bold' }, dt.toLocaleDateString('it-IT', { month: 'short' }).toUpperCase())),
          h('div', { style: { flex: 1, minWidth: 0 } },
            h('div', { class: 'tiny bold', style: { letterSpacing: '1px', opacity: 0.85 } }, 'PROSSIMA PARTITA'),
            h('div', { class: 'bold' }, f.opponent ? 'vs ' + f.opponent : 'Avversario da definire'),
            h('div', { class: 'small', style: { opacity: 0.9 } }, `${dt.toLocaleString('it-IT', { weekday: 'long', hour: '2-digit', minute: '2-digit' })} · ${f.home ? 'casa' : 'trasferta'}${f.called.length ? ` · ${f.called.length} convocati` : ''}`)),
          icon('chevron', 22));
      }
    }
    const nf = Store.nextFixture();
    p.append(h('div', { class: 'stack' }, hero, banner,
      h('div', { class: 'section-title' }, 'In campo'),
      h('div', { class: 'grid-tiles' },
        tile('/board', 'Lavagna tattica', 'Rotazioni, ricezione, difesa', 'board', ['#1F6BFA', '#0DC7F2']),
        tile('/match', 'Segnapunti', m ? 'Partita in corso' : 'Statistiche e rotazioni', 'court', ['#FA4278', '#FF8C1F']),
        tile('/calendar', 'Calendario', nf ? 'Prossima: ' + CM.fmtDate(nf.date, { day: 'numeric', month: 'short' }) : 'Partite e convocazioni', 'calendar', ['#ED3845', '#FA4278']),
        tile('/history', 'Storico', `${d.history.length} partite · ${Store.standingPoints()} pt`, 'chart', ['#0DA89E', '#1F6BFA'])),
      h('div', { class: 'section-title' }, 'Allenamento'),
      h('div', { class: 'grid-tiles' },
        tile('/drills', 'Esercizi', `${d.drills.length} esercizi · ${d.plans.length} piani`, 'run', ['#FF8C1F', '#FA4278']),
        tile('/attendance', 'Presenze', 'Registro allenamenti', 'checklist', ['#21C778', '#0DA89E']),
        tile('/quiz', 'Quiz', 'Mettiti alla prova', 'brain', ['#8552FA', '#FA4278']),
        tile('/schemes', 'Schemi salvati', `${d.schemes.length} schemi`, 'stack', ['#FF8C1F', '#FFCC1A'])),
      h('div', { class: 'section-title' }, 'Gestione'),
      h('div', { class: 'grid-tiles' },
        tile('/teams', 'Squadre', `${d.teams.length} squadre`, 'group', ['#21C778', '#1F6BFA']),
        tile('/settings', 'Backup e impostazioni', 'Salva i tuoi dati', 'gear', ['#5A6275', '#0A173D']))));
  }

  // =================== LAVAGNA ===================
  const board = { sit: null, overrides: {}, arrowsFrom: null, playTimer: null, schemeName: '' };

  function teamSituation() {
    const t = Store.team;
    return Object.assign({}, board.sit, { system: t.system, useLibero: t.useLibero });
  }

  function renderBoard(schemeID) {
    const t = Store.team;
    if (schemeID) {
      const sc = Store.data.schemes.find(x => x.id === schemeID);
      if (sc) {
        board.sit = Object.assign(CM.defaultSituation(), sc.situation);
        board.overrides = CM.clone(sc.positions);
        board.schemeName = sc.name;
        board.arrowsFrom = null;
      }
    }
    if (!board.sit) { board.sit = CM.defaultSituation(); board.sit.reception = t.reception || 3; }
    stopPlay();

    const moreBtn = { icon: 'more', label: 'Menu', onclick: e => boardMenu(e.currentTarget) };
    const p = page('Lavagna tattica', { right: [moreBtn] });
    const layout = h('div', { class: 'court-layout' });
    const controls = h('div', { class: 'cl-controls' });
    const courtCol = h('div', { class: 'cl-court' });
    const info = h('div', { class: 'cl-info' });
    layout.append(controls, courtCol, info);
    p.appendChild(layout);

    const court = CM.createCourt();
    courtCol.appendChild(court.el);

    function formation() { return CM.Engine.formation(teamSituation(), Team.labeler(Store.team)); }
    function currentPositions(f) {
      const out = Object.assign({}, f.positions);
      for (const r in board.overrides) if (f.positions[r]) out[r] = board.overrides[r];
      return out;
    }

    function setSit(changes) {
      const oldF = formation();
      const oldPos = currentPositions(oldF);
      Object.assign(board.sit, changes);
      board.arrowsFrom = Store.data.settings.showArrows ? oldPos : null;
      board.overrides = {};
      refresh();
    }
    board.setSit = setSit;

    function refresh() {
      const team = Store.team, lab = Team.labeler(team), sit = teamSituation();
      const f = CM.Engine.formation(sit, lab);
      const colors = CM.PHASE_COLORS[sit.phase];
      // ---- Controlli ----
      controls.innerHTML = '';
      controls.append(
        h('div', { class: 'card tight row' },
          iconBadge(CM.PHASES.find(x => x.id === sit.phase).icon, colors, 38),
          h('div', { style: { flex: 1, minWidth: 0 } }, h('div', { class: 'bold small' }, team.name),
            h('div', { class: 'tiny muted' }, `Sistema ${team.system} · ${CM.PHASES.find(x => x.id === sit.phase).title} ${CM.Rot.name(sit.rotation)}`)),
          board.playTimer
            ? h('button', { class: 'pill', style: { background: grad('#ED3845', '#FF8C1F'), color: '#fff', padding: '8px 14px' }, onclick: () => { stopPlay(); refresh(); } }, icon('stop', 14), 'Stop')
            : h('button', { class: 'pill', style: { background: grad('#21C778', '#0DA89E'), color: '#fff', padding: '8px 14px' }, onclick: e => CM.menu(e.currentTarget, [
              { label: 'Azione in ricezione', icon: 'hand', action: () => play(false) },
              { label: 'Azione in battuta', icon: 'serve', action: () => play(true) }]) }, icon('play', 14), 'Azione')),
        h('div', { class: 'row', style: { gap: '6px' } }, CM.PHASES.map(ph => {
          const on = ph.id === sit.phase, c = CM.PHASE_COLORS[ph.id];
          return h('button', { class: 'phase-btn' + (on ? ' on' : ''), style: on ? { background: grad(c[0], c[1]) } : { color: c[0] },
            onclick: () => { stopPlay(); setSit({ phase: ph.id, step: 'iniziale' }); } }, icon(ph.icon), ph.title);
        })),
        h('div', { class: 'row', style: { gap: '6px' } },
          h('button', { class: 'circle-btn', onclick: () => setSit({ rotation: CM.Rot.prev(sit.rotation) }) }, icon('back', 18)),
          h('div', { class: 'chips', style: { flex: 1 } }, CM.Rot.all.map(k => CM.chip(CM.Rot.name(k), k === sit.rotation, colors, () => setSit({ rotation: k })))),
          h('button', { class: 'circle-btn grad', style: { background: grad(colors[0], colors[1]) }, onclick: () => setSit({ rotation: CM.Rot.next(sit.rotation) }) }, icon('rotate', 18))),
        optionBar(sit, colors));

      // ---- Campo ----
      court.update({ formation: f, overrides: board.overrides, labeler: lab, showZones: sit.phase === 'rotazione',
        showAreas: Store.data.settings.showAreas, arrowsFrom: Store.data.settings.showArrows ? board.arrowsFrom : null, interactive: true,
        onMove: (role, pt) => { board.overrides[role] = pt; court.redrawAreas(); renderInfo(); }, onEnd: () => renderInfo() });
      renderInfo();

      function renderInfo() {
        info.innerHTML = '';
        if (team.mixed) {
          const z = CM.Mixed.zoneGenders(sit, r => { const p = Team.playerFor(team, r); return p && p.gender; });
          const v = CM.Mixed.violations(z, team.mixed);
          if (v.length) info.appendChild(CM.noteCard(team.mixed.name, v.join('\n'), 'group', ['#ED3845', '#FF8C1F'], 'alert-card'));
        }
        if (Store.data.settings.showAreas && f.defenders.length) info.appendChild(CM.areaLegend(f.defenders, f.blockers, lab));
        if (f.checkOverlap) info.appendChild(CM.overlapBadge(CM.Engine.overlapViolations(currentPositions(f), sit, lab)));
        info.appendChild(CM.noteCard(`${CM.PHASES.find(x => x.id === sit.phase).title} · ${CM.Rot.name(sit.rotation)}`, f.note, 'sparkle', colors));
        info.appendChild(h('div', { class: 'row small muted' }, icon('hand', 16), h('span', { style: { flex: 1 } }, 'Trascina i giocatori per provare altre posizioni'),
          Object.keys(board.overrides).length ? h('button', { class: 'btn-plain small', onclick: () => { board.overrides = {}; board.arrowsFrom = null; refresh(); } }, 'Ripristina') : null));
        info.appendChild(CM.legend(lab, team.useLibero));
      }
    }

    function optionBar(sit, colors) {
      const lbl = t => h('div', { class: 'tiny bold muted', style: { letterSpacing: '0.6px', margin: '2px 4px 0' } }, t.toUpperCase());
      const stepPicker = after => h('div', { class: 'row', style: { gap: '6px' } },
        CM.chip('Schieramento', sit.step === 'iniziale', colors, () => setSit({ step: 'iniziale' })),
        CM.chip(after, sit.step === 'dopo', colors, () => setSit({ step: 'dopo' })),
        h('button', { class: 'circle-btn grad', style: { background: grad(colors[0], colors[1]) }, onclick: () => setSit({ step: sit.step === 'iniziale' ? 'dopo' : 'iniziale' }) },
          icon(sit.step === 'iniziale' ? 'play' : 'undo', 16)));
      const box = h('div', { class: 'stack', style: { gap: '8px' } });
      if (sit.phase === 'battuta') box.append(stepPicker('Dopo la battuta'));
      if (sit.phase === 'ricezione') {
        box.append(stepPicker('Dopo la ricezione'));
        if (sit.step === 'iniziale') box.append(lbl('Ricevitori'), CM.chipPicker([2, 3, 4].map(n => ({ label: 'A ' + n, value: n })), sit.reception, v => setSit({ reception: v }), colors));
      }
      if (sit.phase === 'difesa') {
        box.append(lbl('Schema difensivo'), CM.chipPicker(CM.DEFENSES.map(d => ({ label: d.title, value: d.id })), sit.defense, v => setSit({ defense: v }), colors));
        if (sit.defense !== 'freeBall') {
          box.append(lbl('Attacco avversario da'), CM.chipPicker([4, 3, 2].map(z => ({ label: 'Posto ' + z, value: z })), sit.attack, v => setSit({ attack: v }), colors),
            h('div', { class: 'card tight row' }, h('span', { class: 'bold small', style: { flex: 1 } }, 'Muro a 3'), CM.toggle(sit.tripleBlock, v => setSit({ tripleBlock: v }))));
        }
      }
      if (sit.phase === 'copertura') {
        const front = CM.Engine.setterInFront(sit);
        box.append(lbl('Nostro attacco da'), CM.chipPicker([4, 3, 2].map(z => ({ label: z === 2 && front ? 'Zona 1' : 'Posto ' + z, value: z })), sit.attack, v => setSit({ attack: v }), colors));
      }
      if (sit.phase === 'rotazione') {
        const team = Store.team;
        box.append(h('div', { class: 'card tight row' }, icon('swap', 18), h('span', { class: 'small bold', style: { flex: 1 } }, 'Libero al posto del centrale in seconda linea'),
          CM.toggle(team.useLibero, v => { team.useLibero = v; Store.commit(); setSit({}); })));
      }
      return box;
    }

    function play(serving) {
      stopPlay();
      const frames = serving
        ? [['battuta', 'iniziale', 4], ['battuta', 'dopo', 4], ['difesa', 'iniziale', 4], ['copertura', 'iniziale', 4]]
        : [['ricezione', 'iniziale', 4], ['ricezione', 'dopo', 4], ['copertura', 'iniziale', 4], ['difesa', 'iniziale', 4]];
      if (board.sit.defense === 'freeBall') board.sit.defense = 'perimetrale';
      let i = 0;
      const step = () => {
        if (i >= frames.length) { stopPlay(); refresh(); return; }
        const [phase, st, attack] = frames[i++];
        setSit({ phase, step: st, attack });
      };
      board.playTimer = setInterval(step, 2800);
      step();
    }

    function boardMenu(anchor) {
      const st = Store.data.settings;
      CM.menu(anchor, [
        { label: 'Salva schema', icon: 'download', action: saveScheme },
        { label: 'Esporta immagine', icon: 'share', action: () => exportImage(court) },
        'sep',
        { label: (st.showArrows ? '✓ ' : '') + 'Frecce dei movimenti', icon: 'swap', action: () => { st.showArrows = !st.showArrows; Store.commit(); refresh(); } },
        { label: (st.showAreas ? '✓ ' : '') + 'Zone di competenza', icon: 'board', action: () => { st.showAreas = !st.showAreas; Store.commit(); refresh(); } },
        'sep',
        ...Store.data.teams.map(tm => ({ label: (tm.id === Store.data.selectedTeamID ? '✓ ' : '') + `${tm.name} (${tm.system})`, icon: 'group',
          action: () => { Store.data.selectedTeamID = tm.id; Store.commit(); setSit({}); } }))
      ]);
    }

    function saveScheme() {
      let name = board.schemeName || `${CM.PHASES.find(x => x.id === board.sit.phase).title} ${CM.Rot.name(board.sit.rotation)}`;
      CM.sheet('Salva schema', body => {
        body.append(CM.formGroup(null, [CM.formRow('Nome', CM.textInput(name, 'Nome dello schema', v => { name = v; }))],
          'Salva le posizioni attuali, anche quelle spostate a mano.'));
      }, { action: { label: 'Salva', run: () => {
        const f = formation();
        Store.data.schemes.unshift({ id: CM.uid(), name: name.trim() || 'Schema', date: new Date().toISOString(),
          situation: CM.clone(teamSituation()), positions: currentPositions(f) });
        board.schemeName = name;
        Store.commit(); CM.toast('Schema salvato');
      } } });
    }

    refresh();
  }

  function stopPlay() { if (board.playTimer) { clearInterval(board.playTimer); board.playTimer = null; } }

  async function exportImage(court) {
    try {
      const blob = await CM.courtToPNG(court.svg);
      await CM.shareOrDownload(`CoachMate-${CM.Rot.name(board.sit.rotation)}.png`, blob);
    } catch (e) { CM.toast('Esportazione non riuscita', 'warn'); }
  }

  // =================== AVVIO ===================
  function showSplash() {
    const sp = h('div', { class: 'splash', style: { backgroundImage: 'url(img/splash.jpg)' } });
    document.body.appendChild(sp);
    const close = () => { sp.classList.add('out'); setTimeout(() => { sp.remove(); maybeOnboarding(); }, 600); };
    sp.addEventListener('click', close);
    setTimeout(close, 2300);
  }

  function maybeOnboarding() {
    if (Store.data.settings.onboardingDone) return;
    const pages = [
      ['board', 'Lavagna tattica', 'Rotazioni per 5-1, 4-2 e 6-2, battuta, ricezione, difesa con zone di competenza e coperture. Trascina i giocatori: l\'app controlla i falli di posizione.', ['#1F6BFA', '#0DC7F2']],
      ['court', 'Segnapunti intelligente', 'Un tocco per punto: la rotazione avanza da sola e vedi sempre chi batte e dove si schiera la squadra. Statistiche e report a fine gara.', ['#FA4278', '#FF8C1F']],
      ['group', 'La tua squadra', 'Rosa, formazione, regole del misto (4+2, 3+3…), calendario con convocazioni via WhatsApp e registro presenze.', ['#21C778', '#0DA89E']],
      ['run', 'Allenamenti', 'Libreria di esercizi, piani di allenamento con timer e quiz per far imparare le rotazioni a tutta la squadra.', ['#8552FA', '#FA4278']]
    ];
    let i = 0;
    const ob = h('div', { class: 'onboarding' });
    const done = () => { Store.data.settings.onboardingDone = true; Store.commit(); ob.remove(); };
    const draw = () => {
      const [ic, title, text, c] = pages[i];
      ob.innerHTML = '';
      ob.append(h('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' } },
        h('div', { class: 'ob-icon', style: { background: grad(c[0], c[1]) } }, icon(ic)),
        h('h2', null, title), h('p', { style: { opacity: 0.85, fontSize: '17px', maxWidth: '460px', margin: '0 auto' } }, text)),
        h('div', { class: 'ob-dots' }, pages.map((_, k) => h('i', { class: k === i ? 'on' : '' }))),
        CM.gradButton(i < pages.length - 1 ? 'Avanti' : 'Inizia', null, ['#FF8C1F', '#FA4278'], () => { if (i < pages.length - 1) { i++; draw(); } else done(); }),
        h('button', { class: 'btn-plain', style: { color: 'rgba(255,255,255,0.7)', marginTop: '8px' }, onclick: done }, 'Salta'));
    };
    draw();
    document.body.appendChild(ob);
  }

  function start() {
    Store.load();
    Router.add('/', renderHome);
    Router.add('/board', () => renderBoard());
    Router.add('/board/scheme/:id', id => renderBoard(id));
    (CM.viewRegistrars || []).forEach(f => f(Router));
    window.addEventListener('hashchange', () => { stopPlay(); Router.render(); });
    Router.render();
    showSplash();
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('sw.js').catch(() => { });
    }
  }

  Object.assign(CM, { start, renderHome, board });
  document.addEventListener('DOMContentLoaded', start);
})(window);
