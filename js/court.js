/* CoachMate – campo da gioco in SVG */
(function (global) {
  'use strict';
  const CM = global.CM;
  const { s, h, Geo } = CM;
  let counter = 0;
  const R = 0.056; // raggio pallino

  function createCourt(opts = {}) {
    const id = 'c' + (++counter);
    const wrap = h('div', { class: 'court-wrap' });
    const svg = s('svg', { viewBox: '-0.08 -0.16 1.16 1.38', preserveAspectRatio: 'xMidYMid meet' });
    wrap.appendChild(svg);

    // ---- Definizioni (sfumature) ----
    const defs = s('defs', null,
      s('linearGradient', { id: id + 'court', x1: '0', y1: '0', x2: '1', y2: '1' },
        s('stop', { offset: '0', 'stop-color': '#F28538' }), s('stop', { offset: '1', 'stop-color': '#DB6629' })),
      s('linearGradient', { id: id + 'opp', x1: '0', y1: '0', x2: '0', y2: '1' },
        s('stop', { offset: '0', 'stop-color': '#DB6629', 'stop-opacity': '0.15' }), s('stop', { offset: '1', 'stop-color': '#DB6629', 'stop-opacity': '0.55' })),
      s('radialGradient', { id: id + 'tok', cx: '0.35', cy: '0.3', r: '0.75' },
        s('stop', { offset: '0', 'stop-color': '#fff', 'stop-opacity': '0.35' }), s('stop', { offset: '1', 'stop-color': '#fff', 'stop-opacity': '0' })),
      s('filter', { id: id + 'sh', x: '-50%', y: '-50%', width: '200%', height: '200%' },
        s('feDropShadow', { dx: '0', dy: '0.008', stdDeviation: '0.008', 'flood-color': '#000', 'flood-opacity': '0.4' })));
    svg.appendChild(defs);

    // ---- Campo statico ----
    const st = s('g');
    st.appendChild(s('rect', { x: 0, y: -0.16, width: 1, height: 0.16, fill: `url(#${id}opp)` }));
    st.appendChild(s('rect', { x: 0, y: 0, width: 1, height: 1, fill: `url(#${id}court)` }));
    st.appendChild(s('rect', { x: 0, y: 0, width: 1, height: 1 / 3, fill: '#fff', opacity: 0.08 }));
    for (let i = 1; i < 12; i++) st.appendChild(s('line', { x1: i / 12, y1: 0, x2: i / 12, y2: 1, stroke: '#fff', 'stroke-opacity': 0.035, 'stroke-width': 0.003 }));
    st.appendChild(s('rect', { x: 0, y: 0, width: 1, height: 1, fill: 'none', stroke: '#fff', 'stroke-width': 0.009 }));
    st.appendChild(s('line', { x1: 0, y1: 1 / 3, x2: 1, y2: 1 / 3, stroke: '#fff', 'stroke-width': 0.007 }));
    for (const [a, b] of [[-0.06, 0], [1, 1.06]]) st.appendChild(s('line', { x1: a, y1: 1 / 3, x2: b, y2: 1 / 3, stroke: '#fff', 'stroke-opacity': 0.7, 'stroke-width': 0.006, 'stroke-dasharray': '0.012 0.012' }));
    // rete
    st.appendChild(s('line', { x1: -0.05, y1: 0, x2: 1.05, y2: 0, stroke: '#000', 'stroke-opacity': 0.25, 'stroke-width': 0.034, 'stroke-linecap': 'round' }));
    st.appendChild(s('line', { x1: -0.05, y1: 0, x2: 1.05, y2: 0, stroke: '#14141F', 'stroke-width': 0.02, 'stroke-linecap': 'round' }));
    st.appendChild(s('line', { x1: -0.05, y1: 0, x2: 1.05, y2: 0, stroke: '#fff', 'stroke-opacity': 0.55, 'stroke-width': 0.003, 'stroke-dasharray': '0.006 0.009' }));
    st.appendChild(s('line', { x1: -0.05, y1: -0.008, x2: 1.05, y2: -0.008, stroke: '#fff', 'stroke-width': 0.005 }));
    for (const ax of [0, 1]) for (let k = 0; k < 4; k++)
      st.appendChild(s('line', { x1: ax, y1: 0.012 - k * 0.022, x2: ax, y2: 0.012 - (k + 1) * 0.022, stroke: k % 2 ? '#fff' : '#E02424', 'stroke-width': 0.011 }));
    for (const px of [-0.05, 1.05]) st.appendChild(s('circle', { cx: px, cy: 0, r: 0.011, fill: '#fff' }));
    st.appendChild(s('text', { x: 0.5, y: -0.045, 'text-anchor': 'middle', fill: '#fff', 'fill-opacity': 0.8, 'font-size': 0.034, 'font-weight': 700 }, 'RETE'));
    svg.appendChild(st);

    const zonesL = s('g'); const areasL = s('g'); const arrowsL = s('g'); const ballL = s('g'); const tokensL = s('g');
    svg.append(zonesL, areasL, arrowsL, ballL, tokensL);
    // numeri zone
    for (let z = 1; z <= 6; z++) {
      const p = CM.Engine.zonePoint(z);
      zonesL.appendChild(s('text', { x: p.x, y: p.y + (CM.Lineup.isFront(z) ? 0.08 : 0.03), 'text-anchor': 'middle', 'dominant-baseline': 'middle',
        fill: '#fff', 'fill-opacity': 0.22, 'font-size': 0.17, 'font-weight': 900 }, String(z)));
    }

    const tokens = {};
    let state = {};

    function svgPoint(evt) {
      const ptn = svg.createSVGPoint();
      ptn.x = evt.clientX; ptn.y = evt.clientY;
      const p = ptn.matrixTransform(svg.getScreenCTM().inverse());
      return { x: Math.min(1.06, Math.max(-0.06, p.x)), y: Math.min(1.18, Math.max(-0.12, p.y)) };
    }

    function makeToken(role) {
      const g = s('g', { class: 'token' });
      const halo = s('circle', { r: R * 1.32, fill: 'transparent', stroke: '#fff', 'stroke-width': 0 });
      const body = s('circle', { r: R, filter: `url(#${id}sh)` });
      const gloss = s('circle', { r: R, fill: `url(#${id}tok)` });
      const ring = s('circle', { r: R, fill: 'none', stroke: '#fff', 'stroke-width': 0.007 });
      const label = s('text', { 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': 0.042, 'font-weight': 900, y: 0.002 });
      const name = s('text', { 'text-anchor': 'middle', y: R + 0.035, 'font-size': 0.03, 'font-weight': 700, fill: '#fff',
        stroke: 'rgba(0,0,0,0.75)', 'stroke-width': 0.012, 'paint-order': 'stroke', 'stroke-linejoin': 'round' });
      const badge = s('g', { transform: `translate(${R * 0.8} ${-R * 0.8})` }, s('circle', { r: 0.024, fill: '#fff' }),
        s('text', { 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': 0.026 }, '🏐'));
      g.append(halo, body, gloss, ring, label, name, badge);
      g.parts = { halo, body, ring, label, name, badge };
      g.addEventListener('pointerdown', e => {
        if (!state.interactive) return;
        e.preventDefault();
        g.setPointerCapture(e.pointerId);
        g.classList.add('dragging');
        const move = ev => {
          const p = svgPoint(ev);
          g.style.transform = `translate(${p.x}px, ${p.y}px)`;
          state.onMove && state.onMove(role, p);
        };
        const up = ev => {
          g.classList.remove('dragging');
          g.removeEventListener('pointermove', move);
          g.removeEventListener('pointerup', up);
          g.removeEventListener('pointercancel', up);
          state.onEnd && state.onEnd(role);
        };
        g.addEventListener('pointermove', move);
        g.addEventListener('pointerup', up);
        g.addEventListener('pointercancel', up);
      });
      tokensL.appendChild(g);
      return g;
    }

    function current(role) {
      const o = state.overrides && state.overrides[role];
      return o || (state.formation && state.formation.positions[role]);
    }

    function drawAreas() {
      areasL.innerHTML = '';
      const f = state.formation;
      if (!f || !state.showAreas || !f.defenders.length) return;
      const pts = {};
      for (const r of f.defenders) { const p = current(r); if (p) pts[r] = { x: Math.min(1, Math.max(0, p.x)), y: Math.min(1, Math.max(0, p.y)) }; }
      const areas = Geo.areas(pts);
      for (const r in areas) {
        areasL.appendChild(s('polygon', { points: areas[r].map(p => `${p.x},${p.y}`).join(' '), fill: CM.Role.areaColor(r), 'fill-opacity': 0.55,
          stroke: '#fff', 'stroke-opacity': 0.9, 'stroke-width': 0.004, 'stroke-dasharray': '0.014 0.011' }));
      }
      if (f.attackOrigin) {
        const sh = Geo.blockShadow(f.blockers.map(current).filter(Boolean), f.attackOrigin);
        if (sh.length >= 3) {
          areasL.appendChild(s('polygon', { points: sh.map(p => `${p.x},${p.y}`).join(' '), fill: '#000', 'fill-opacity': 0.38, stroke: '#fff', 'stroke-opacity': 0.7, 'stroke-width': 0.003, 'stroke-dasharray': '0.008 0.008' }));
          const c = Geo.centroid(sh);
          areasL.appendChild(s('text', { x: c.x, y: c.y + 0.08, 'text-anchor': 'middle', fill: '#fff', 'font-size': 0.03, 'font-weight': 800 }, 'ombra del muro'));
        }
      }
    }

    function drawArrows() {
      arrowsL.innerHTML = '';
      const from = state.arrowsFrom, f = state.formation;
      if (!from || !f) return;
      for (const r in f.positions) {
        const a = from[r], b = f.positions[r];
        if (!a) continue;
        const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
        if (len < 0.06) continue;
        const ux = dx / len, uy = dy / len;
        const end = { x: b.x - ux * 0.075, y: b.y - uy * 0.075 };
        arrowsL.appendChild(s('line', { x1: a.x, y1: a.y, x2: end.x, y2: end.y, stroke: '#000', 'stroke-opacity': 0.35, 'stroke-width': 0.014, 'stroke-linecap': 'round' }));
        arrowsL.appendChild(s('line', { x1: a.x, y1: a.y, x2: end.x, y2: end.y, stroke: '#fff', 'stroke-width': 0.007, 'stroke-linecap': 'round', 'stroke-dasharray': '0.02 0.014' }));
        const hl = 0.04;
        const p1 = `${end.x},${end.y}`;
        const p2 = `${end.x - ux * hl - uy * hl * 0.6},${end.y - uy * hl + ux * hl * 0.6}`;
        const p3 = `${end.x - ux * hl + uy * hl * 0.6},${end.y - uy * hl - ux * hl * 0.6}`;
        arrowsL.appendChild(s('polygon', { points: `${p1} ${p2} ${p3}`, fill: '#fff' }));
      }
    }

    function drawBall() {
      ballL.innerHTML = '';
      const b = state.formation && state.formation.ball;
      if (!b) return;
      ballL.appendChild(s('g', { transform: `translate(${b.x} ${b.y})` },
        s('circle', { r: 0.03, fill: '#fff', stroke: '#1A4DCC', 'stroke-width': 0.006 }),
        s('path', { d: 'M-0.03 0 Q0 -0.012 0.03 0 M0 -0.03 Q-0.012 0 0 0.03', stroke: '#1A4DCC', 'stroke-width': 0.004, fill: 'none' })));
    }

    function update(next) {
      state = Object.assign({}, state, next);
      const f = state.formation, lab = state.labeler;
      zonesL.style.display = state.showZones ? '' : 'none';
      wrap.classList.toggle('no-anim', !!state.noAnim);
      for (const role of CM.ROLES) {
        const p = f && f.positions[role] ? current(role) : null;
        if (!p) { if (tokens[role]) tokens[role].style.display = 'none'; continue; }
        const g = tokens[role] || (tokens[role] = makeToken(role));
        g.style.display = '';
        if (!g.classList.contains('dragging')) g.style.transform = `translate(${p.x}px, ${p.y}px)`;
        const sys = lab ? lab.system : '5-1';
        g.parts.body.setAttribute('fill', CM.Role.color(role, sys));
        g.parts.label.setAttribute('fill', CM.Role.textColor(role, sys));
        g.parts.label.textContent = CM.Role.short(role, sys);
        g.parts.name.textContent = (lab && lab.names[role]) || '';
        const isDef = state.showAreas && f.defenders.includes(role);
        g.parts.halo.setAttribute('fill', isDef ? CM.Role.areaColor(role) : 'transparent');
        g.parts.halo.setAttribute('stroke-width', isDef ? 0.004 : 0);
        const special = f.server === role || f.attacker === role;
        g.parts.ring.setAttribute('stroke-width', special ? 0.012 : 0.007);
        g.parts.badge.style.display = f.server === role ? '' : 'none';
        g.style.cursor = state.interactive ? 'grab' : 'default';
      }
      drawAreas(); drawArrows(); drawBall();
    }

    return { el: wrap, svg, update, redrawAreas: drawAreas };
  }

  /** Converte il campo in PNG (per esportare l'immagine). */
  function courtToPNG(svgEl, width = 1100) {
    return new Promise((resolve, reject) => {
      const clone = svgEl.cloneNode(true);
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      clone.querySelectorAll('.token').forEach(g => {
        const m = /translate\(([-\d.e]+)px,\s*([-\d.e]+)px\)/.exec(g.style.transform || '');
        if (m) g.setAttribute('transform', `translate(${m[1]} ${m[2]})`);
        g.removeAttribute('style');
        if (g.style) g.style.display = '';
      });
      // rimuove i pallini nascosti
      svgEl.querySelectorAll('.token').forEach((g, i) => { if (g.style.display === 'none') clone.querySelectorAll('.token')[i].remove(); });
      const height = Math.round(width * 1.38 / 1.16);
      clone.setAttribute('width', width); clone.setAttribute('height', height);
      const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      bg.setAttribute('x', -0.08); bg.setAttribute('y', -0.16); bg.setAttribute('width', 1.16); bg.setAttribute('height', 1.38); bg.setAttribute('fill', '#0B4F86');
      clone.insertBefore(bg, clone.firstChild.nextSibling);
      const data = new XMLSerializer().serializeToString(clone);
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = width; c.height = height;
        c.getContext('2d').drawImage(img, 0, 0, width, height);
        c.toBlob(b => b ? resolve(b) : reject(new Error('png')), 'image/png');
      };
      img.onerror = reject;
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(data);
    });
  }

  Object.assign(CM, { createCourt, courtToPNG });
})(window);
