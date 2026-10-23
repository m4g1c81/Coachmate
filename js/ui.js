/* CoachMate – componenti di interfaccia */
(function (global) {
  'use strict';
  const CM = global.CM;
  const SVGNS = 'http://www.w3.org/2000/svg';

  // ---------- Creazione elementi ----------
  function h(tag, attrs, ...children) {
    const el = document.createElement(tag);
    applyAttrs(el, attrs);
    append(el, children);
    return el;
  }
  function s(tag, attrs, ...children) {
    const el = document.createElementNS(SVGNS, tag);
    applyAttrs(el, attrs);
    append(el, children);
    return el;
  }
  function applyAttrs(el, attrs) {
    if (!attrs) return;
    for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.setAttribute('class', v);
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === 'value') el.value = v;
      else if (k === 'checked') el.checked = !!v;
      else if (k === 'html') el.innerHTML = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
  }
  function append(el, children) {
    for (const c of children.flat(Infinity)) {
      if (c == null || c === false) continue;
      el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
    }
  }
  const grad = (a, b) => `linear-gradient(135deg, ${a}, ${b})`;

  // ---------- Icone (disegnate a mano, 24×24) ----------
  const P = {
    back: 'M15 5l-7 7 7 7', chevron: 'M9 5l7 7-7 7', plus: 'M12 5v14M5 12h14', minus: 'M5 12h14',
    x: 'M6 6l12 12M18 6L6 18', check: 'M5 12.5l4.5 4.5L19 7',
    more: 'M5 12h.01M12 12h.01M19 12h.01',
    rotate: 'M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6',
    serve: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 3c-2 3-2.5 7 0 9s7 2 9 1M3.5 9c3 1 6 .5 8.5-3M8 20c0-4 2-7 4-8',
    hand: 'M8 13V6a1.5 1.5 0 0 1 3 0v6M11 11V4.5a1.5 1.5 0 0 1 3 0V11M14 11V6a1.5 1.5 0 0 1 3 0v7c0 4-3 7-6.5 7S5 18 4 15l-1-3a1.4 1.4 0 0 1 2.4-1.3L8 13',
    shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
    people: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M17 11a2.5 2.5 0 1 0 0-5M18 14c2 .5 3.5 2.6 3.5 5',
    court: 'M3 5h18v14H3zM12 5v14M3 9h4M17 9h4M3 15h4M17 15h4',
    board: 'M3 4h18v16H3zM3 10h18M9 4v16M15 4v16',
    calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
    chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
    brain: 'M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 1V5a3 3 0 0 0-3-1zM15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-6 1',
    stack: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5M3 17.5l9 5 9-5',
    gear: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
    play: 'M7 4l13 8-13 8z', pause: 'M7 4h3v16H7zM14 4h3v16h-3z', stop: 'M6 6h12v12H6z',
    undo: 'M9 14L4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3', pencil: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
    swap: 'M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7', timer: 'M12 8v5l3 2M9 2h6M12 22a8 8 0 1 0 0-16 8 8 0 0 0 0 16z',
    flame: 'M12 22c4 0 7-3 7-7 0-4-3-6-4-10-2 2-3 4-3 6-1-1-2-2-2-4-2 2-5 5-5 8 0 4 3 7 7 7z',
    bolt: 'M13 2L4 14h7l-1 8 9-12h-7z', wall: 'M4 4h16v16H4zM4 9h16M4 15h16M10 4v5M14 9v6M10 15v5',
    run: 'M13 5a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM7 22l3-6 3 2v5M9 12l3-4 4 3 3-1M10 16l-3-2-3 1',
    sparkle: 'M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z', trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
    share: 'M12 3v13M7 8l5-5 5 5M5 14v6h14v-6', download: 'M12 3v13M7 11l5 5 5-5M5 20h14', upload: 'M12 16V3M7 8l5-5 5 5M5 20h14',
    trophy: 'M8 4h8v5a4 4 0 0 1-8 0zM8 6H4c0 3 2 5 4 5M16 6h4c0 3-2 5-4 5M12 13v4M8 21h8M9 17h6v4H9z',
    flag: 'M5 21V4M5 4h11l-2 4 2 4H5', info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 11v6M12 7h.01',
    warn: 'M12 3l10 18H2zM12 10v5M12 18h.01', star: 'M12 3l2.8 5.8 6.2.9-4.5 4.4 1 6.3L12 17.5 6.5 20.4l1-6.3L3 9.7l6.2-.9z',
    list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01', person: 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4.4 3.6-8 8-8s8 3.6 8 8',
    checklist: 'M9 6h12M9 12h12M9 18h12M3 6l1.5 1.5L7 5M3 12l1.5 1.5L7 11M3 18l1.5 1.5L7 17',
    lock: 'M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4', doc: 'M6 2h9l5 5v15H6zM14 2v6h6M9 13h7M9 17h7',
    pin: 'M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
    send: 'M22 2L11 13M22 2l-7 20-4-9-9-4z', eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    shuffle: 'M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5', wand: 'M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8l1.4 1.4M17.8 6.2l1.4-1.4M3 21l9-9M12.2 6.2L10.8 4.8',
    ball: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 2c-2.5 3.5-3 8 0 10s8 2 10 1M2.5 8.5c3.5 1.5 7 .5 9.5-3.5M7 20.5c0-4.5 2-7.5 5-8.5',
    group: 'M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 20c0-3 2.7-5.5 6-5.5s6 2.5 6 5.5M14 14.6c.6-.1 1.3-.1 2-.1 3.3 0 6 2.5 6 5.5',
    tray: 'M3 13h5l2 3h4l2-3h5M5 5h14l2 8v6H3v-6z', cloud: 'M7 18a5 5 0 1 1 .9-9.9A6 6 0 0 1 19 10a4 4 0 0 1 0 8z'
  };
  function icon(name, size, cls) {
    const el = s('svg', { viewBox: '0 0 24 24', class: 'ic' + (cls ? ' ' + cls : '') });
    el.appendChild(s('path', { d: P[name] || P.info }));
    if (size) { el.style.width = size + 'px'; el.style.height = size + 'px'; }
    return el;
  }
  function iconBadge(name, colors, size = 40) {
    return h('span', { class: 'icon-badge', style: { width: size + 'px', height: size + 'px', background: grad(colors[0], colors[1]), boxShadow: `0 4px 10px ${colors[0]}55` } }, icon(name));
  }

  // ---------- Notifiche, menu, finestre ----------
  function toast(text, iconName = 'check') {
    const t = h('div', { class: 'toast' }, icon(iconName, 18), text);
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 1900);
  }
  function haptic(ms = 12) { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { } }

  function closeMenus() { document.querySelectorAll('.menu, .menu-catcher').forEach(e => e.remove()); }
  /** items: [{label, icon, action, danger, disabled}] oppure 'sep' */
  function menu(anchor, items) {
    closeMenus();
    const catcher = h('div', { class: 'menu-catcher', style: { position: 'fixed', inset: '0', zIndex: 110 }, onclick: closeMenus });
    const m = h('div', { class: 'menu' }, items.filter(Boolean).map(it => it === 'sep' ? h('div', { class: 'menu-sep' }) :
      h('button', { class: it.danger ? 'danger' : '', disabled: it.disabled, onclick: () => { closeMenus(); it.action && it.action(); } },
        it.icon ? icon(it.icon, 18) : null, h('span', null, it.label))));
    document.body.append(catcher, m);
    const r = anchor.getBoundingClientRect();
    const mw = m.offsetWidth, mh = m.offsetHeight;
    let left = Math.min(window.innerWidth - mw - 8, Math.max(8, r.right - mw));
    let top = r.bottom + 6;
    if (top + mh > window.innerHeight - 8) top = Math.max(8, r.top - mh - 6);
    m.style.left = left + 'px'; m.style.top = top + 'px';
  }

  /** Finestra dal basso. build(body, close) riempie il contenuto. */
  function sheet(title, build, opts = {}) {
    const back = h('div', { class: 'sheet-backdrop' });
    const close = () => { back.remove(); opts.onClose && opts.onClose(); };
    const body = h('div', { class: 'sheet-body' });
    const head = h('div', { class: 'sheet-head' },
      h('button', { class: 'btn-plain', onclick: close }, opts.cancelLabel || 'Chiudi'),
      h('h2', null, title),
      opts.action ? h('button', { class: 'btn-plain bold', onclick: () => { if (opts.action.run() !== false) close(); } }, opts.action.label) : h('span', { style: { width: '50px' } }));
    const sh = h('div', { class: 'sheet' }, head, body);
    back.appendChild(sh);
    back.addEventListener('click', e => { if (e.target === back && !opts.modal) close(); });
    document.body.appendChild(back);
    build(body, close);
    return close;
  }
  function confirmDialog(title, message, okLabel, onOk, danger = true) {
    sheet(title, (body, close) => {
      body.append(
        h('p', { class: 'muted', style: { margin: '0' } }, message),
        h('button', { class: 'btn-grad', style: { background: danger ? grad('#ED3845', '#FF8C1F') : grad('#1F6BFA', '#0DC7F2') }, onclick: () => { close(); onOk(); } }, okLabel),
        h('button', { class: 'btn-plain', onclick: close }, 'Annulla'));
    }, { cancelLabel: 'Chiudi' });
  }

  // ---------- Componenti ----------
  function chip(label, on, colors, onClick, iconName) {
    return h('button', { class: 'chip' + (on ? ' on' : ''), style: on ? { background: grad(colors[0], colors[1]) } : null, onclick: onClick },
      iconName ? icon(iconName, 14) : null, label);
  }
  function chipPicker(options, value, onChange, colors = ['#1F6BFA', '#0DC7F2']) {
    return h('div', { class: 'chips' }, options.map(o => chip(o.label, o.value === value, colors, () => onChange(o.value))));
  }
  function gradButton(label, iconName, colors, onClick, compact) {
    return h('button', { class: 'btn-grad' + (compact ? ' compact' : ''), style: { background: grad(colors[0], colors[1]) }, onclick: onClick },
      iconName ? icon(iconName, 18) : null, label);
  }
  function card(...children) { return h('div', { class: 'card' }, ...children); }
  function noteCard(title, text, iconName = 'info', colors = ['#1F6BFA', '#0DC7F2'], extraClass) {
    return h('div', { class: 'card' + (extraClass ? ' ' + extraClass : '') },
      h('div', { class: 'row', style: { marginBottom: '8px' } }, iconBadge(iconName, colors, 30), h('b', null, title)),
      h('div', { class: 'note-text' }, text));
  }
  function overlapBadge(violations) {
    if (!violations.length) return h('div', { class: 'card tight row' }, iconBadge('check', ['#21C778', '#0DA89E'], 32),
      h('b', { class: 'small' }, 'Posizioni regolari quando il battitore inizia il servizio'));
    return h('div', { class: 'card tight alert-card' },
      h('div', { class: 'row', style: { marginBottom: '6px' } }, iconBadge('warn', ['#ED3845', '#FF8C1F'], 32), h('b', { style: { color: 'var(--red)' } }, 'Fallo di posizione!')),
      violations.map(v => h('div', { class: 'small' }, '• ' + v)));
  }
  function roleDot(role, system, size = 22) {
    return h('span', { class: 'dot-token', style: { width: size + 'px', height: size + 'px', background: CM.Role.color(role, system), color: CM.Role.textColor(role, system), fontSize: (size * 0.4) + 'px' } }, CM.Role.short(role, system));
  }
  function legend(labeler, useLibero) {
    const roles = CM.ROLES.filter(r => useLibero || r !== 'L');
    return h('div', { class: 'card' }, h('h3', { style: { marginBottom: '10px' } }, 'Legenda'),
      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' } },
        roles.map(r => h('div', { class: 'row', style: { gap: '8px' } }, roleDot(r, labeler.system, 26),
          h('div', { style: { minWidth: 0 } }, h('div', { class: 'small', style: { fontWeight: 600 } }, CM.Role.fullName(r, labeler.system)),
            labeler.names[r] ? h('div', { class: 'tiny muted' }, labeler.names[r]) : null)))));
  }
  function areaLegend(defenders, blockers, labeler) {
    return h('div', { class: 'card' }, h('h3', { style: { marginBottom: '10px' } }, 'Zone di competenza'),
      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' } },
        defenders.map(r => h('div', { class: 'row', style: { gap: '8px' } }, h('span', { style: { width: '20px', height: '16px', borderRadius: '5px', background: CM.Role.areaColor(r) } }), h('span', { class: 'small' }, labeler(r)))),
        blockers.length ? h('div', { class: 'row', style: { gap: '8px' } }, h('span', { style: { width: '20px', height: '16px', borderRadius: '5px', background: 'rgba(0,0,0,0.55)' } }),
          h('span', { class: 'small' }, 'Muro: ' + blockers.map(r => labeler(r)).join(' + '))) : null));
  }

  // Form
  function formGroup(header, rows, footer) {
    return h('div', null,
      header ? h('div', { class: 'section-title', style: { margin: '6px 16px 6px' } }, header) : null,
      h('div', { class: 'form-group' }, rows),
      footer ? h('div', { class: 'form-foot' }, footer) : null);
  }
  function formRow(label, control) { return h('div', { class: 'form-row' }, typeof label === 'string' ? h('label', null, label) : label, control); }
  function textInput(value, placeholder, onInput, cls) {
    return h('input', { type: 'text', class: cls || '', value: value || '', placeholder, oninput: e => onInput(e.target.value) });
  }
  function select(options, value, onChange) {
    const el = h('select', { onchange: e => onChange(options[e.target.selectedIndex].value) },
      options.map(o => h('option', { value: String(o.value) }, o.label)));
    const i = options.findIndex(o => o.value === value);
    el.selectedIndex = i < 0 ? 0 : i;
    return el;
  }
  function toggle(checked, onChange) {
    return h('label', { class: 'toggle' }, h('input', { type: 'checkbox', checked, onchange: e => onChange(e.target.checked) }), h('span'));
  }
  function stepper(value, min, max, onChange, step = 1) {
    return h('div', { class: 'stepper' },
      h('button', { onclick: () => onChange(Math.max(min, value - step)) }, '−'),
      h('button', { onclick: () => onChange(Math.min(max, value + step)) }, '+'));
  }
  function stepperRow(text, value, min, max, onChange) {
    return formRow(text, stepper(value, min, max, onChange));
  }

  // ---------- Navigazione ----------
  const routes = [];
  const Router = {
    add(pattern, render) { routes.push({ re: new RegExp('^' + pattern.replace(/:(\w+)/g, '([^/]+)') + '$'), render }); },
    go(path) { if (location.hash !== '#' + path) location.hash = path; else Router.render(); },
    back() { if (history.length > 1) history.back(); else Router.go('/'); },
    current() { return location.hash.slice(1) || '/'; },
    render() {
      closeMenus();
      const path = Router.current();
      for (const r of routes) {
        const m = path.match(r.re);
        if (m) { r.render(...m.slice(1).map(decodeURIComponent)); return; }
      }
      Router.go('/');
    }
  };

  /** Pagina con barra in alto. right: [{icon,label,onclick}] */
  function page(title, opts = {}) {
    const app = document.getElementById('app');
    app.innerHTML = '';
    const bar = opts.noBar ? null : h('div', { class: 'topbar' },
      opts.home ? h('span', { style: { width: '40px' } }) : h('button', { class: 'tb-btn', onclick: () => Router.back() }, icon('back', 22), h('span', { class: 'small' }, 'Indietro')),
      h('h1', null, title),
      h('div', { class: 'row', style: { gap: '2px', minWidth: '40px', justifyContent: 'flex-end' } }, (opts.right || []).map(b =>
        h('button', { class: 'tb-btn', onclick: b.onclick, 'aria-label': b.label || '' }, b.icon ? icon(b.icon, 22) : null, b.text ? h('span', null, b.text) : null))));
    const content = h('div', { class: 'page' });
    if (bar) app.appendChild(bar);
    app.appendChild(content);
    window.scrollTo(0, 0);
    return content;
  }

  // ---------- File e condivisione ----------
  async function shareOrDownload(filename, blob, text) {
    try {
      const file = new File([blob], filename, { type: blob.type });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: filename, text: text || '' });
        return;
      }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: filename });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
  async function shareText(text, title) {
    try {
      if (navigator.share) { await navigator.share({ text, title }); return; }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(text); toast('Testo copiato: incollalo su WhatsApp', 'check'); }
    catch (e) { sheet('Testo da copiare', body => body.append(h('textarea', { style: { width: '100%', minHeight: '240px' } }, text))); }
  }
  const fmtDate = (iso, opts) => new Date(iso).toLocaleDateString('it-IT', opts || { day: 'numeric', month: 'short', year: 'numeric' });
  const fmtDateTime = iso => new Date(iso).toLocaleString('it-IT', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  Object.assign(CM, { h, s, icon, iconBadge, grad, toast, haptic, menu, closeMenus, sheet, confirmDialog,
    chip, chipPicker, gradButton, card, noteCard, overlapBadge, roleDot, legend, areaLegend,
    formGroup, formRow, textInput, select, toggle, stepper, stepperRow, Router, page, shareOrDownload, shareText, fmtDate, fmtDateTime });
})(window);
