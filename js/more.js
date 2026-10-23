/* CoachMate – calendario, presenze, esercizi, quiz, schemi, impostazioni */
(function (global) {
  'use strict';
  const CM = global.CM;
  const { h, icon, iconBadge, grad, Router, page, Store, Team, Player, Record } = CM;

  const toLocalInput = iso => { const d = new Date(iso); const off = d.getTimezoneOffset(); return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16); };
  const fromLocalInput = v => new Date(v).toISOString();
  function defaultDate() { const d = new Date(); d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7)); d.setHours(18, 0, 0, 0); return d.toISOString(); }
  const emptyState = (ic, title, text) => h('div', { class: 'card', style: { textAlign: 'center', padding: '36px 20px' } },
    h('div', { class: 'muted' }, icon(ic, 46)), h('h3', null, title), h('div', { class: 'muted small' }, text));

  // =================== CALENDARIO ===================
  function fixtureRow(f) {
    const d = new Date(f.date), r = Store.recordFor(f);
    return h('button', { class: 'list-row', onclick: () => Router.go('/fixture/' + f.id) },
      h('div', { style: { width: '46px', height: '46px', borderRadius: '12px', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        background: f.home ? grad('#1F6BFA', '#0DC7F2') : grad('#8552FA', '#FA4278') } },
        h('b', { style: { fontSize: '18px', lineHeight: 1 } }, d.getDate()), h('span', { class: 'tiny bold' }, d.toLocaleDateString('it-IT', { month: 'short' }).toUpperCase())),
      h('div', { style: { flex: 1, minWidth: 0 } }, h('div', { class: 'bold' }, f.opponent || 'Avversario da definire'),
        h('div', { class: 'small muted' }, `${f.home ? 'Casa' : 'Trasferta'} · ${d.toLocaleString('it-IT', { weekday: 'long', hour: '2-digit', minute: '2-digit' })}`),
        f.place ? h('div', { class: 'tiny muted' }, '📍 ' + f.place) : null),
      r ? h('b', { class: 'mono', style: { color: Record.won(r) ? 'var(--green)' : (Record.lost(r) ? 'var(--red)' : 'var(--text2)') } }, `${Record.setsUs(r)}-${Record.setsThem(r)}`)
        : (f.called.length ? h('span', { class: 'small bold', style: { color: 'var(--green)' } }, `✓ ${f.called.length}`) : null),
      h('span', { class: 'chev' }, icon('chevron', 16)));
  }
  function renderCalendar() {
    const p = page('Calendario', { right: [{ icon: 'plus', label: 'Nuova partita', onclick: () => {
      const f = { id: CM.uid(), teamID: Store.team.id, date: defaultDate(), opponent: '', place: '', home: true, note: '', called: [] };
      CM.sheet('Nuova partita', body => body.append(fixtureFields(f)), { cancelLabel: 'Annulla', action: { label: 'Aggiungi', run: () => { Store.data.fixtures.push(f); Store.commit(); renderCalendar(); } } });
    } }] });
    const tid = Store.team.id, cutoff = Date.now() - 3 * 3600e3;
    const all = Store.data.fixtures.filter(f => f.teamID === tid).sort((a, b) => new Date(a.date) - new Date(b.date));
    const up = all.filter(f => new Date(f.date) >= cutoff), past = all.filter(f => new Date(f.date) < cutoff).reverse();
    if (!all.length) { p.append(emptyState('calendar', 'Calendario vuoto', 'Aggiungi le partite del campionato con il tasto +: potrai convocare i giocatori e avviare il segnapunti già pronto.')); return; }
    p.append(h('div', { class: 'stack' },
      up.length ? [h('div', { class: 'section-title' }, 'Prossime partite'), h('div', { class: 'list' }, up.map(fixtureRow))] : null,
      past.length ? [h('div', { class: 'section-title' }, 'Giocate'), h('div', { class: 'list' }, past.map(fixtureRow))] : null));
  }
  function fixtureFields(f, onChange) {
    const ch = () => onChange && onChange();
    const homeBox = h('div', { class: 'form-row' });
    const drawHome = () => { homeBox.innerHTML = ''; homeBox.append(CM.chipPicker([{ label: 'In casa', value: true }, { label: 'In trasferta', value: false }], f.home, v => { f.home = v; ch(); drawHome(); }, ['#1F6BFA', '#0DC7F2'])); };
    drawHome();
    return CM.formGroup('Partita', [
      h('div', { class: 'form-row' }, CM.textInput(f.opponent, 'Avversario', v => { f.opponent = v; ch(); }, 'left')),
      CM.formRow('Data e ora', h('input', { type: 'datetime-local', value: toLocalInput(f.date), onchange: e => { if (e.target.value) { f.date = fromLocalInput(e.target.value); ch(); } } })),
      homeBox,
      h('div', { class: 'form-row' }, CM.textInput(f.place, 'Palestra / indirizzo', v => { f.place = v; ch(); }, 'left')),
      h('div', { class: 'form-row' }, h('textarea', { class: 'left', placeholder: 'Note (es. ritrovo 30 minuti prima)', oninput: e => { f.note = e.target.value; ch(); } }, f.note || ''))]);
  }
  function renderFixture(id) {
    const f = Store.data.fixtures.find(x => x.id === id);
    if (!f) { Router.go('/calendar'); return; }
    const team = Store.teamById(f.teamID) || Store.team;
    const p = page(f.opponent || 'Partita', { right: [{ icon: 'trash', label: 'Elimina', onclick: () => CM.confirmDialog('Eliminare la partita dal calendario?', f.opponent || '', 'Elimina', () => {
      Store.data.fixtures = Store.data.fixtures.filter(x => x !== f); Store.commit(); Router.back(); }) }] });
    const draw = () => {
      const y = window.scrollY;
      p.innerHTML = '';
      const r = Store.recordFor(f);
      const called = team.players.filter(pl => f.called.includes(pl.id));
      const men = called.filter(x => x.gender === 'M').length, women = called.filter(x => x.gender === 'F').length;
      let foot = null;
      if (f.called.length > 14) foot = h('span', { style: { color: 'var(--red)' } }, `Attenzione: a referto si possono iscrivere al massimo 14 atleti (regole 2026/27). Ne hai convocati ${f.called.length}.`);
      else if (team.mixed) foot = `${team.mixed.name}: convocati ${men} uomini e ${women} donne. Servono almeno ${team.mixed.minWomen} donne in campo per tutta la partita.`;
      p.append(h('div', { class: 'stack' },
        r ? CM.formGroup('Risultato', [
          h('div', { class: 'form-row' }, h('b', { style: { flex: 1 } }, Record.won(r) ? 'Vittoria' : (Record.lost(r) ? 'Sconfitta' : 'Pareggio')), h('b', { class: 'mono', style: { fontSize: '22px' } }, `${Record.setsUs(r)}-${Record.setsThem(r)}`)),
          h('div', { class: 'form-row small muted mono' }, r.sets.map(s => `${s.us}-${s.them}`).join('  ·  ')),
          Record.standingPoints(r) != null ? CM.formRow('Punti in classifica', h('b', null, '+' + Record.standingPoints(r))) : null,
          h('button', { class: 'form-row btn-plain', style: { width: '100%' }, onclick: () => CM.reportSheet(r) }, icon('doc', 18), 'Report e statistiche')]) : null,
        fixtureFields(f, () => Store.save()),
        CM.formGroup(`Convocati (${f.called.length})`, [
          ...team.players.map(pl => {
            const on = f.called.includes(pl.id);
            return h('button', { class: 'form-row', style: { width: '100%', textAlign: 'left' }, onclick: () => {
              if (on) f.called = f.called.filter(x => x !== pl.id); else f.called.push(pl.id); Store.save(); draw(); } },
              h('span', { style: { color: on ? 'var(--green)' : 'var(--text2)' } }, icon(on ? 'check' : 'person', 20)), h('span', { style: { flex: 1 } }, Player.listName(pl)),
              pl.gender ? h('b', { class: 'small', style: { color: pl.gender === 'M' ? 'var(--blue)' : 'var(--pink)' } }, pl.gender) : null,
              h('span', { class: 'tiny muted' }, pl.role));
          }),
          team.players.length ? h('div', { class: 'form-row' }, h('button', { class: 'btn-plain', onclick: () => { f.called = team.players.map(x => x.id); Store.save(); draw(); } }, 'Tutti'),
            h('span', { class: 'spacer' }), h('button', { class: 'btn-plain', onclick: () => { f.called = []; Store.save(); draw(); } }, 'Nessuno'))
            : h('div', { class: 'form-row small muted' }, 'Aggiungi i giocatori nella sezione Squadre.')], foot),
        CM.gradButton('Invia convocazione (WhatsApp…)', 'send', ['#21C778', '#0DA89E'], () => CM.shareText(CM.fixtureMessage(f, team), 'Convocazione')),
        Store.data.currentMatch ? h('div', { class: 'small muted', style: { textAlign: 'center' } }, 'C\'è già una partita in corso nel segnapunti.')
          : CM.gradButton('Prepara il segnapunti', 'court', ['#FA4278', '#FF8C1F'], () => Router.go('/match/fixture/' + f.id)),
        h('div', { class: 'form-foot' }, 'Il segnapunti userà questo avversario e, se hai convocato qualcuno, solo i convocati per i cambi. Il risultato verrà collegato a questa partita.')));
      window.scrollTo(0, y);
    };
    draw();
  }

  // =================== PRESENZE ===================
  function renderAttendance() {
    const t = Store.team;
    const p = page('Presenze', { right: [{ icon: 'plus', label: 'Nuovo allenamento', onclick: () => {
      const s = { id: CM.uid(), teamID: t.id, date: new Date().toISOString(), present: [], note: '' };
      Store.data.sessions.push(s); Store.commit(); Router.go('/session/' + s.id);
    } }] });
    const list = Store.data.sessions.filter(s => s.teamID === t.id).sort((a, b) => new Date(b.date) - new Date(a.date));
    const rate = id => list.length ? list.filter(s => s.present.includes(id)).length / list.length : 0;
    const out = h('div', { class: 'stack' });
    if (list.length && t.players.length) {
      out.append(h('div', { class: 'section-title' }, `Percentuale di presenza (${list.length} allenamenti)`),
        h('div', { class: 'list' }, t.players.slice().sort((a, b) => rate(b.id) - rate(a.id)).map(pl => {
          const r = rate(pl.id), c = r >= 0.75 ? 'var(--green)' : (r >= 0.5 ? 'var(--orange)' : 'var(--red)');
          return h('div', { class: 'list-row' }, h('span', { style: { flex: 1 } }, Player.listName(pl)),
            h('div', { style: { width: '90px', height: '8px', borderRadius: '4px', background: 'var(--fill)', overflow: 'hidden' } }, h('div', { style: { width: (r * 100) + '%', height: '100%', background: c } })),
            h('b', { class: 'mono small', style: { width: '44px', textAlign: 'right' } }, Math.round(r * 100) + '%'));
        })));
    }
    out.append(h('div', { class: 'section-title' }, 'Allenamenti'));
    if (!list.length) out.append(emptyState('checklist', 'Nessun allenamento', 'Tocca + per registrare le presenze dell\'allenamento di oggi.'));
    else out.append(h('div', { class: 'list' }, list.map(s => h('button', { class: 'list-row', onclick: () => Router.go('/session/' + s.id) },
      iconBadge('checklist', ['#21C778', '#0DA89E'], 34),
      h('div', { style: { flex: 1 } }, h('div', { class: 'bold small' }, CM.fmtDate(s.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })),
        h('div', { class: 'tiny muted' }, `${s.present.length} presenti su ${t.players.length}${s.note ? ' · ' + s.note : ''}`)),
      h('span', { class: 'chev' }, icon('chevron', 16))))));
    p.append(out);
  }
  function renderSession(id) {
    const s = Store.data.sessions.find(x => x.id === id);
    if (!s) { Router.go('/attendance'); return; }
    const t = Store.teamById(s.teamID) || Store.team;
    const p = page('Allenamento', { right: [{ icon: 'trash', label: 'Elimina', onclick: () => CM.confirmDialog('Eliminare questo allenamento?', CM.fmtDate(s.date), 'Elimina', () => {
      Store.data.sessions = Store.data.sessions.filter(x => x !== s); Store.commit(); Router.back(); }) }] });
    const draw = () => {
      const y = window.scrollY;
      p.innerHTML = '';
      p.append(h('div', { class: 'stack' },
        CM.formGroup(null, [
          CM.formRow('Data', h('input', { type: 'date', value: toLocalInput(s.date).slice(0, 10), onchange: e => { if (e.target.value) { s.date = new Date(e.target.value + 'T19:00').toISOString(); Store.save(); } } })),
          h('div', { class: 'form-row' }, h('textarea', { class: 'left', placeholder: 'Note (es. lavoro su ricezione)', oninput: e => { s.note = e.target.value; Store.save(); } }, s.note || ''))]),
        CM.formGroup(`Presenti: ${s.present.length} su ${t.players.length}`, [
          ...t.players.map(pl => {
            const on = s.present.includes(pl.id);
            return h('button', { class: 'form-row', style: { width: '100%', textAlign: 'left' }, onclick: () => {
              if (on) s.present = s.present.filter(x => x !== pl.id); else s.present.push(pl.id); Store.save(); draw(); } },
              h('span', { style: { color: on ? 'var(--green)' : 'var(--text2)' } }, icon(on ? 'check' : 'person', 20)), h('span', { style: { flex: 1 } }, Player.listName(pl)),
              h('span', { class: 'small bold', style: { color: on ? 'var(--green)' : 'var(--red)' } }, on ? 'presente' : 'assente'));
          }),
          h('div', { class: 'form-row' }, h('button', { class: 'btn-plain', onclick: () => { s.present = t.players.map(x => x.id); Store.save(); draw(); } }, 'Tutti presenti'),
            h('span', { class: 'spacer' }), h('button', { class: 'btn-plain', onclick: () => { s.present = []; Store.save(); draw(); } }, 'Azzera'))])));
      window.scrollTo(0, y);
    };
    draw();
  }

  // =================== ESERZI E PIANI ===================
  let drillsTab = 'esercizi';
  const cat = id => CM.DRILL_CATEGORIES.find(c => c.id === id) || CM.DRILL_CATEGORIES[7];
  function renderDrills() {
    const p = page('Esercizi', { right: [{ icon: 'plus', label: 'Nuovo', onclick: () => {
      if (drillsTab === 'esercizi') {
        const d = { id: CM.uid(), name: 'Nuovo esercizio', category: 'gioco', minutes: 10, players: '', description: '', schemeID: null, builtIn: false };
        Store.data.drills.push(d); Store.commit(); Router.go('/drill/' + d.id);
      } else {
        const pl = { id: CM.uid(), name: 'Allenamento ' + CM.fmtDate(new Date().toISOString(), { day: 'numeric', month: 'short' }), items: [] };
        Store.data.plans.push(pl); Store.commit(); Router.go('/plan/' + pl.id);
      }
    } }] });
    const out = h('div', { class: 'stack' }, CM.chipPicker([{ label: 'Esercizi', value: 'esercizi' }, { label: 'Allenamenti', value: 'piani' }], drillsTab, v => { drillsTab = v; renderDrills(); }, ['#FF8C1F', '#FA4278']));
    if (drillsTab === 'esercizi') {
      for (const c of CM.DRILL_CATEGORIES) {
        const items = Store.data.drills.filter(d => d.category === c.id);
        if (!items.length) continue;
        out.append(h('div', { class: 'section-title' }, c.title), h('div', { class: 'list' }, items.map(d => h('button', { class: 'list-row', onclick: () => Router.go('/drill/' + d.id) },
          iconBadge(c.icon, c.colors, 36),
          h('div', { style: { flex: 1, minWidth: 0 } }, h('div', { class: 'bold small' }, d.name), h('div', { class: 'tiny muted' }, `${d.minutes} min${d.players ? ' · ' + d.players : ''}`)),
          d.schemeID ? h('span', { style: { color: 'var(--blue)' } }, icon('board', 16)) : null, h('span', { class: 'chev' }, icon('chevron', 16))))));
      }
    } else {
      if (!Store.data.plans.length) out.append(emptyState('timer', 'Nessun allenamento', 'Componi un allenamento con gli esercizi e i tempi, poi avvialo: il timer ti guida blocco per blocco.'));
      else out.append(h('div', { class: 'list' }, Store.data.plans.map(pl => h('button', { class: 'list-row', onclick: () => Router.go('/plan/' + pl.id) },
        iconBadge('timer', ['#FF8C1F', '#FA4278'], 36),
        h('div', { style: { flex: 1 } }, h('div', { class: 'bold small' }, pl.name), h('div', { class: 'tiny muted' }, `${pl.items.length} blocchi · ${pl.items.reduce((s, i) => s + i.minutes, 0)} min`)),
        h('span', { class: 'chev' }, icon('chevron', 16))))));
    }
    p.append(out);
  }
  function renderDrill(id) {
    const d = Store.data.drills.find(x => x.id === id);
    if (!d) { Router.go('/drills'); return; }
    const p = page('Esercizio', { right: [{ icon: 'trash', label: 'Elimina', onclick: () => CM.confirmDialog('Eliminare l\'esercizio?', d.name, 'Elimina', () => {
      Store.data.drills = Store.data.drills.filter(x => x !== d); Store.commit(); Router.back(); }) }] });
    const draw = () => {
      p.innerHTML = '';
      const c = cat(d.category);
      const sc = d.schemeID && Store.data.schemes.find(x => x.id === d.schemeID);
      p.append(h('div', { class: 'stack' },
        CM.formGroup(null, [
          h('div', { class: 'form-row' }, iconBadge(c.icon, c.colors, 40), CM.textInput(d.name, 'Nome esercizio', v => { d.name = v; Store.save(); }, 'left')),
          CM.formRow('Fondamentale', CM.select(CM.DRILL_CATEGORIES.map(x => ({ label: x.title, value: x.id })), d.category, v => { d.category = v; Store.save(); draw(); })),
          CM.stepperRow(`Durata: ${d.minutes} min`, d.minutes, 1, 120, v => { d.minutes = v; Store.save(); draw(); }),
          h('div', { class: 'form-row' }, CM.textInput(d.players, 'Giocatori (es. a coppie, 6 contro 6)', v => { d.players = v; Store.save(); }, 'left'))]),
        CM.formGroup('Descrizione', [h('div', { class: 'form-row' }, h('textarea', { class: 'left', style: { minHeight: '140px' }, placeholder: 'Come si svolge, varianti, obiettivi…', oninput: e => { d.description = e.target.value; Store.save(); } }, d.description || ''))]),
        CM.formGroup('Disegno sulla lavagna', [
          CM.formRow('Schema collegato', CM.select([{ label: 'Nessuno', value: null }, ...Store.data.schemes.map(x => ({ label: x.name, value: x.id }))], d.schemeID || null, v => { d.schemeID = v; Store.save(); draw(); })),
          sc ? h('button', { class: 'form-row btn-plain', style: { width: '100%' }, onclick: () => Router.go('/board/scheme/' + sc.id) }, icon('board', 18), 'Apri sulla lavagna') : null],
          'Disegna le posizioni nella Lavagna tattica, salva lo schema dal menu ⋯ e collegalo qui.')));
    };
    draw();
  }
  function renderPlan(id) {
    const pl = Store.data.plans.find(x => x.id === id);
    if (!pl) { Router.go('/drills'); return; }
    const p = page('Allenamento', { right: [{ icon: 'trash', label: 'Elimina', onclick: () => CM.confirmDialog('Eliminare il piano?', pl.name, 'Elimina', () => {
      Store.data.plans = Store.data.plans.filter(x => x !== pl); Store.commit(); Router.back(); }) }] });
    let custom = { title: '', minutes: 5 };
    const draw = () => {
      p.innerHTML = '';
      const total = pl.items.reduce((s, i) => s + i.minutes, 0);
      p.append(h('div', { class: 'stack' },
        CM.formGroup(null, [h('div', { class: 'form-row' }, CM.textInput(pl.name, 'Nome', v => { pl.name = v; Store.save(); }, 'left')), CM.formRow('Durata totale', h('b', null, total + ' min'))]),
        pl.items.length ? CM.gradButton('Avvia con il timer', 'play', ['#21C778', '#0DA89E'], () => Router.go('/plan/' + pl.id + '/run')) : null,
        CM.formGroup('Blocchi', pl.items.length ? pl.items.map((it, i) => h('div', { class: 'form-row', style: { gap: '6px' } },
          h('div', { style: { display: 'flex', flexDirection: 'column' } },
            h('button', { class: 'muted', disabled: i === 0, onclick: () => { [pl.items[i - 1], pl.items[i]] = [pl.items[i], pl.items[i - 1]]; Store.save(); draw(); } }, '▲'),
            h('button', { class: 'muted', disabled: i === pl.items.length - 1, onclick: () => { [pl.items[i + 1], pl.items[i]] = [pl.items[i], pl.items[i + 1]]; Store.save(); draw(); } }, '▼')),
          h('input', { type: 'text', class: 'left', value: it.title, style: { flex: 1, textAlign: 'left' }, oninput: e => { it.title = e.target.value; Store.save(); } }),
          h('b', { class: 'mono small' }, it.minutes + "'"), CM.stepper(it.minutes, 1, 120, v => { it.minutes = v; Store.save(); draw(); }),
          h('button', { class: 'circle-btn', style: { color: 'var(--red)', width: '30px', height: '30px' }, onclick: () => { pl.items.splice(i, 1); Store.save(); draw(); } }, icon('trash', 14))))
          : [h('div', { class: 'form-row small muted' }, 'Aggiungi esercizi dalla libreria o blocchi liberi.')]),
        CM.formGroup('Aggiungi', [
          h('button', { class: 'form-row btn-plain', style: { width: '100%' }, onclick: e => CM.menu(e.currentTarget, Store.data.drills.map(d => ({
            label: `${d.name} (${d.minutes}')`, action: () => { pl.items.push({ id: CM.uid(), title: d.name, minutes: d.minutes, drillID: d.id }); Store.save(); draw(); } }))) }, icon('plus', 18), 'Scegli un esercizio dalla libreria'),
          h('div', { class: 'form-row', style: { gap: '8px' } }, h('input', { type: 'text', class: 'left', style: { flex: 1, textAlign: 'left' }, placeholder: 'Blocco libero (es. Pausa, Partitella)', value: custom.title, oninput: e => { custom.title = e.target.value; } }),
            h('b', { class: 'mono small' }, custom.minutes + "'"), CM.stepper(custom.minutes, 1, 120, v => { custom.minutes = v; draw(); })),
          h('button', { class: 'form-row btn-plain', style: { width: '100%' }, onclick: () => { pl.items.push({ id: CM.uid(), title: custom.title.trim() || 'Blocco', minutes: custom.minutes, drillID: null }); custom = { title: '', minutes: 5 }; Store.save(); draw(); } }, 'Aggiungi blocco libero')])));
    };
    draw();
  }
  let runTimer = null;
  function renderPlanRun(id) {
    const pl = Store.data.plans.find(x => x.id === id);
    if (!pl || !pl.items.length) { Router.go('/drills'); return; }
    const p = page(pl.name);
    let index = 0, remaining = pl.items[0].minutes * 60, running = true, finished = false, wake = null;
    try { navigator.wakeLock && navigator.wakeLock.request('screen').then(w => { wake = w; }).catch(() => { }); } catch (e) { }
    const go = i => {
      if (i >= pl.items.length) { finished = true; CM.haptic(400); draw(); return; }
      index = Math.max(0, i); remaining = pl.items[index].minutes * 60; CM.haptic(200); draw();
    };
    const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    const roundBtn = (ic, c, size, fn, disabled) => h('button', { disabled, onclick: fn, style: { width: size + 'px', height: size + 'px', borderRadius: '50%', background: grad(c[0], c[1]), color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 6px 14px ${c[0]}66`, opacity: disabled ? 0.4 : 1 } }, icon(ic, size * 0.4));
    let timeEl, arc, stateEl;
    const draw = () => {
      p.innerHTML = '';
      if (finished) {
        p.append(h('div', { class: 'stack', style: { textAlign: 'center', paddingTop: '60px' } }, h('div', { style: { color: 'var(--green)' } }, icon('check', 80)),
          h('h1', null, 'Allenamento finito!'), h('div', { class: 'muted' }, `${pl.items.reduce((s, i) => s + i.minutes, 0)} minuti di lavoro. Ottimo!`)));
        return;
      }
      const it = pl.items[index], next = pl.items[index + 1];
      const drill = it.drillID && Store.data.drills.find(d => d.id === it.drillID);
      const circ = 2 * Math.PI * 45;
      arc = CM.s('circle', { cx: 50, cy: 50, r: 45, fill: 'none', stroke: 'url(#rg)', 'stroke-width': 7, 'stroke-linecap': 'round', 'stroke-dasharray': circ, 'stroke-dashoffset': 0, style: 'transition: stroke-dashoffset 1s linear' });
      timeEl = h('b', null, fmt(remaining));
      stateEl = h('span', { class: 'muted' }, running ? 'in corso' : 'in pausa');
      p.append(h('div', { class: 'stack', style: { textAlign: 'center' } },
        h('div', { class: 'tiny bold', style: { color: 'var(--orange)', letterSpacing: '1.2px' } }, `BLOCCO ${index + 1} DI ${pl.items.length}`),
        h('h1', { style: { margin: 0 } }, it.title),
        h('div', { class: 'ring' }, CM.s('svg', { viewBox: '0 0 100 100' },
          CM.s('defs', null, CM.s('linearGradient', { id: 'rg' }, CM.s('stop', { offset: 0, 'stop-color': '#FF8C1F' }), CM.s('stop', { offset: 1, 'stop-color': '#FA4278' }))),
          CM.s('circle', { cx: 50, cy: 50, r: 45, fill: 'none', stroke: 'var(--fill)', 'stroke-width': 7 }), arc),
          h('div', { class: 'ring-label' }, timeEl, stateEl)),
        drill && drill.description ? h('div', { class: 'small muted', style: { maxWidth: '520px', margin: '0 auto' } }, drill.description) : null,
        next ? h('div', { class: 'bold small' }, `Dopo: ${next.title} (${next.minutes}')`) : null,
        h('div', { class: 'row', style: { justifyContent: 'center', gap: '18px' } },
          roundBtn('back', ['#0DA89E', '#0DC7F2'], 56, () => go(index - 1), index === 0),
          roundBtn(running ? 'pause' : 'play', ['#FF8C1F', '#FA4278'], 76, () => { running = !running; draw(); }),
          roundBtn('chevron', ['#0DA89E', '#0DC7F2'], 56, () => go(index + 1))),
        h('button', { class: 'btn-plain', onclick: () => { remaining += 60; tick(true); } }, '+1 minuto')));
      tick(true);
    };
    const tick = onlyDraw => {
      if (!timeEl) return;
      const total = pl.items[index].minutes * 60;
      timeEl.textContent = fmt(Math.max(0, remaining));
      const circ = 2 * Math.PI * 45;
      arc.setAttribute('stroke-dashoffset', circ * (1 - Math.min(1, remaining / total)));
    };
    if (runTimer) clearInterval(runTimer);
    runTimer = setInterval(() => {
      if (!document.body.contains(p)) { clearInterval(runTimer); try { wake && wake.release(); } catch (e) { } return; }
      if (!running || finished) return;
      if (remaining > 0) { remaining--; tick(); } else go(index + 1);
    }, 1000);
    draw();
  }

  // =================== QUIZ ===================
  const RULE_QUESTIONS = [
    ['Regole 2026/27: quante sostituzioni si possono fare per set?', ['6', '8', '10', 'Illimitate'], 1, 'Dalla stagione 2026/27 le sostituzioni passano da 6 a 8 per set, con 14 atleti a referto. Un giocatore può entrare una sola volta per set.'],
    ['Un attacco in cui la palla viene accompagnata (presa o lanciata) è…', ['Regolare se a una mano', 'Regolare se a due mani', 'Sempre fallo', 'Fallo solo in prima linea'], 2, 'Niente più attacchi accompagnati: presa o lancio, a una o a due mani, sono fallo. È consentito solo un tocco breve sul pallone.'],
    ['Dopo il primo o il secondo tocco la palla tocca il soffitto e ricade nella propria metà campo. Cosa succede?', ['Si continua a giocare', 'Punto agli avversari', 'Si ripete l\'azione', 'Decide il capitano'], 0, 'Se la palla tocca il soffitto ma resta nella metà campo della squadra che la stava giocando, il gioco continua. Se finisce nel campo avversario o fuori è fallo.'],
    ['Una doppia in palleggio che resta nel proprio campo è…', ['Sempre fallo', 'Gioco che prosegue', 'Fallo solo sul primo tocco', 'Fallo solo per il libero'], 1, 'Con le regole 2026/27 la doppia in palleggio è tollerata se la palla resta nel proprio campo; se va direttamente nell\'altro campo è fallo.'],
    ['Da quando possono muoversi i giocatori in ricezione?', ['Dal fischio dell\'arbitro', 'Dal colpo sul pallone del battitore', 'Da quando il battitore inizia il gesto del servizio', 'Dopo che la palla supera la rete'], 2, 'Il fallo di posizione resta, ma ci si può muovere appena il battitore inizia il gesto del servizio. Palleggi o rimbalzi prima della battuta non contano come inizio.'],
    ['Quanto tempo ha ogni squadra per il riscaldamento al servizio?', ['30 secondi', '60 secondi', '90 secondi', '3 minuti insieme'], 2, 'Le squadre si scaldano al servizio separatamente: 90 secondi ciascuna, mentre l\'altra aspetta il suo turno.'],
    ['Quanti atleti si possono iscrivere a referto con le regole 2026/27?', ['12', '13', '14', '16'], 2, 'Fino a 14 atleti a referto, con almeno un libero; se ne possono indicare due.'],
    ['L\'allenatore può parlare con il primo arbitro?', ['No, mai', 'Sì, per chiedere spiegazioni senza protestare', 'Solo durante i time-out', 'Solo tramite il capitano'], 1, 'L\'allenatore può rivolgersi direttamente al primo arbitro per chiedere spiegazioni su una decisione, senza protestare e senza bloccare la partita.']
  ];
  const shuffle = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  function makeQuestion(team) {
    const sys = team.system, lab = Team.labeler(team), r = Math.floor(Math.random() * 6), rn = CM.Rot.name(r);
    const build = (prompt, correct, pool, expl) => {
      const opts = shuffle([...new Set(pool.filter(x => x !== correct))]).slice(0, 3).concat([correct]);
      const sh = shuffle(opts);
      return { prompt, options: sh, correct: sh.indexOf(correct), explanation: expl };
    };
    const kinds = [0, 1, 2, 3, 5, 6, 6]; if (team.useLibero) kinds.push(4);
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    const S = o => Object.assign(CM.defaultSituation(), { system: sys, rotation: r }, o);
    if (kind === 0) {
      const map = CM.Engine.courtMap(S({ useLibero: false })), z = 1 + Math.floor(Math.random() * 6);
      return build(`In ${rn}, chi c'è in zona ${z}?`, lab(map[z]), Object.values(map).map(x => lab(x)),
        `In ${rn} → ` + [4, 3, 2, 5, 6, 1].map(k => `zona ${k}: ${lab(map[k])}`).join(', ') + '.');
    }
    if (kind === 1) {
      const srv = CM.Engine.server(S({ phase: 'battuta', useLibero: team.useLibero }));
      const pool = CM.COURT_ROLES.map(x => lab(x)); if (team.useLibero) pool.push(lab('L'));
      let e = `Batte sempre chi è in zona 1: in ${rn} è ${lab(srv)}.`;
      if (CM.Role.isMiddle(srv) && team.useLibero) e += ' È un centrale: il libero non può battere, quindi resta in campo il centrale.';
      return build(`In ${rn} la squadra è al servizio: chi batte?`, lab(srv), pool, e);
    }
    if (kind === 2) {
      const n = CM.Engine.frontAttackers(S({}));
      const e = { '5-1': 'Nel 5-1 quando il palleggiatore è in prima linea (P4, P3, P2) gli attaccanti a rete sono 2, quando è in seconda linea (P1, P6, P5) sono 3.',
        '4-2': 'Nel 4-2 alza sempre il palleggiatore di prima linea: gli attaccanti a rete sono sempre 2.', '6-2': 'Nel 6-2 alza sempre il palleggiatore di seconda linea: gli attaccanti a rete sono sempre 3.' }[sys];
      return build(`Sistema ${sys}, rotazione ${rn}: quanti attaccanti ci sono in prima linea?`, String(n), ['1', '2', '3'], e);
    }
    if (kind === 3) return build(`Siete in ${rn} e vincete il cambio palla: in che rotazione andate?`, CM.Rot.name(CM.Rot.next(r)), CM.Rot.all.map(CM.Rot.name),
      `Si ruota in senso orario: dopo ${rn} viene ${CM.Rot.name(CM.Rot.next(r))}. L'ordine completo è P1 → P6 → P5 → P4 → P3 → P2 → P1.`);
    if (kind === 4) {
      const rep = CM.Engine.liberoReplaces(S({ phase: 'ricezione', useLibero: true })) || 'C1';
      return build(`In ${rn}, in ricezione, al posto di chi gioca il libero?`, lab(rep), ['C1', 'C2', 'S1', 'S2', 'O'].map(x => lab(x)),
        `Il libero sostituisce il centrale che si trova in seconda linea: in ${rn} è ${lab(rep)}.`);
    }
    if (kind === 6) { const q = RULE_QUESTIONS[Math.floor(Math.random() * RULE_QUESTIONS.length)]; return { prompt: q[0], options: q[1], correct: q[2], explanation: q[3] }; }
    const setter = CM.Engine.activeSetter(S({}));
    const e = { '5-1': 'Nel 5-1 alza sempre lo stesso palleggiatore, in qualsiasi rotazione.', '4-2': `Nel 4-2 alza il palleggiatore che si trova in prima linea: in ${rn} è ${lab(setter)}.`,
      '6-2': `Nel 6-2 alza il palleggiatore che si trova in seconda linea: in ${rn} è ${lab(setter)}.` }[sys];
    return build(`Sistema ${sys}, rotazione ${rn}: chi alza?`, lab(setter), ['P', 'O', 'S1', 'C1'].map(x => lab(x)), e);
  }

  const quiz = { mode: 'domande', q: null, selected: null, index: 1, score: 0, finished: false, task: 'zone', rotation: 0, overrides: {}, result: null };
  function renderQuiz() {
    const p = page('Quiz');
    const out = h('div', { class: 'stack' });
    p.append(out);
    const draw = () => {
      out.innerHTML = '';
      out.append(CM.chipPicker([{ label: 'Domande', value: 'domande' }, { label: 'Posiziona', value: 'posiziona' }], quiz.mode, v => { quiz.mode = v; draw(); }, ['#8552FA', '#FA4278']));
      if (quiz.mode === 'domande') drawQuestions(); else drawPlacement();
    };
    const total = 10;
    function drawQuestions() {
      if (!quiz.q) quiz.q = makeQuestion(Store.team);
      if (quiz.finished) {
        out.append(h('div', { class: 'card stack', style: { textAlign: 'center', padding: '24px' } },
          h('div', { style: { width: '130px', height: '130px', borderRadius: '50%', margin: '0 auto', background: grad('#8552FA', '#FA4278'), color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' } },
            h('b', { style: { fontSize: '48px', lineHeight: 1 } }, quiz.score), h('span', { class: 'small bold' }, 'su ' + total)),
          h('div', { style: { color: '#FFB800', fontSize: '26px' } }, Array.from({ length: 5 }, (_, i) => i < Math.round(quiz.score / 2) ? '★' : '☆').join('')),
          h('b', null, quiz.score >= 8 ? 'Ottimo, le rotazioni non hanno segreti!' : (quiz.score >= 5 ? 'Bene, ancora un po\' di allenamento.' : 'Riprova: guarda la lavagna tattica e poi ritenta.')),
          CM.gradButton('Ricomincia', 'undo', ['#8552FA', '#FA4278'], () => { Object.assign(quiz, { q: makeQuestion(Store.team), selected: null, index: 1, score: 0, finished: false }); draw(); })));
        return;
      }
      const q = quiz.q;
      out.append(h('div', { class: 'card stack', style: { gap: '10px' } },
        h('div', { class: 'row' }, h('span', { class: 'tiny bold', style: { color: 'var(--purple)', letterSpacing: '0.8px' } }, `DOMANDA ${quiz.index} DI ${total}`), h('span', { class: 'spacer' }),
          h('span', { class: 'pill', style: { background: grad('#FF8C1F', '#FFCC1A'), color: '#fff' } }, '★ ' + quiz.score)),
        h('div', { style: { height: '6px', borderRadius: '3px', background: 'var(--fill)', overflow: 'hidden' } }, h('div', { style: { width: ((quiz.index - 1) / total * 100) + '%', height: '100%', background: 'var(--purple)' } })),
        h('b', { style: { fontSize: '19px' } }, q.prompt)));
      q.options.forEach((o, i) => {
        const sel = quiz.selected, isC = i === q.correct, isS = i === sel;
        const bg = sel == null ? 'var(--card)' : (isC ? 'rgba(33,199,120,0.15)' : (isS ? 'rgba(237,56,69,0.15)' : 'var(--card)'));
        const bd = sel == null ? 'transparent' : (isC ? 'var(--green)' : (isS ? 'var(--red)' : 'transparent'));
        const lc = sel == null ? 'var(--purple)' : (isC ? 'var(--green)' : (isS ? 'var(--red)' : '#9AA0AE'));
        out.append(h('button', { class: 'row', style: { background: bg, border: `2px solid ${bd}`, borderRadius: '16px', padding: '12px 14px', textAlign: 'left', boxShadow: 'var(--shadow)' },
          onclick: () => { if (quiz.selected != null) return; quiz.selected = i; if (isC) quiz.score++; CM.haptic(isC ? 15 : 60); draw(); } },
          h('span', { style: { width: '30px', height: '30px', borderRadius: '50%', background: lc, color: '#fff', fontWeight: 900, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 } }, 'ABCD'[i]),
          h('span', { style: { flex: 1, fontWeight: 600 } }, o), sel != null && (isC || isS) ? h('span', { style: { color: isC ? 'var(--green)' : 'var(--red)' } }, icon(isC ? 'check' : 'x', 20)) : null));
      });
      if (quiz.selected != null) {
        const right = quiz.selected === q.correct;
        out.append(CM.noteCard(right ? 'Giusto!' : 'Non proprio', q.explanation, right ? 'check' : 'sparkle', right ? ['#21C778', '#0DA89E'] : ['#FF8C1F', '#FFCC1A']),
          CM.gradButton(quiz.index === total ? 'Vedi il risultato' : 'Avanti', 'chevron', ['#8552FA', '#FA4278'], () => {
            if (quiz.index >= total) quiz.finished = true; else { quiz.index++; quiz.selected = null; quiz.q = makeQuestion(Store.team); }
            draw(); window.scrollTo(0, 0);
          }));
      }
    }
    function drawPlacement() {
      const team = Store.team, lab = Team.labeler(team);
      const sit = Object.assign(CM.defaultSituation(), { system: team.system, phase: quiz.task === 'zone' ? 'rotazione' : 'ricezione', rotation: quiz.rotation, useLibero: false });
      const bench = {}; CM.COURT_ROLES.forEach((r, i) => { bench[r] = { x: 0.08 + i * 0.168, y: 1.10 }; });
      const court = CM.createCourt();
      const pos = r => quiz.overrides[r] || bench[r];
      const inCourt = p => p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1;
      court.update({ formation: { positions: bench, defenders: [], blockers: [], server: null, attacker: null, ball: null },
        overrides: quiz.overrides, labeler: lab, showZones: quiz.task === 'zone', interactive: true,
        onMove: (r, p) => { quiz.overrides[r] = p; }, onEnd: () => { } });
      const resultBox = h('div');
      const showResult = () => {
        resultBox.innerHTML = '';
        if (!quiz.result) return;
        resultBox.append(quiz.result.length ? CM.noteCard('Da correggere', quiz.result.map(x => '• ' + x).join('\n'), 'warn', ['#ED3845', '#FF8C1F'], 'alert-card')
          : CM.noteCard('Perfetto, tutto giusto!', 'Hai sistemato la squadra correttamente. Premi «Nuovo» per un\'altra rotazione.', 'check', ['#21C778', '#0DA89E']));
      };
      const check = () => {
        const msgs = [], out2 = CM.COURT_ROLES.filter(r => !inCourt(pos(r)));
        if (out2.length) msgs.push('Devono ancora entrare in campo: ' + out2.map(r => lab(r)).join(', ') + '.');
        if (quiz.task === 'zone') {
          const map = CM.Engine.courtMap(sit);
          for (let z = 1; z <= 6; z++) { const r = map[z]; if (inCourt(pos(r))) { const a = CM.Lineup.zoneAt(pos(r)); if (a !== z) msgs.push(`${lab(r)} è in zona ${a}, ma deve stare in zona ${z}.`); } }
        } else if (!out2.length) {
          const ps = {}; CM.COURT_ROLES.forEach(r => { ps[r] = pos(r); });
          msgs.push(...CM.Engine.overlapViolations(ps, sit, lab));
        }
        quiz.result = msgs; showResult(); CM.haptic(msgs.length ? 80 : 20);
      };
      const layout = h('div', { class: 'court-layout' },
        h('div', { class: 'cl-controls' },
          CM.chipPicker([{ label: 'Zone', value: 'zone' }, { label: 'Ricezione', value: 'ricezione' }], quiz.task, v => { quiz.task = v; quiz.overrides = {}; quiz.result = null; quiz.rotation = Math.floor(Math.random() * 6); draw(); }, ['#8552FA', '#FA4278']),
          h('div', { class: 'card tight row' }, iconBadge(quiz.task === 'zone' ? 'board' : 'hand', ['#8552FA', '#FA4278'], 40),
            h('b', { class: 'small' }, quiz.task === 'zone' ? `Rotazione ${CM.Rot.name(quiz.rotation)}: trascina ogni giocatore nella sua zona.`
              : `Rotazione ${CM.Rot.name(quiz.rotation)}, in ricezione: schiera la squadra senza falli di posizione, con il palleggiatore pronto ad alzare.`)),
          h('div', { class: 'row', style: { gap: '8px' } },
            CM.gradButton('Verifica', 'check', ['#21C778', '#0DA89E'], check, true),
            CM.gradButton('Soluzione', 'eye', ['#FF8C1F', '#FFCC1A'], () => {
              const f = CM.Engine.formation(Object.assign({}, sit), lab); quiz.overrides = Object.assign({}, f.positions); quiz.result = null; draw(); }, true),
            CM.gradButton('Nuovo', 'shuffle', ['#8552FA', '#FA4278'], () => { quiz.overrides = {}; quiz.result = null; quiz.rotation = Math.floor(Math.random() * 6); draw(); }, true))),
        h('div', { class: 'cl-court' }, court.el),
        h('div', { class: 'cl-info' }, resultBox, CM.legend(lab, false)));
      out.append(layout);
      showResult();
    }
    draw();
  }

  // =================== SCHEMI ===================
  function renderSchemes() {
    const p = page('Schemi salvati');
    const list = Store.data.schemes;
    if (!list.length) { p.append(emptyState('stack', 'Nessuno schema', 'Nella lavagna tattica sposta i giocatori come preferisci e usa «Salva schema» dal menu in alto.')); return; }
    p.append(h('div', { class: 'list' }, list.map(sc => {
      const ph = CM.PHASES.find(x => x.id === sc.situation.phase) || CM.PHASES[0];
      return h('div', { class: 'list-row' },
        h('button', { style: { display: 'flex', alignItems: 'center', gap: '12px', flex: 1, textAlign: 'left' }, onclick: () => Router.go('/board/scheme/' + sc.id) },
          iconBadge(ph.icon, CM.PHASE_COLORS[ph.id], 40),
          h('div', { style: { flex: 1 } }, h('div', { class: 'bold' }, sc.name), h('div', { class: 'tiny muted' }, `${ph.title} · ${CM.Rot.name(sc.situation.rotation)} · ${CM.fmtDate(sc.date)}`))),
        h('button', { class: 'circle-btn', style: { color: 'var(--red)' }, onclick: () => CM.confirmDialog('Eliminare lo schema?', sc.name, 'Elimina', () => {
          Store.data.schemes = Store.data.schemes.filter(x => x !== sc); Store.commit(); renderSchemes(); }) }, icon('trash', 16)));
    })));
  }

  // =================== IMPOSTAZIONI ===================
  function renderSettings() {
    const p = page('Impostazioni');
    const file = h('input', { type: 'file', accept: 'application/json,.json', class: 'hidden', onchange: e => {
      const f = e.target.files[0]; if (!f) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const d = Store.parseBackup(reader.result);
          CM.confirmDialog('Ripristinare il backup?', `Il backup contiene ${d.teams.length} squadre e ${d.history.length} partite. I dati attuali verranno sostituiti.`, 'Ripristina', () => { Store.restore(d); CM.toast('Backup ripristinato'); renderSettings(); });
        } catch (err) { CM.toast('File non valido', 'warn'); }
      };
      reader.readAsText(f);
      e.target.value = '';
    } });
    const d = Store.data;
    p.append(file, h('div', { class: 'stack' },
      h('div', { class: 'card row' }, iconBadge('cloud', ['#0DA89E', '#1F6BFA'], 46),
        h('div', null, h('b', null, 'Backup dei dati'), h('div', { class: 'small muted' }, 'Squadre, giocatori, schemi, storico, calendario, presenze ed esercizi.'))),
      CM.gradButton('Crea e salva il backup', 'download', ['#0DA89E', '#1F6BFA'], () => {
        const blob = new Blob([Store.exportJSON()], { type: 'application/json' });
        const name = `CoachMate-backup-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.json`;
        CM.shareOrDownload(name, blob);
      }),
      CM.gradButton('Ripristina da un backup…', 'upload', ['#8552FA', '#1F6BFA'], () => file.click()),
      h('div', { class: 'form-foot' }, 'I dati sono salvati solo su questo telefono, nel browser. Fai un backup ogni tanto e salvalo in Drive o mandalo a te stesso: ti serve anche per passare i dati su un altro telefono. Se cancelli i dati del browser o disinstalli l\'app, li perdi.'),
      CM.formGroup('App', [
        CM.formRow('Statistiche nel segnapunti', CM.toggle(d.settings.statsEnabled !== false, v => { d.settings.statsEnabled = v; Store.commit(); })),
        CM.formRow('Frecce dei movimenti', CM.toggle(d.settings.showArrows, v => { d.settings.showArrows = v; Store.commit(); })),
        CM.formRow('Zone di competenza', CM.toggle(d.settings.showAreas, v => { d.settings.showAreas = v; Store.commit(); })),
        h('button', { class: 'form-row btn-plain', style: { width: '100%' }, onclick: () => { d.settings.onboardingDone = false; Store.commit(); location.reload(); } }, icon('sparkle', 18), 'Rivedi l\'introduzione'),
        CM.formRow('Squadre', h('b', null, d.teams.length)), CM.formRow('Partite nello storico', h('b', null, d.history.length)), CM.formRow('Schemi salvati', h('b', null, d.schemes.length))]),
      h('div', { class: 'form-foot', style: { textAlign: 'center' } }, 'CoachMate Volleyball · versione web 1.0')));
  }

  CM.viewRegistrars = CM.viewRegistrars || [];
  CM.viewRegistrars.push(R => {
    R.add('/calendar', renderCalendar);
    R.add('/fixture/:id', renderFixture);
    R.add('/attendance', renderAttendance);
    R.add('/session/:id', renderSession);
    R.add('/drills', renderDrills);
    R.add('/drill/:id', renderDrill);
    R.add('/plan/:id', renderPlan);
    R.add('/plan/:id/run', renderPlanRun);
    R.add('/quiz', renderQuiz);
    R.add('/schemes', renderSchemes);
    R.add('/settings', renderSettings);
  });
})(window);
