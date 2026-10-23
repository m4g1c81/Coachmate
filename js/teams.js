/* CoachMate – squadre, rosa, formazione, misto */
(function (global) {
  'use strict';
  const CM = global.CM;
  const { h, icon, iconBadge, grad, Router, page, Store, Team, Player } = CM;

  function renderTeams() {
    const p = page('Squadre', { right: [{ icon: 'plus', label: 'Nuova squadra', onclick: () => {
      const t = CM.newTeam('Nuova squadra'); Store.data.teams.push(t); Store.data.selectedTeamID = t.id; Store.commit(); Router.go('/team/' + t.id);
    } }] });
    p.append(h('div', { class: 'list' }, Store.data.teams.map(t => {
      const sel = t.id === Store.data.selectedTeamID;
      return h('div', { class: 'list-row' },
        h('button', { style: { color: sel ? 'var(--blue)' : 'var(--text2)' }, onclick: () => { Store.data.selectedTeamID = t.id; Store.commit(); renderTeams(); }, 'aria-label': 'Squadra attiva' },
          icon(sel ? 'check' : 'person', 22)),
        h('button', { style: { display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0, textAlign: 'left' }, onclick: () => Router.go('/team/' + t.id) },
          h('span', { class: 'icon-badge', style: { width: '40px', height: '40px', background: 'linear-gradient(135deg,#0A173D,#1F6BFA)', fontWeight: 900 } }, (t.name || '?').charAt(0).toUpperCase()),
          h('div', { style: { flex: 1, minWidth: 0 } }, h('div', { class: 'bold' }, t.name),
            h('div', { class: 'small muted' }, [t.system, `${t.players.length} giocatori`, t.championship, t.mixed ? t.mixed.name : ''].filter(Boolean).join(' · '))),
          h('span', { class: 'chev' }, icon('chevron', 18))),
        Store.data.teams.length > 1 ? h('button', { class: 'circle-btn', style: { color: 'var(--red)' }, 'aria-label': 'Elimina', onclick: () => CM.confirmDialog('Eliminare la squadra?', t.name, 'Elimina', () => {
          Store.data.teams = Store.data.teams.filter(x => x.id !== t.id);
          if (Store.data.selectedTeamID === t.id) Store.data.selectedTeamID = Store.data.teams[0].id;
          Store.commit(); renderTeams();
        }) }, icon('trash', 16)) : null);
    })), h('div', { class: 'form-foot' }, 'Tocca il simbolo a sinistra per scegliere la squadra attiva: è quella usata da lavagna, segnapunti e quiz.'));
  }

  function renderTeam(id) {
    const t = Store.teamById(id);
    if (!t) { Router.go('/teams'); return; }
    const p = page(t.name || 'Squadra');
    const save = () => Store.save();
    const draw = () => {
      const y = window.scrollY;
      p.innerHTML = '';
      const lab = Team.labeler(t);
      const roles = CM.ROLES.filter(r => t.useLibero || r !== 'L');
      const court = CM.createCourt();
      court.update({ formation: CM.Engine.formation(Object.assign(CM.defaultSituation(), { system: t.system, rotation: t.startRotation || 0, useLibero: t.useLibero }), lab),
        labeler: lab, showZones: true, showAreas: false, interactive: false, noAnim: true });
      const playerOpts = [{ label: '—', value: null }, ...t.players.map(pl => ({ label: Player.listName(pl), value: pl.id }))];

      // Rosa
      const rosterRows = t.players.map(pl => h('div', { class: 'form-row', style: { gap: '8px' } },
        h('input', { type: 'number', class: 'num-input', placeholder: 'N°', value: pl.number ?? '', oninput: e => { pl.number = e.target.value === '' ? null : +e.target.value; save(); } }),
        h('input', { type: 'text', class: 'left', placeholder: 'Nome', value: pl.name, style: { flex: 1, textAlign: 'left' }, oninput: e => { pl.name = e.target.value; save(); }, onchange: () => draw() }),
        CM.select(CM.PLAYER_ROLES.map(r => ({ label: r, value: r })), pl.role, v => { pl.role = v; save(); }),
        t.mixed ? h('button', { class: 'gender-btn', style: { background: pl.gender === 'M' ? 'var(--blue)' : (pl.gender === 'F' ? 'var(--pink)' : '#9AA0AE') },
          onclick: () => { pl.gender = pl.gender === null || pl.gender === undefined ? 'M' : (pl.gender === 'M' ? 'F' : null); save(); draw(); } }, pl.gender || '?') : null,
        h('button', { class: 'circle-btn', style: { color: 'var(--red)', width: '30px', height: '30px' }, 'aria-label': 'Elimina', onclick: () => {
          t.players = t.players.filter(x => x !== pl);
          for (const r in t.lineup) if (t.lineup[r] === pl.id) delete t.lineup[r];
          if (t.libero2 === pl.id) t.libero2 = null;
          save(); draw();
        } }, icon('trash', 14))));
      rosterRows.push(h('button', { class: 'form-row btn-plain', style: { width: '100%' }, onclick: () => { t.players.push(CM.newPlayer()); save(); draw();
        setTimeout(() => { const ins = p.querySelectorAll('input.left'); ins[ins.length - 1] && ins[ins.length - 1].focus(); }, 50); } }, icon('plus', 18), 'Aggiungi giocatore'));

      // Formazione
      const lineupRows = roles.map(r => h('div', { class: 'form-row' }, CM.roleDot(r, t.system, 24), h('label', { class: 'small' }, CM.Role.fullName(r, t.system)),
        CM.select(playerOpts, t.lineup[r] || null, v => { if (v) t.lineup[r] = v; else delete t.lineup[r]; save(); draw(); })));
      if (t.useLibero) lineupRows.push(h('div', { class: 'form-row' }, CM.roleDot('L', t.system, 24), h('label', { class: 'small' }, 'Secondo libero'),
        CM.select(playerOpts.filter(o => o.value !== t.lineup.L), t.libero2 || null, v => { t.libero2 = v; save(); })));
      lineupRows.push(
        h('button', { class: 'form-row btn-plain', style: { width: '100%' }, disabled: !t.players.length, onclick: () => { autoFill(t); save(); draw(); } }, icon('wand', 18), 'Compila in automatico dai ruoli'),
        h('button', { class: 'form-row btn-plain danger', style: { width: '100%' }, disabled: !Object.keys(t.lineup).length, onclick: () => CM.confirmDialog('Togliere tutti i giocatori dalla formazione?',
          'I giocatori restano nella rosa: vengono solo tolti dai ruoli in campo.', 'Svuota formazione', () => { t.lineup = {}; t.libero2 = null; save(); draw(); }) }, icon('trash', 18), 'Svuota formazione'),
        CM.formRow('Rotazione di partenza', CM.select(CM.Rot.all.map(k => ({ label: CM.Rot.name(k), value: k })), t.startRotation || 0, v => { t.startRotation = v; save(); draw(); })),
        h('div', { style: { padding: '10px' } }, h('div', { style: { maxWidth: '360px', margin: '0 auto' } }, court.el)));
      if (t.mixed) {
        const probs = CM.Mixed.checkAll(t.system, t.useLibero, t.mixed, r => { const pl = Team.playerFor(t, r); return pl && pl.gender; });
        lineupRows.push(h('div', { class: 'form-row', style: { display: 'block' } }, probs.length
          ? [h('div', { class: 'bold small', style: { color: 'var(--red)' } }, '⚠️ Controllo misto'), probs.map(x => h('div', { class: 'tiny' }, '• ' + x))]
          : h('div', { class: 'bold small', style: { color: 'var(--green)' } }, '✓ Regole del misto rispettate in tutte le 6 rotazioni')));
      }

      p.append(h('div', { class: 'stack' },
        CM.formGroup('Squadra', [
          h('div', { class: 'form-row' }, CM.textInput(t.name, 'Nome', v => { t.name = v; save(); }, 'left')),
          h('div', { class: 'form-row' }, CM.textInput(t.championship, 'Campionato (es. CSEN misto, 2ª Divisione)', v => { t.championship = v; save(); }, 'left')),
          CM.formRow('Sistema di gioco', CM.select(CM.SYSTEMS.map(x => ({ label: x, value: x })), t.system, v => { t.system = v; save(); draw(); })),
          h('div', { class: 'form-row small muted' }, CM.SYSTEM_DESC[t.system]),
          CM.formRow('Si gioca con il libero', CM.toggle(t.useLibero, v => { t.useLibero = v; save(); draw(); })),
          CM.formRow('Ricezione abituale', CM.select([2, 3, 4].map(n => ({ label: 'A ' + n, value: n })), t.reception || 3, v => { t.reception = v; save(); }))
        ]),
        mixedGroup(t, save, draw),
        CM.formGroup(`Rosa (${t.players.length})`, rosterRows, t.mixed
          ? 'Inserisci anche le riserve. Tocca il cerchio colorato per indicare il sesso: M (uomo) o F (donna).'
          : 'Inserisci anche le riserve: serviranno per le sostituzioni nel segnapunti.'),
        CM.formGroup('Formazione titolare', lineupRows, 'Regole 2026/27: fino a 14 atleti a referto, con 2 liberi. S1 è la banda che in P1 sta in zona 2 (accanto al palleggiatore), C2 il centrale in zona 3. Nel 4-2 e nel 6-2 il posto dell\'opposto è del secondo palleggiatore (P2).'),
        CM.rulesEditor(t.rules, () => { save(); draw(); })));
      window.scrollTo(0, y);
    };
    draw();
  }

  function mixedGroup(t, save, draw) {
    const rows = [CM.formRow('Squadra mista', CM.toggle(!!t.mixed, v => { t.mixed = v ? CM.clone(CM.Mixed.presets.csen42) : null; save(); draw(); }))];
    if (t.mixed) {
      const mx = t.mixed;
      const set = (k, v) => { mx[k] = v; save(); draw(); };
      rows.push(
        h('div', { class: 'form-row' }, h('button', { class: 'btn-plain', onclick: e => CM.menu(e.currentTarget, [
          { label: 'CSEN Amatori Misto 4+2', action: () => { t.mixed = CM.clone(CM.Mixed.presets.csen42); t.rules = CM.rulesFrom('csenMisto'); save(); draw(); } },
          { label: 'Misto 3+3', action: () => { t.mixed = CM.clone(CM.Mixed.presets.misto33); save(); draw(); } },
          { label: 'Misto 2+4', action: () => { t.mixed = CM.clone(CM.Mixed.presets.misto24); save(); draw(); } }]) }, '📋 Carica un formato')),
        h('div', { class: 'form-row' }, CM.textInput(mx.name, 'Nome del formato', v => { mx.name = v; save(); }, 'left')),
        CM.stepperRow(`Uomini in campo: max ${mx.maxMen}`, mx.maxMen, 0, 6, v => set('maxMen', v)),
        CM.stepperRow(`Donne in campo: min ${mx.minWomen}`, mx.minWomen, 0, 6, v => set('minWomen', v)),
        CM.stepperRow(mx.maxMenFront ? `Uomini in prima linea: max ${mx.maxMenFront}` : 'Uomini in prima linea: nessun limite', mx.maxMenFront, 0, 3, v => set('maxMenFront', v)),
        CM.formRow('Vietati 3 uomini consecutivi', CM.toggle(mx.noThreeMenInRow, v => set('noThreeMenInRow', v))),
        CM.formRow('Alternanza uomo/donna', CM.toggle(mx.alternate, v => set('alternate', v))),
        CM.formRow('Altezza rete', CM.textInput(mx.netHeight, '2,35 m', v => { mx.netHeight = v; save(); })),
        mx.note ? h('div', { class: 'form-row small muted' }, mx.note) : null);
    }
    return CM.formGroup('Misto', rows, t.mixed ? 'Il formato CSEN 4+2 segue il regolamento nazionale CSEN in Volley 2025/2026 (l\'ultimo pubblicato), con le sostituzioni FIPAV 2026/2027 (8 per set). Ogni comitato può avere varianti: controlla le indizioni del tuo torneo e modifica qui.' : null);
  }

  function autoFill(t) {
    const used = new Set(), lineup = {};
    const take = wanted => {
      for (const w of wanted) { const pl = t.players.find(x => x.role === w && !used.has(x.id)); if (pl) { used.add(pl.id); return pl.id; } }
      return null;
    };
    const plan = [['P', ['Palleggiatore']], ['O', t.system === '5-1' ? ['Opposto'] : ['Palleggiatore']], ['S1', ['Schiacciatore']], ['S2', ['Schiacciatore']],
      ['C1', ['Centrale']], ['C2', ['Centrale']], ['L', ['Libero']]];
    for (const [r, w] of plan) { if (r === 'L' && !t.useLibero) continue; const id = take(w); if (id) lineup[r] = id; }
    for (const [r] of plan) if (!lineup[r] && r !== 'L') { const id = take(['Universale', 'Schiacciatore', 'Opposto', 'Centrale', 'Palleggiatore']); if (id) lineup[r] = id; }
    t.lineup = lineup;
    if (t.useLibero) { const l2 = t.players.find(x => x.role === 'Libero' && !used.has(x.id)); t.libero2 = l2 ? l2.id : null; }
  }

  CM.viewRegistrars = CM.viewRegistrars || [];
  CM.viewRegistrars.push(R => {
    R.add('/teams', renderTeams);
    R.add('/team/:id', renderTeam);
  });
})(window);
