/* CoachMate – dati, salvataggio e logica della partita */
(function (global) {
  'use strict';
  const CM = global.CM;
  const KEY = 'coachmate-data-v1';

  const uid = () => (global.crypto && crypto.randomUUID) ? crypto.randomUUID()
    : 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  const clone = o => JSON.parse(JSON.stringify(o));

  const RULE_PRESETS = {
    fipav: { label: 'FIPAV (Divisioni): 3 set su 5', mode: 'bestOf', setsToWin: 3, totalSets: 3, pointsPerSet: 25, tieBreak: true, tieBreakPoints: 15, winByTwo: true, capPoints: 0, maxSubs: 8, timeouts: 2, strictReentry: true },
    csenMisto: { label: 'CSEN Amatori Misto: 2 set su 3 (25-25-15)', mode: 'bestOf', setsToWin: 2, totalSets: 3, pointsPerSet: 25, tieBreak: true, tieBreakPoints: 15, winByTwo: true, capPoints: 0, maxSubs: 8, timeouts: 2, strictReentry: true },
    bestOfThree: { label: 'Amatoriale: 2 set su 3', mode: 'bestOf', setsToWin: 2, totalSets: 3, pointsPerSet: 25, tieBreak: true, tieBreakPoints: 15, winByTwo: true, capPoints: 0, maxSubs: 8, timeouts: 2, strictReentry: true },
    threeFixed: { label: 'Amatoriale: 3 set fissi', mode: 'fixed', setsToWin: 2, totalSets: 3, pointsPerSet: 25, tieBreak: false, tieBreakPoints: 15, winByTwo: true, capPoints: 0, maxSubs: 8, timeouts: 2, strictReentry: true }
  };
  const rulesFrom = key => { const r = clone(RULE_PRESETS[key]); delete r.label; return r; };
  function rulesSummary(r) {
    let s = r.mode === 'bestOf' ? `${r.setsToWin} set su ${r.setsToWin * 2 - 1} a ${r.pointsPerSet}${r.tieBreak ? `, tie-break a ${r.tieBreakPoints}` : ''}`
      : `${r.totalSets} set fissi a ${r.pointsPerSet}`;
    return s + (r.maxSubs === 0 ? ' · cambi illimitati' : ` · ${r.maxSubs} cambi`);
  }

  const PLAYER_ROLES = ['Palleggiatore', 'Schiacciatore', 'Centrale', 'Opposto', 'Libero', 'Universale'];

  function newTeam(name) {
    return { id: uid(), name: name || 'La mia squadra', championship: '', system: '5-1', useLibero: true, reception: 3,
      players: [], lineup: {}, libero2: null, startRotation: 0, rules: rulesFrom('fipav'), mixed: null };
  }
  const newPlayer = () => ({ id: uid(), name: '', number: null, role: 'Universale', gender: null });

  const Player = {
    display(p) {
      if (!p) return null;
      const n = (p.name || '').trim();
      if (n) return n;
      if (p.number != null && p.number !== '') return '#' + p.number;
      return null;
    },
    listName(p) {
      if (!p) return '—';
      const n = (p.name || '').trim() || 'Senza nome';
      return (p.number != null && p.number !== '') ? `#${p.number} ${n}` : n;
    }
  };
  const Team = {
    player: (t, id) => id ? t.players.find(p => p.id === id) || null : null,
    playerFor: (t, role) => Team.player(t, t.lineup[role]),
    labeler(t) {
      const names = {};
      for (const r of CM.ROLES) { const d = Player.display(Team.playerFor(t, r)); if (d) names[r] = d; }
      return CM.makeLabeler(t.system, names);
    }
  };

  // ---------- Libreria esercizi ----------
  const DRILL_CATEGORIES = [
    { id: 'riscaldamento', title: 'Riscaldamento', icon: 'flame', colors: ['#FF8C1F', '#FFCC1A'] },
    { id: 'battuta', title: 'Battuta', icon: 'serve', colors: ['#FF8C1F', '#ED3845'] },
    { id: 'ricezione', title: 'Ricezione', icon: 'hand', colors: ['#21C778', '#0DA89E'] },
    { id: 'palleggio', title: 'Palleggio e alzata', icon: 'sparkle', colors: ['#FFCC1A', '#FF8C1F'] },
    { id: 'attacco', title: 'Attacco', icon: 'bolt', colors: ['#FA4278', '#FF8C1F'] },
    { id: 'muro', title: 'Muro', icon: 'wall', colors: ['#8552FA', '#1F6BFA'] },
    { id: 'difesa', title: 'Difesa', icon: 'shield', colors: ['#8552FA', '#FA4278'] },
    { id: 'gioco', title: 'Gioco', icon: 'court', colors: ['#1F6BFA', '#0DC7F2'] },
    { id: 'fisico', title: 'Preparazione fisica', icon: 'run', colors: ['#0DA89E', '#21C778'] }
  ];
  const D = (name, category, minutes, players, description) => ({ id: uid(), name, category, minutes, players, description, schemeID: null, builtIn: true });
  const drillLibrary = () => [
    D('Attivazione con palla', 'riscaldamento', 10, 'Tutti, a coppie', 'Corsa leggera, mobilità di spalle e caviglie, poi a coppie: palleggio, bagher e piccoli attacchi controllati aumentando gradualmente la distanza.'),
    D('Battuta a bersaglio', 'battuta', 10, 'Tutti', 'Metti 3 cerchi o coni nelle zone 1, 5 e 6 avversarie. Ogni giocatore batte 10 palloni chiamando la zona prima di colpire. Conta i bersagli centrati.'),
    D('Ricezione a tre in rotazione', 'ricezione', 15, '3 ricevitori + 1 palleggiatore + battitori', 'I battitori servono dall\'altra metà campo; i tre ricevitori (bande e libero) ricevono verso il palleggiatore a rete. Dopo 5 ricezioni positive si ruota. Valuta ogni ricezione con #, +, – ed errore.'),
    D('Palleggio a triangolo', 'palleggio', 10, 'Gruppi da 3', 'Tre giocatori a triangolo: palleggio al compagno, spostamento verso il punto lasciato libero. Variante: alzata alta in posto 4 dopo 10 tocchi.'),
    D('Attacco da posto 4 con alzata', 'attacco', 15, 'Attaccanti + palleggiatore', 'L\'allenatore lancia al palleggiatore, che alza in posto 4. Gli attaccanti rincorsa a tre passi e attaccano in diagonale, poi lungolinea. Dopo l\'attacco rientrano in copertura.'),
    D('Muro a due contro attacco', 'muro', 10, 'Centrali + opposto/banda', 'Il centrale si sposta lateralmente per chiudere il muro a due con il laterale. L\'allenatore attacca da un rialzo; lavorare su tempo di salto e mani sopra la rete.'),
    D('Difesa perimetrale a tre', 'difesa', 15, '3 difensori + allenatore', 'Difensori in zona 1, 6 e 5. L\'allenatore attacca da posto 4 con colpi forti e pallonetti. Ogni difensore copre la sua zona di competenza (vedi lavagna, fase Difesa).'),
    D('Free ball e contrattacco', 'gioco', 15, '6 contro allenatore', 'L\'allenatore manda palle facili: la squadra chiama "free!", gli attaccanti scendono ai 3 m, il palleggiatore entra a rete e si costruisce il contrattacco.'),
    D('Partitella a punteggio speciale', 'gioco', 20, '6 contro 6', 'Set a 15. Il punto vale doppio se nasce da ricezione perfetta. Usa il segnapunti in modalità Allenamento.'),
    D('Scatti e balzi', 'fisico', 10, 'Tutti', 'Circuito: 6 scatti da 6 m, 10 balzi a piedi pari, 10 affondi, 30" di plank. Due giri con 1\' di recupero.')
  ];

  // ---------- Partita ----------
  function newMatch(team, opponent, rules, weServeFirst, startRotation) {
    return {
      id: uid(), date: new Date().toISOString(), teamName: team.name, opponent, rules: clone(rules),
      system: team.system, useLibero: team.useLibero, reception: team.reception,
      players: clone(team.players), starters: clone(team.lineup), occupants: clone(team.lineup),
      startRotation, rotation: startRotation, weServe: weServeFirst, firstServeUs: weServeFirst,
      completedSets: [], us: 0, them: 0, subsUsed: 0, subs: {}, timeoutsUs: 0, timeoutsThem: 0,
      finished: false, savedToHistory: false, betweenSets: false, lastPointUs: null,
      training: false, keepInHistory: false, stats: {}, oppSetterZone: null, fixtureID: null,
      mixed: team.mixed ? clone(team.mixed) : null, liberoBench: team.libero2 || null
    };
  }
  const Match = {
    player: (m, id) => id ? m.players.find(p => p.id === id) || null : null,
    labeler(m, which) {
      const src = which === 'starters' ? m.starters : m.occupants;
      const names = {};
      for (const r of CM.ROLES) { const d = Player.display(Match.player(m, src[r])); if (d) names[r] = d; }
      return CM.makeLabeler(m.system, names);
    },
    gender: (m, role) => { const p = Match.player(m, m.occupants[role]); return p ? p.gender : null; },
    setsUs: m => m.completedSets.filter(s => s.us > s.them).length,
    setsThem: m => m.completedSets.filter(s => s.them > s.us).length,
    setNumber: m => m.completedSets.length + 1,
    isDeciding: m => m.rules.mode === 'bestOf' && m.rules.tieBreak && Match.setsUs(m) === m.rules.setsToWin - 1 && Match.setsThem(m) === m.rules.setsToWin - 1,
    target: m => Match.isDeciding(m) ? m.rules.tieBreakPoints : m.rules.pointsPerSet,
    setWinner(m) {
      const r = m.rules;
      if (r.capPoints > 0) { if (m.us >= r.capPoints) return true; if (m.them >= r.capPoints) return false; }
      const margin = r.winByTwo ? 2 : 1, t = Match.target(m);
      if (m.us >= t && m.us - m.them >= margin) return true;
      if (m.them >= t && m.them - m.us >= margin) return false;
      return null;
    },
    matchOver: m => m.rules.mode === 'bestOf'
      ? (Match.setsUs(m) >= m.rules.setsToWin || Match.setsThem(m) >= m.rules.setsToWin)
      : m.completedSets.length >= m.rules.totalSets,
    pointUs(m) {
      if (!m.weServe) { m.rotation = CM.Rot.next(m.rotation); m.weServe = true; }
      m.us++; m.lastPointUs = true;
    },
    pointThem(m) {
      const was = m.weServe;
      m.weServe = false; m.them++; m.lastPointUs = false;
      if (was && m.oppSetterZone) m.oppSetterZone = m.oppSetterZone === 1 ? 6 : m.oppSetterZone - 1;
    },
    addStat(m, action, playerID) {
      m.stats = m.stats || {};
      const st = m.stats[playerID] || (m.stats[playerID] = {});
      st[action] = (st[action] || 0) + 1;
    },
    closeSet(m) {
      m.completedSets.push({ us: m.us, them: m.them });
      if (Match.matchOver(m)) { m.finished = true; m.betweenSets = false; } else m.betweenSets = true;
    },
    startNextSet(m, rotation, weServe) {
      Object.assign(m, { betweenSets: false, lastPointUs: null, us: 0, them: 0, subsUsed: 0, subs: {},
        timeoutsUs: 0, timeoutsThem: 0, occupants: clone(m.starters), startRotation: rotation, rotation,
        weServe, firstServeUs: weServe, oppSetterZone: null });
    },
    swapLibero(m) {
      if (!m.liberoBench) return;
      const cur = m.occupants.L;
      m.occupants.L = m.liberoBench; m.starters.L = m.liberoBench; m.liberoBench = cur || null;
    },
    situation: m => Object.assign(CM.defaultSituation(), { system: m.system, phase: m.weServe ? 'battuta' : 'ricezione',
      rotation: m.rotation, useLibero: m.useLibero, reception: m.reception }),
    isEmpty: m => m.completedSets.length === 0 && m.us === 0 && m.them === 0,
    statRows(m) {
      const rows = [];
      for (const id in (m.stats || {})) {
        const st = m.stats[id];
        if (!CM.Stats.isEmpty(st)) rows.push({ id, name: Player.listName(Match.player(m, id)), stats: st });
      }
      return rows.sort((a, b) => CM.Stats.points(b.stats) - CM.Stats.points(a.stats));
    },
    record(m) {
      let sets = m.completedSets.slice(), interrupted = false;
      if (!m.finished) {
        const partial = !m.betweenSets && (m.us > 0 || m.them > 0);
        if (partial) { sets.push({ us: m.us, them: m.them }); interrupted = true; }
      }
      const rows = Match.statRows(m);
      return { id: uid(), date: m.date, teamName: m.teamName, opponent: m.opponent, sets, interrupted,
        training: !!m.training, setsToWin: m.rules.setsToWin, mode: m.rules.mode, fixtureID: m.fixtureID || null,
        statRows: rows.length ? rows : null };
    }
  };
  const Record = {
    completeSets: r => r.interrupted && r.sets.length ? r.sets.slice(0, -1) : r.sets,
    setsUs: r => Record.completeSets(r).filter(s => s.us > s.them).length,
    setsThem: r => Record.completeSets(r).filter(s => s.them > s.us).length,
    won: r => Record.setsUs(r) > Record.setsThem(r),
    lost: r => Record.setsThem(r) > Record.setsUs(r),
    standingPoints(r) {
      if (r.interrupted || r.training || r.mode === 'fixed' || !r.setsToWin) return null;
      const w = r.setsToWin, u = Record.setsUs(r), t = Record.setsThem(r);
      if (Math.max(u, t) !== w) return null;
      if (u === w) return t === w - 1 ? 2 : 3;
      return u === w - 1 ? 1 : 0;
    }
  };

  // ---------- Store ----------
  const listeners = new Set();
  const Store = {
    data: null,
    undo: [],
    load() {
      let d = null;
      try { d = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { d = null; }
      this.data = Store.normalize(d);
      Store.save();
    },
    normalize(d) {
      d = d && typeof d === 'object' ? d : {};
      const out = {
        version: 1,
        teams: Array.isArray(d.teams) && d.teams.length ? d.teams : [newTeam()],
        selectedTeamID: d.selectedTeamID || null,
        schemes: Array.isArray(d.schemes) ? d.schemes : [],
        history: Array.isArray(d.history) ? d.history : [],
        currentMatch: d.currentMatch || null,
        fixtures: Array.isArray(d.fixtures) ? d.fixtures : [],
        sessions: Array.isArray(d.sessions) ? d.sessions : [],
        drills: Array.isArray(d.drills) && d.drills.length ? d.drills : drillLibrary(),
        plans: Array.isArray(d.plans) ? d.plans : [],
        settings: Object.assign({ onboardingDone: false, showArrows: true, showAreas: true, statsEnabled: true, statsAutoPoint: true }, d.settings || {})
      };
      for (const t of out.teams) {
        const def = newTeam(t.name);
        for (const k in def) if (t[k] === undefined) t[k] = def[k];
        t.rules = Object.assign(rulesFrom('fipav'), t.rules || {});
      }
      if (!out.teams.find(t => t.id === out.selectedTeamID)) out.selectedTeamID = out.teams[0].id;
      return out;
    },
    save() {
      try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { console.warn('Salvataggio non riuscito', e); }
    },
    commit() { Store.save(); listeners.forEach(f => f()); },
    subscribe(f) { listeners.add(f); return () => listeners.delete(f); },

    get team() { return this.data.teams.find(t => t.id === this.data.selectedTeamID) || this.data.teams[0]; },
    teamById(id) { return this.data.teams.find(t => t.id === id); },

    // Partita
    mutateMatch(fn) {
      const m = this.data.currentMatch;
      if (!m) return;
      this.undo.push(clone(m));
      if (this.undo.length > 200) this.undo.shift();
      fn(m);
      Store.commit();
    },
    undoMatch() {
      const last = this.undo.pop();
      if (!last) return;
      this.data.currentMatch = last;
      Store.commit();
    },
    archiveCurrentMatch() {
      const m = this.data.currentMatch;
      if (!m || m.savedToHistory || Match.isEmpty(m)) return;
      m.savedToHistory = true;
      if (!(m.training && !m.keepInHistory)) this.data.history.unshift(Match.record(m));
      Store.commit();
    },
    finishMatch() {
      Store.archiveCurrentMatch();
      this.data.currentMatch = null;
      this.undo = [];
      Store.commit();
    },

    // Statistiche generali
    wins() { return this.data.history.filter(r => Record.won(r) && !r.interrupted && !r.training).length; },
    losses() { return this.data.history.filter(r => Record.lost(r) && !r.interrupted && !r.training).length; },
    standingPoints() {
      const name = this.team.name;
      return this.data.history.filter(r => r.teamName === name).map(Record.standingPoints).filter(p => p != null).reduce((a, b) => a + b, 0);
    },
    nextFixture() {
      const cutoff = Date.now() - 3 * 3600 * 1000, tid = this.team.id;
      return this.data.fixtures.filter(f => f.teamID === tid && new Date(f.date).getTime() >= cutoff)
        .sort((a, b) => new Date(a.date) - new Date(b.date))[0] || null;
    },
    recordFor(f) { return this.data.history.find(r => r.fixtureID === f.id) || null; },

    // Backup
    exportJSON() { return JSON.stringify(Object.assign({ app: 'CoachMate Volleyball', exportedAt: new Date().toISOString() }, this.data), null, 2); },
    parseBackup(text) {
      const d = JSON.parse(text);
      if (!d || !Array.isArray(d.teams) || !d.teams.length) throw new Error('Backup non valido');
      return Store.normalize(d);
    },
    restore(d) { this.data = d; this.undo = []; Store.commit(); }
  };

  function fixtureMessage(f, team) {
    const d = new Date(f.date);
    const day = d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
    const time = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    const opp = f.opponent || 'avversario da definire';
    const lines = [`🏐 CONVOCAZIONE – ${team.name}`, `${day.charAt(0).toUpperCase() + day.slice(1)} ore ${time}`,
      f.home ? `${team.name} – ${opp} (in casa)` : `${opp} – ${team.name} (in trasferta)`];
    if (f.place) lines.push(`📍 ${f.place}`);
    lines.push('', 'Convocati:');
    const players = f.called.map(id => Team.player(team, id)).filter(Boolean)
      .sort((a, b) => (a.number ?? 999) - (b.number ?? 999));
    players.forEach((p, i) => lines.push(`${i + 1}. ${Player.listName(p)}`));
    if (f.note) lines.push('', f.note);
    return lines.join('\n');
  }

  Object.assign(CM, { uid, clone, Store, Match, Record, Team, Player, newTeam, newPlayer, newMatch,
    RULE_PRESETS, rulesFrom, rulesSummary, PLAYER_ROLES, DRILL_CATEGORIES, drillLibrary, fixtureMessage });
})(typeof window !== 'undefined' ? window : globalThis);
