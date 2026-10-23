/* CoachMate Volleyball – motore tattico (porting della versione iPhone).
   Coordinate normalizzate della propria metà campo:
   x: 0 = lato zona 4, 1 = lato zona 2 · y: 0 = rete, 1 = linea di fondo. */
(function (global) {
  'use strict';

  const ROLES = ['P', 'S1', 'S2', 'C1', 'C2', 'O', 'L'];
  const COURT_ROLES = ['P', 'S1', 'C2', 'O', 'S2', 'C1'];
  const SYSTEMS = ['5-1', '4-2', '6-2'];
  const SYSTEM_DESC = {
    '5-1': 'Un palleggiatore e un opposto. Il palleggiatore alza sempre.',
    '4-2': 'Due palleggiatori: alza quello in prima linea. Due attaccanti a rete.',
    '6-2': 'Due palleggiatori: alza quello in seconda linea, l\'altro attacca. Tre attaccanti a rete.'
  };

  const pt = (x, y) => ({ x, y });

  // ---------- Ruoli ----------
  const Role = {
    short(r, s) {
      if (r === 'P') return s === '5-1' ? 'P' : 'P1';
      if (r === 'O') return s === '5-1' ? 'O' : 'P2';
      return r;
    },
    fullName(r, s) {
      switch (r) {
        case 'P': return s === '5-1' ? 'Palleggiatore' : 'Palleggiatore 1';
        case 'S1': return 'Schiacciatore 1 (banda)';
        case 'S2': return 'Schiacciatore 2 (banda)';
        case 'C1': return 'Centrale 1';
        case 'C2': return 'Centrale 2';
        case 'O': return s === '5-1' ? 'Opposto' : 'Palleggiatore 2';
        case 'L': return 'Libero';
      }
      return r;
    },
    color(r, s) {
      switch (r) {
        case 'P': return '#FACC1A';
        case 'S1': case 'S2': return '#2673F2';
        case 'C1': case 'C2': return '#1AA659';
        case 'O': return s === '5-1' ? '#E63340' : '#FA9E1A';
        case 'L': return '#8C4DD9';
      }
      return '#888';
    },
    textColor(r, s) {
      if (r === 'P') return '#000';
      if (r === 'O' && s !== '5-1') return '#000';
      return '#fff';
    },
    areaColor(r) {
      return { P: '#FFDB26', S1: '#337AFF', S2: '#1AD9F2', C1: '#1FB861', C2: '#9EE633', O: '#F2384D', L: '#9E59F2' }[r];
    },
    isMiddle: r => r === 'C1' || r === 'C2',
    isOutside: r => r === 'S1' || r === 'S2',
    swapped: r => ({ P: 'O', O: 'P', S1: 'S2', S2: 'S1', C1: 'C2', C2: 'C1', L: 'L' }[r])
  };

  // ---------- Rotazioni ----------
  // indice 0..5 = P1, P6, P5, P4, P3, P2
  const SETTER_ZONE = [1, 6, 5, 4, 3, 2];
  const Rot = {
    all: [0, 1, 2, 3, 4, 5],
    setterZone: k => SETTER_ZONE[k],
    name: k => 'P' + SETTER_ZONE[k],
    next: k => (k + 1) % 6,
    prev: k => (k + 5) % 6,
    shifted: (k, n) => ((k + n) % 6 + 6) % 6,
    setterInFront: k => { const z = SETTER_ZONE[k]; return z >= 2 && z <= 4; }
  };

  const P1 = { 1: 'P', 2: 'S1', 3: 'C2', 4: 'O', 5: 'S2', 6: 'C1' };
  const Lineup = {
    roleInZone: (zone, k) => P1[((zone - 1 + k) % 6) + 1],
    zoneOf(role, k) { for (let z = 1; z <= 6; z++) if (Lineup.roleInZone(z, k) === role) return z; return 1; },
    isFront: z => z >= 2 && z <= 4,
    zoneAt(p) {
      const col = p.x < 1 / 3 ? 0 : (p.x < 2 / 3 ? 1 : 2);
      return p.y < 0.5 ? [4, 3, 2][col] : [5, 6, 1][col];
    }
  };

  const PHASES = [
    { id: 'rotazione', title: 'Rotazione', icon: 'rotate' },
    { id: 'battuta', title: 'Battuta', icon: 'serve' },
    { id: 'ricezione', title: 'Ricezione', icon: 'hand' },
    { id: 'difesa', title: 'Difesa', icon: 'shield' },
    { id: 'copertura', title: 'Copertura', icon: 'people' }
  ];
  const PHASE_COLORS = {
    rotazione: ['#1F6BFA', '#0DC7F2'], battuta: ['#FF8C1F', '#FFCC1A'], ricezione: ['#21C778', '#0DA89E'],
    difesa: ['#8552FA', '#1F6BFA'], copertura: ['#FA4278', '#FF8C1F']
  };
  const DEFENSES = [
    { id: 'perimetrale', title: 'Perimetrale' }, { id: 'avanzato', title: '6 avanzato' },
    { id: 'rotazione', title: 'In rotazione' }, { id: 'freeBall', title: 'Free ball' }
  ];

  function defaultSituation() {
    return { system: '5-1', phase: 'rotazione', rotation: 0, step: 'iniziale', attack: 4,
      useLibero: true, reception: 3, defense: 'perimetrale', tripleBlock: false };
  }

  // ---------- Etichette ----------
  function makeLabeler(system, names, swap) {
    const f = r => {
      const a = swap ? Role.swapped(r) : r;
      const s = Role.short(a, system);
      const n = names && names[a];
      return n ? `${s} (${n})` : s;
    };
    f.system = system; f.names = names || {}; f.swap = !!swap;
    f.swapping = b => makeLabeler(system, names, b);
    return f;
  }

  // ---------- Mappatura 4-2 / 6-2 ----------
  function functional(k, sys) {
    if (sys === '6-2') return Rot.setterInFront(k) ? [Rot.shifted(k, 3), true] : [k, false];
    if (sys === '4-2') return Rot.setterInFront(k) ? [k, false] : [Rot.shifted(k, 3), true];
    return [k, false];
  }
  function fn(s) {
    const [r, sw] = functional(s.rotation, s.system);
    return [Object.assign({}, s, { rotation: r }), sw];
  }

  function zonePoint(z) {
    return { 4: pt(0.17, 0.18), 3: pt(0.50, 0.18), 2: pt(0.83, 0.18), 5: pt(0.17, 0.72), 6: pt(0.50, 0.72), 1: pt(0.83, 0.72) }[z];
  }

  // ---------- Libero e ruoli in campo (funzionali) ----------
  const backMiddle = k => Lineup.isFront(Lineup.zoneOf('C1', k)) ? 'C2' : 'C1';
  const middleServes = k => Lineup.zoneOf(backMiddle(k), k) === 1;
  const liberoActive = s => s.useLibero && !(s.phase === 'battuta' && middleServes(s.rotation));
  function onCourt(zone, s) {
    const r = Lineup.roleInZone(zone, s.rotation);
    if (liberoActive(s) && r === backMiddle(s.rotation)) return 'L';
    return r;
  }
  function zoneMap(s) { const m = {}; for (let z = 1; z <= 6; z++) m[z] = onCourt(z, s); return m; }
  function slots(s) {
    const out = {};
    for (let z = 1; z <= 6; z++) {
      const base = Lineup.roleInZone(z, s.rotation);
      const front = Lineup.isFront(z);
      let slot;
      if (Role.isOutside(base)) slot = front ? 'FL' : 'BM';
      else if (Role.isMiddle(base)) slot = front ? 'FM' : 'BL';
      else slot = front ? 'FR' : 'BR';
      out[slot] = onCourt(z, s);
    }
    return out;
  }
  function place(sl, coords) {
    const out = {};
    for (const k in sl) if (coords[k]) out[sl[k]] = coords[k];
    return out;
  }
  const list = (roles, name) => roles.map(r => name(r)).join(', ');

  // ---------- Ricezioni (verificate: tutte regolari) ----------
  const R3 = [
    { O: pt(0.10, 0.14), C2: pt(0.50, 0.10), S1: pt(0.80, 0.58), S2: pt(0.20, 0.64), L: pt(0.50, 0.68), P: pt(0.93, 0.90) },
    { S2: pt(0.15, 0.56), O: pt(0.50, 0.12), C2: pt(0.85, 0.12), L: pt(0.42, 0.66), P: pt(0.60, 0.36), S1: pt(0.78, 0.64) },
    { C1: pt(0.07, 0.08), S2: pt(0.24, 0.56), O: pt(0.88, 0.10), P: pt(0.13, 0.28), S1: pt(0.50, 0.66), L: pt(0.80, 0.64) },
    { P: pt(0.40, 0.08), C1: pt(0.56, 0.10), S2: pt(0.80, 0.56), S1: pt(0.18, 0.64), L: pt(0.50, 0.68), O: pt(0.92, 0.90) },
    { S1: pt(0.15, 0.56), P: pt(0.60, 0.06), C1: pt(0.84, 0.12), L: pt(0.42, 0.66), O: pt(0.62, 0.92), S2: pt(0.80, 0.64) },
    { C2: pt(0.10, 0.10), S1: pt(0.24, 0.56), P: pt(0.92, 0.06), O: pt(0.08, 0.36), S2: pt(0.50, 0.66), L: pt(0.80, 0.64) }
  ];
  const R2 = [
    { S2: pt(0.30, 0.64), L: pt(0.70, 0.64), P: pt(0.95, 0.30), S1: pt(0.78, 0.08), C2: pt(0.50, 0.08), O: pt(0.08, 0.08) },
    { L: pt(0.30, 0.64), S1: pt(0.70, 0.64), C2: pt(0.78, 0.08), O: pt(0.50, 0.08), S2: pt(0.08, 0.08), P: pt(0.50, 0.30) },
    { S1: pt(0.30, 0.64), L: pt(0.70, 0.64), O: pt(0.78, 0.08), S2: pt(0.50, 0.08), C1: pt(0.08, 0.08), P: pt(0.05, 0.30) },
    { S1: pt(0.30, 0.64), L: pt(0.70, 0.64), O: pt(0.95, 0.93), S2: pt(0.92, 0.08), C1: pt(0.78, 0.08), P: pt(0.64, 0.08) },
    { L: pt(0.30, 0.64), S2: pt(0.70, 0.64), C1: pt(0.78, 0.08), P: pt(0.64, 0.08), S1: pt(0.08, 0.08), O: pt(0.50, 0.95) },
    { S2: pt(0.30, 0.64), L: pt(0.70, 0.64), P: pt(0.64, 0.08), S1: pt(0.50, 0.08), C2: pt(0.08, 0.08), O: pt(0.05, 0.93) }
  ];
  const R4 = [
    { O: pt(0.12, 0.50), S2: pt(0.36, 0.70), L: pt(0.64, 0.70), S1: pt(0.88, 0.50), P: pt(0.75, 0.93), C2: pt(0.50, 0.08) },
    { S2: pt(0.12, 0.50), L: pt(0.36, 0.70), O: pt(0.64, 0.70), S1: pt(0.88, 0.50), C2: pt(0.78, 0.08), P: pt(0.75, 0.93) },
    { S2: pt(0.12, 0.50), S1: pt(0.36, 0.70), L: pt(0.64, 0.70), O: pt(0.88, 0.50), C1: pt(0.08, 0.08), P: pt(0.30, 0.30) },
    { S1: pt(0.12, 0.50), L: pt(0.36, 0.70), O: pt(0.64, 0.70), S2: pt(0.88, 0.50), C1: pt(0.78, 0.08), P: pt(0.64, 0.08) },
    { S1: pt(0.12, 0.50), L: pt(0.36, 0.70), O: pt(0.64, 0.70), S2: pt(0.88, 0.50), C1: pt(0.78, 0.08), P: pt(0.64, 0.08) },
    { S1: pt(0.12, 0.50), O: pt(0.36, 0.70), S2: pt(0.64, 0.70), L: pt(0.88, 0.50), P: pt(0.64, 0.08), C2: pt(0.08, 0.08) }
  ];
  function receivers(type, k) {
    if (type === 3) return ['S1', 'S2', 'L'];
    if (type === 4) return ['S1', 'S2', 'L', 'O'];
    const s1Back = !Lineup.isFront(Lineup.zoneOf('S1', k));
    return ['L', s1Back ? 'S1' : 'S2'];
  }

  // ---------- Costruzione formazione (funzionale) ----------
  function core(s, name) {
    switch (s.phase) {
      case 'rotazione': return rotationBase(s, name);
      case 'battuta': return s.step === 'iniziale' ? serveStart(s, name) : serveAfter(s, name);
      case 'ricezione': return s.step === 'iniziale' ? receptionStart(s, name) : receptionAfter(s, name);
      case 'difesa': return s.defense === 'freeBall' ? freeBall(s, name) : defense(s, name);
      case 'copertura': return coverage(s, name);
    }
  }
  const F = (o) => Object.assign({ positions: {}, server: null, attacker: null, ball: null, checkOverlap: false,
    note: '', defenders: [], blockers: [], attackOrigin: null }, o);

  function rotationBase(s, name) {
    const zm = zoneMap(s), pos = {};
    for (const z in zm) pos[zm[z]] = zonePoint(+z);
    const front = [4, 3, 2].map(z => name(zm[z])).join(' – ');
    const back = [5, 6, 1].map(z => name(zm[z])).join(' – ');
    const inF = Rot.setterInFront(s.rotation);
    let note = `Alza ${name('P')}, in zona ${Rot.setterZone(s.rotation)} (${inF ? 'prima linea' : 'seconda linea'}).\nPrima linea (4-3-2): ${front}\nSeconda linea (5-6-1): ${back}\nAttaccanti di prima linea: ${inF ? 2 : 3}.`;
    if (liberoActive(s)) note += `\nIl libero sostituisce ${name(backMiddle(s.rotation))} in seconda linea.`;
    note += '\nSi ruota in senso orario ogni volta che si conquista il cambio palla: chi è in zona 2 va a battere.';
    return F({ positions: pos, note });
  }
  function serveStart(s, name) {
    const zm = zoneMap(s), pos = {};
    for (const z in zm) pos[zm[z]] = zonePoint(+z);
    const server = zm[1];
    pos[server] = pt(0.83, 1.10);
    let note = `Batte ${name(server)} dalla zona 1. Gli altri cinque devono rispettare l'ordine di rotazione fino a quando il battitore inizia il gesto del servizio (il battitore è escluso dalla regola). Regole 2026/27: palleggi, rimbalzi o spostamenti prima della battuta non contano come inizio del servizio.`;
    if (middleServes(s.rotation) && s.useLibero) note += '\nBatte il centrale: il libero non può battere, quindi il centrale resta in campo e il libero entra appena la squadra perde il servizio.';
    return F({ positions: pos, server, checkOverlap: true, note });
  }
  function serveAfter(s, name) {
    const sl = slots(s);
    const c = { FL: pt(0.18, 0.10), FM: pt(0.50, 0.10), FR: pt(0.82, 0.10), BL: pt(0.17, 0.72), BM: pt(0.50, 0.86), BR: pt(0.83, 0.72) };
    const note = `Dopo la battuta ognuno va nel suo posto specialistico.\nPrima linea: ${name(sl.FL)} a 4, ${name(sl.FM)} a 3, ${name(sl.FR)} a 2.\nSeconda linea: ${name(sl.BL)} in 5, ${name(sl.BM)} in 6, ${name(sl.BR)} in 1.`;
    return F({ positions: place(sl, c), note });
  }
  function receptionStart(s, name) {
    const table = s.reception === 2 ? R2 : (s.reception === 4 ? R4 : R3);
    const active = liberoActive(s), bm = backMiddle(s.rotation);
    const real = r => (r === 'L' && !active) ? bm : r;
    const pos = {};
    const t = table[s.rotation];
    for (const r in t) pos[real(r)] = t[r];
    const rec = receivers(s.reception, s.rotation).map(real);
    const others = ROLES.filter(r => pos[r] && !rec.includes(r) && r !== 'P');
    const z = Rot.setterZone(s.rotation);
    let note = `Ricezione a ${s.reception}: ricevono ${list(rec, name)}.`;
    if (Rot.setterInFront(s.rotation)) note += `\n${name('P')} è in prima linea (zona ${z}): resta a rete pronto ad alzare. Attaccanti di prima linea: 2.`;
    else note += `\n${name('P')} parte dalla zona ${z}, nascosto, e appena l'avversario batte entra a rete (penetrazione). Attaccanti di prima linea: 3.`;
    if (others.length) note += `\nNon ricevono: ${list(others, name)}.`;
    note += '\nRegole 2026/27: ci si può spostare appena il battitore avversario inizia il gesto del servizio, senza aspettare il colpo.';
    if (!s.useLibero) note += `\nSenza libero riceve al suo posto ${name(bm)}.`;
    return F({ positions: pos, ball: pt(0.5, 1.12), checkOverlap: true, note });
  }
  function receptionAfter(s, name) {
    const sl = slots(s);
    const c = { FL: pt(0.08, 0.40), FM: pt(0.48, 0.32), FR: pt(0.92, 0.40), BL: pt(0.20, 0.76), BM: pt(0.50, 0.72), BR: pt(0.84, 0.72) };
    const pos = place(sl, c);
    pos.P = pt(0.66, 0.06);
    const fh = ['FL', 'FM', 'FR'].map(k => sl[k]).filter(r => r && r !== 'P');
    const bh = ['BM', 'BR'].map(k => sl[k]).filter(r => r && r !== 'P' && r !== 'L');
    const note = `Transizione all'attacco: ${name('P')} va ad alzare tra zona 2 e 3.\nAttaccanti di prima linea: ${list(fh, name)}.\nPossibili attacchi di seconda linea (staccando dietro i 3 m): ${list(bh, name)}.`;
    return F({ positions: pos, ball: pt(0.66, -0.02), note });
  }

  const MIRROR = { FL: 'FR', FR: 'FL', BL: 'BR', BR: 'BL', FM: 'FM', BM: 'BM' };
  function defenseRight(scheme, triple) {
    const c = { FR: pt(0.86, 0.04), FM: pt(0.71, 0.04) };
    const blockers = ['FR', 'FM'];
    if (triple) { c.FL = pt(0.56, 0.04); blockers.push('FL'); }
    if (scheme === 'perimetrale' || scheme === 'freeBall') {
      if (triple) { c.BR = pt(0.90, 0.64); c.BM = pt(0.55, 0.90); c.BL = pt(0.12, 0.62); }
      else { c.FL = pt(0.15, 0.36); c.BR = pt(0.90, 0.66); c.BM = pt(0.58, 0.90); c.BL = pt(0.12, 0.70); }
    } else if (scheme === 'avanzato') {
      c.BM = pt(0.62, 0.42); c.BR = pt(0.90, 0.72); c.BL = pt(0.14, 0.76);
      if (!triple) c.FL = pt(0.14, 0.36);
    } else {
      c.BR = pt(0.82, 0.36); c.BM = pt(0.86, 0.84); c.BL = pt(triple ? 0.30 : 0.36, 0.82);
      if (!triple) c.FL = pt(0.13, 0.40);
    }
    return [c, blockers];
  }
  function defenseCenter(scheme, triple) {
    const deep = scheme === 'perimetrale' || scheme === 'freeBall';
    if (triple) {
      const c = { FL: pt(0.36, 0.04), FM: pt(0.50, 0.04), FR: pt(0.64, 0.04) };
      if (deep) { c.BL = pt(0.15, 0.62); c.BM = pt(0.50, 0.88); c.BR = pt(0.85, 0.62); }
      else { c.BL = pt(0.15, 0.72); c.BM = pt(0.50, 0.42); c.BR = pt(0.85, 0.72); }
      return [c, ['FL', 'FM', 'FR']];
    }
    const c = { FM: pt(0.50, 0.04) };
    if (deep) { c.FL = pt(0.15, 0.30); c.FR = pt(0.85, 0.30); c.BL = pt(0.15, 0.66); c.BM = pt(0.50, 0.88); c.BR = pt(0.85, 0.66); }
    else { c.FL = pt(0.15, 0.32); c.FR = pt(0.85, 0.32); c.BL = pt(0.15, 0.74); c.BM = pt(0.50, 0.44); c.BR = pt(0.85, 0.74); }
    return [c, ['FM']];
  }
  function defense(s, name) {
    const sl = slots(s);
    let coords, blockSlots, ball, side;
    if (s.attack === 4) {
      [coords, blockSlots] = defenseRight(s.defense, s.tripleBlock);
      ball = pt(0.88, -0.09); side = 'Attacco avversario da posto 4 (sulla nostra destra).';
    } else if (s.attack === 3) {
      [coords, blockSlots] = defenseCenter(s.defense, s.tripleBlock);
      ball = pt(0.50, -0.09); side = 'Attacco avversario dal centro.';
    } else {
      const [c, b] = defenseRight(s.defense, s.tripleBlock);
      coords = {};
      for (const k in c) coords[MIRROR[k]] = pt(1 - c[k].x, c[k].y);
      blockSlots = b.map(k => MIRROR[k]);
      ball = pt(0.12, -0.09); side = 'Attacco avversario da posto 2 (sulla nostra sinistra).';
    }
    const blockers = blockSlots.map(k => sl[k]).filter(Boolean);
    const defenders = ['FL', 'FM', 'FR', 'BL', 'BM', 'BR'].filter(k => !blockSlots.includes(k)).map(k => sl[k]).filter(Boolean);
    let note = side + `\nMuro a ${blockers.length}: ${blockers.map(r => name(r)).join(' + ')}.`;
    if (s.defense === 'avanzato') note += '\n6 avanzato: chi è in zona 6 sale dietro al muro per coprire pallonetti e palle smorzate; i difensori laterali coprono il fondo.';
    else if (s.defense === 'rotazione') note += '\nDifesa in rotazione: il difensore sul lato dell\'attacco sale a coprire il pallonetto, il 6 ruota verso la linea e il 5 copre la diagonale lunga.';
    else note += '\nDifesa perimetrale (6 dietro): i difensori stanno lungo il perimetro del campo, il 6 in fondo dietro al muro.';
    if (s.tripleBlock) note += '\nCon il muro a 3 restano solo tre difensori: la palla corta va coperta da chi è più vicino.';
    note += '\nAree colorate: la zona di competenza di ogni difensore. Area scura: ombra del muro, coperta dai muratori.';
    return F({ positions: place(sl, coords), ball, note, defenders, blockers, attackOrigin: pt(ball.x, -0.35) });
  }
  function freeBall(s, name) {
    const sl = slots(s);
    const c = { FL: pt(0.12, 0.40), FM: pt(0.45, 0.42), FR: pt(0.88, 0.42), BL: pt(0.18, 0.70), BM: pt(0.50, 0.80), BR: pt(0.84, 0.70) };
    const pos = place(sl, c);
    pos.P = pt(0.66, 0.08);
    const defenders = ['FL', 'FM', 'FR', 'BL', 'BM', 'BR'].map(k => sl[k]).filter(r => r && r !== 'P');
    const note = `Free ball: l'avversario rimanda una palla facile.\nGli attaccanti di prima linea si staccano dalla rete fino ai 3 m per ricevere e poi attaccare; ${name('P')} entra subito a rete ad alzare.\nTutti gli altri ricevono: le aree colorate mostrano chi prende cosa.`;
    return F({ positions: pos, ball: pt(0.5, -0.10), note, defenders });
  }
  function coverage(s, name) {
    const sl = slots(s);
    let coords, attackerSlot, setterPoint, title;
    if (s.attack === 4) {
      attackerSlot = 'FL';
      coords = { FL: pt(0.12, 0.05), FM: pt(0.30, 0.22), FR: pt(0.78, 0.28), BL: pt(0.10, 0.32), BM: pt(0.30, 0.42), BR: pt(0.60, 0.56) };
      setterPoint = pt(0.52, 0.17); title = 'Attacco da posto 4';
    } else if (s.attack === 3) {
      attackerSlot = 'FM';
      coords = { FM: pt(0.52, 0.05), FL: pt(0.30, 0.22), FR: pt(0.80, 0.26), BL: pt(0.26, 0.44), BM: pt(0.50, 0.36), BR: pt(0.76, 0.48) };
      setterPoint = pt(0.68, 0.17); title = 'Attacco dal centro';
    } else if (Rot.setterInFront(s.rotation)) {
      attackerSlot = 'BR';
      coords = { BR: pt(0.85, 0.40), FM: pt(0.60, 0.28), FL: pt(0.30, 0.32), BM: pt(0.66, 0.54), BL: pt(0.42, 0.64) };
      setterPoint = pt(0.74, 0.22); title = 'Palleggiatore in prima linea: attacco di seconda linea da zona 1';
    } else {
      attackerSlot = 'FR';
      coords = { FR: pt(0.88, 0.05), FM: pt(0.60, 0.25), FL: pt(0.30, 0.32), BR: pt(0.90, 0.32), BM: pt(0.70, 0.42), BL: pt(0.45, 0.58) };
      setterPoint = pt(0.76, 0.19); title = 'Attacco da posto 2';
    }
    const pos = place(sl, coords);
    pos.P = setterPoint;
    const attacker = sl[attackerSlot];
    const a = pos[attacker];
    const others = Object.keys(pos).filter(r => r !== attacker)
      .sort((u, v) => Math.hypot(pos[u].x - a.x, pos[u].y - a.y) - Math.hypot(pos[v].x - a.x, pos[v].y - a.y));
    const note = `${title}: attacca ${name(attacker)}.\nCopertura vicina (a semicerchio, bassi, pronti al pallone murato): ${list(others.slice(0, 3), name)}.\nSeconda fascia di copertura: ${list(others.slice(3), name)}.`;
    return F({ positions: pos, attacker, ball: pt(a.x, a.y - 0.07), note });
  }

  function overlapCore(pos, s, name) {
    const zm = zoneMap(s);
    const excluded = s.phase === 'battuta' ? 1 : null;
    const p = z => (z === excluded || !zm[z]) ? null : pos[zm[z]];
    const out = [];
    for (const [f, b] of [[4, 5], [3, 6], [2, 1]]) {
      const pf = p(f), pb = p(b);
      if (pf && pb && !(pf.y < pb.y)) out.push(`${name(zm[b])} (zona ${b}) deve stare più lontano dalla rete di ${name(zm[f])} (zona ${f}).`);
    }
    for (const [l, r] of [[4, 3], [3, 2], [5, 6], [6, 1]]) {
      const pl = p(l), pr = p(r);
      if (pl && pr && !(pl.x < pr.x)) out.push(`${name(zm[l])} (zona ${l}) deve stare più a sinistra di ${name(zm[r])} (zona ${r}).`);
    }
    return out;
  }

  function swapFormation(f) {
    const pos = {};
    for (const r in f.positions) pos[Role.swapped(r)] = f.positions[r];
    return Object.assign({}, f, {
      positions: pos,
      server: f.server && Role.swapped(f.server),
      attacker: f.attacker && Role.swapped(f.attacker),
      defenders: f.defenders.map(Role.swapped),
      blockers: f.blockers.map(Role.swapped)
    });
  }

  // ---------- API pubblica (ruoli reali) ----------
  const Engine = {
    formation(s, labeler) {
      const [fs, sw] = fn(s);
      const f = core(fs, labeler.swapping(sw));
      return sw ? swapFormation(f) : f;
    },
    overlapViolations(pos, s, labeler) {
      const [fs, sw] = fn(s);
      let fpos = pos;
      if (sw) { fpos = {}; for (const r in pos) fpos[Role.swapped(r)] = pos[r]; }
      return overlapCore(fpos, fs, labeler.swapping(sw));
    },
    courtMap(s) {
      const [fs, sw] = fn(s);
      const zm = zoneMap(fs), out = {};
      for (const z in zm) out[z] = sw ? Role.swapped(zm[z]) : zm[z];
      return out;
    },
    server: s => Lineup.roleInZone(1, s.rotation),
    liberoReplaces(s) {
      const [fs, sw] = fn(s);
      if (!liberoActive(fs)) return null;
      const r = backMiddle(fs.rotation);
      return sw ? Role.swapped(r) : r;
    },
    activeSetter: s => fn(s)[1] ? 'O' : 'P',
    frontAttackers: s => Rot.setterInFront(fn(s)[0].rotation) ? 2 : 3,
    setterInFront: s => Rot.setterInFront(fn(s)[0].rotation),
    zonePoint
  };

  // ---------- Geometria: aree e ombra del muro ----------
  const Geo = {
    clip(poly, a, b, c) {
      if (!poly.length) return [];
      const out = [];
      for (let i = 0; i < poly.length; i++) {
        const p = poly[i], q = poly[(i + 1) % poly.length];
        const fp = a * p.x + b * p.y - c, fq = a * q.x + b * q.y - c;
        if (fp <= 0) out.push(p);
        if ((fp < 0 && fq > 0) || (fp > 0 && fq < 0)) {
          const t = fp / (fp - fq);
          out.push(pt(p.x + (q.x - p.x) * t, p.y + (q.y - p.y) * t));
        }
      }
      return out;
    },
    areas(pos) {
      const out = {};
      for (const r in pos) {
        const p = pos[r];
        let poly = [pt(0, 0), pt(1, 0), pt(1, 1), pt(0, 1)];
        for (const o in pos) {
          if (o === r) continue;
          const q = pos[o];
          poly = Geo.clip(poly, 2 * (q.x - p.x), 2 * (q.y - p.y), (q.x * q.x + q.y * q.y) - (p.x * p.x + p.y * p.y));
        }
        if (poly.length >= 3) out[r] = poly;
      }
      return out;
    },
    blockShadow(blockers, origin, depth = 0.5) {
      if (!blockers.length || origin.y >= 0) return [];
      const l = Math.min(...blockers.map(b => b.x)) - 0.07, r = Math.max(...blockers.map(b => b.x)) + 0.07;
      const f = (depth - origin.y) / (0 - origin.y);
      const poly = [pt(l, 0), pt(r, 0), pt(origin.x + (r - origin.x) * f, depth), pt(origin.x + (l - origin.x) * f, depth)];
      return Geo.clip(Geo.clip(poly, -1, 0, 0), 1, 0, 1);
    },
    centroid(poly) {
      const n = Math.max(poly.length, 1);
      return pt(poly.reduce((s, p) => s + p.x, 0) / n, poly.reduce((s, p) => s + p.y, 0) / n);
    }
  };

  // ---------- Squadre miste ----------
  const MIXED_PRESETS = {
    csen42: { maxMen: 4, minWomen: 2, maxMenFront: 0, noThreeMenInRow: false, alternate: false, netHeight: '2,35 m', name: 'CSEN Misto 4+2',
      note: 'Almeno 2 donne sempre in campo (massimo 4 uomini). Doppio libero ammesso: un libero donna può sostituire un uomo, un uomo non può sostituire una donna. Rete 2,35 m. Partite al meglio dei 3 set (25-25-15). Per il resto valgono le regole FIPAV.' },
    misto33: { maxMen: 3, minWomen: 3, maxMenFront: 0, noThreeMenInRow: false, alternate: false, netHeight: '2,35 m', name: 'Misto 3+3',
      note: '3 uomini e 3 donne in campo. Molti tornei chiedono anche l\'alternanza uomo/donna o vietano 2 uomini su 3 in prima linea: attiva le opzioni se il tuo regolamento le prevede.' },
    misto24: { maxMen: 2, minWomen: 4, maxMenFront: 0, noThreeMenInRow: false, alternate: false, netHeight: '2,35 m', name: 'Misto 2+4',
      note: 'Massimo 2 uomini in campo, almeno 4 donne.' }
  };
  const Mixed = {
    presets: MIXED_PRESETS,
    violations(zones, rules) {
      const out = [];
      const vals = Object.values(zones);
      const men = vals.filter(g => g === 'M').length, women = vals.filter(g => g === 'F').length;
      const unknown = 6 - Object.keys(zones).length;
      if (men > rules.maxMen) out.push(`Troppi uomini in campo: ${men} (massimo ${rules.maxMen}).`);
      if (women + unknown < rules.minWomen) out.push(`Poche donne in campo: ${women} (minimo ${rules.minWomen}).`);
      if (rules.maxMenFront > 0) {
        const f = [2, 3, 4].filter(z => zones[z] === 'M').length;
        if (f > rules.maxMenFront) out.push(`Troppi uomini in prima linea: ${f} (massimo ${rules.maxMenFront}).`);
      }
      const seq = [1, 2, 3, 4, 5, 6].map(z => zones[z]);
      if (rules.noThreeMenInRow) {
        for (let i = 0; i < 6; i++) if (seq[i] === 'M' && seq[(i + 1) % 6] === 'M' && seq[(i + 2) % 6] === 'M') {
          out.push(`Tre uomini consecutivi (zone ${i + 1}, ${(i + 1) % 6 + 1}, ${(i + 2) % 6 + 1}).`); break;
        }
      }
      if (rules.alternate) {
        for (let i = 0; i < 6; i++) {
          const a = seq[i], b = seq[(i + 1) % 6];
          if (a && b && a === b) { out.push(`Manca l'alternanza uomo/donna tra le zone ${i + 1} e ${(i + 1) % 6 + 1}.`); break; }
        }
      }
      return out;
    },
    zoneGenders(s, gender) {
      const out = {}, map = Engine.courtMap(s);
      for (const z in map) { const g = gender(map[z]); if (g) out[z] = g; }
      return out;
    },
    checkAll(system, useLibero, rules, gender) {
      const out = []; let incomplete = false;
      for (const k of Rot.all) {
        const s = Object.assign(defaultSituation(), { system, phase: 'ricezione', rotation: k, useLibero });
        const z = Mixed.zoneGenders(s, gender);
        if (Object.keys(z).length < 6) incomplete = true;
        for (const v of Mixed.violations(z, rules)) out.push(`${Rot.name(k)}: ${v}`);
      }
      if (incomplete) out.unshift('Indica il sesso di tutti i titolari (nella Rosa) per un controllo completo.');
      return out;
    },
    summary(r) {
      const p = [`max ${r.maxMen} uomini`, `min ${r.minWomen} donne`];
      if (r.maxMenFront > 0) p.push(`max ${r.maxMenFront} uomini a rete`);
      if (r.noThreeMenInRow) p.push('no 3 uomini di fila');
      if (r.alternate) p.push('alternanza M/F');
      return p.join(' · ');
    }
  };

  // ---------- Statistiche ----------
  const STAT_ACTIONS = {
    ace: { title: 'Ace', short: 'Ace', point: true }, serveIn: { title: 'Battuta in campo', short: 'In', point: null },
    serveErr: { title: 'Errore battuta', short: 'Err', point: false },
    rec3: { title: 'Ricezione perfetta', short: '#', point: null }, rec2: { title: 'Ricezione buona', short: '+', point: null },
    rec1: { title: 'Ricezione scarsa', short: '–', point: null }, recErr: { title: 'Errore ricezione', short: 'Err', point: false },
    attackPoint: { title: 'Punto in attacco', short: 'Punto', point: true }, attackIn: { title: 'Attacco giocato', short: 'In', point: null },
    attackErr: { title: 'Errore attacco', short: 'Err', point: false },
    blockPoint: { title: 'Muro punto', short: 'Muro', point: true }, error: { title: 'Altro errore', short: 'Fallo', point: false }
  };
  const Stats = {
    actions: STAT_ACTIONS,
    groups: [
      { title: 'Battuta', actions: ['ace', 'serveIn', 'serveErr'], colors: ['#FF8C1F', '#FFCC1A'] },
      { title: 'Ricezione', actions: ['rec3', 'rec2', 'rec1', 'recErr'], colors: ['#21C778', '#0DA89E'] },
      { title: 'Attacco', actions: ['attackPoint', 'attackIn', 'attackErr'], colors: ['#FA4278', '#FF8C1F'] },
      { title: 'Altro', actions: ['blockPoint', 'error'], colors: ['#8552FA', '#1F6BFA'] }
    ],
    n: (st, a) => (st && st[a]) || 0,
    serves: st => Stats.n(st, 'ace') + Stats.n(st, 'serveIn') + Stats.n(st, 'serveErr'),
    receptions: st => ['rec3', 'rec2', 'rec1', 'recErr'].reduce((s, a) => s + Stats.n(st, a), 0),
    attacks: st => Stats.n(st, 'attackPoint') + Stats.n(st, 'attackIn') + Stats.n(st, 'attackErr'),
    points: st => Stats.n(st, 'ace') + Stats.n(st, 'attackPoint') + Stats.n(st, 'blockPoint'),
    errors: st => Stats.n(st, 'serveErr') + Stats.n(st, 'recErr') + Stats.n(st, 'attackErr') + Stats.n(st, 'error'),
    recAvg(st) { const r = Stats.receptions(st); return r ? (Stats.n(st, 'rec3') * 3 + Stats.n(st, 'rec2') * 2 + Stats.n(st, 'rec1')) / r : null; },
    recPos(st) { const r = Stats.receptions(st); return r ? Math.round((Stats.n(st, 'rec3') + Stats.n(st, 'rec2')) / r * 100) : null; },
    attEff(st) { const a = Stats.attacks(st); return a ? Math.round((Stats.n(st, 'attackPoint') - Stats.n(st, 'attackErr')) / a * 100) : null; },
    isEmpty: st => !st || Object.values(st).reduce((s, v) => s + v, 0) === 0
  };

  global.CM = Object.assign(global.CM || {}, {
    ROLES, COURT_ROLES, SYSTEMS, SYSTEM_DESC, PHASES, PHASE_COLORS, DEFENSES,
    Role, Rot, Lineup, Engine, Geo, Mixed, Stats, makeLabeler, defaultSituation,
    _test: { R2, R3, R4, zoneMap, liberoActive, backMiddle }
  });
})(typeof window !== 'undefined' ? window : globalThis);
