/* @ds-bundle: {"format":4,"namespace":"SRPF","components":[{"name":"Button"},{"name":"Icon"},{"name":"SectionHeader"},{"name":"Stat"},{"name":"FeatureCard"},{"name":"ClubMedal"},{"name":"ClubCard"},{"name":"Step"},{"name":"Field"},{"name":"NetworkMap"}]} */
(function () {
  'use strict';
  var R = window.React;
  var h = R.createElement;

  function cx() {
    var out = [];
    for (var i = 0; i < arguments.length; i++) if (arguments[i]) out.push(arguments[i]);
    return out.join(' ');
  }
  function rest(props, skip) {
    var o = {};
    for (var k in props) if (Object.prototype.hasOwnProperty.call(props, k) && skip.indexOf(k) === -1) o[k] = props[k];
    return o;
  }

  /* ---------- Icon ---------- */
  var ICONS = {
    crown: 'M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5L3 8z',
    shield: 'M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6l8-3z M8.5 12l2.5 2.5 4.5-4.5',
    blocks: 'M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z',
    chart: 'M4 20V10 M10 20V4 M16 20v-7 M22 20H2',
    tv: 'M3 6h18v11H3z M8 21h8 M12 17v4',
    cap: 'M2 9l10-5 10 5-10 5L2 9z M6 11.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-4.5',
    trophy: 'M7 4h10v5a5 5 0 01-10 0V4z M7 6H4v2a3 3 0 003 3 M17 6h3v2a3 3 0 01-3 3 M12 14v4 M8 21h8 M9 18h6',
    arrow: 'M5 12h14 M13 6l6 6-6 6',
    check: 'M5 12.5l4.5 4.5L19 7.5'
  };
  function Icon(p) {
    var size = p.size || 24;
    return h('svg', {
      className: cx('sf-icon', p.className), width: size, height: size, viewBox: '0 0 24 24',
      fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round',
      'aria-hidden': p.title ? undefined : true, role: p.title ? 'img' : undefined
    }, p.title ? h('title', null, p.title) : null, h('path', { d: ICONS[p.name] || ICONS.check }));
  }

  /* ---------- Button ---------- */
  function Button(p) {
    var variant = p.variant || 'gold';
    var size = p.size || 'md';
    var Tag = p.href ? 'a' : 'button';
    var props = rest(p, ['variant', 'size', 'block', 'icon', 'children', 'className']);
    if (!p.href && !props.type) props.type = 'button';
    props.className = cx('sf-btn', 'button', 'sf-btn--' + variant, size === 'sm' && 'sf-btn--sm', p.block && 'sf-btn--block', p.className);
    return h(Tag, props, p.children, p.icon ? h(Icon, { name: p.icon, size: 18 }) : null);
  }

  /* ---------- SectionHeader ---------- */
  function SectionHeader(p) {
    return h('header', { className: cx('sf-sh', p.align === 'center' && 'sf-sh--center', p.className) },
      p.eyebrow ? h('p', { className: 'eyebrow sf-eyebrow' }, p.eyebrow) : null,
      h('h2', { className: 'h2 sf-h2' }, p.title, p.accent ? ' ' : null, p.accent ? h('span', { className: 'sf-gold-text' }, p.accent) : null),
      p.sub ? h('p', { className: 'body sf-sub' }, p.sub) : null);
  }

  /* ---------- Stat ---------- */
  function Stat(p) {
    return h('div', { className: cx('sf-stat', p.className) },
      h('b', { className: cx(p.size === 'sm' ? 'numeral' : 'numeral-xl', 'sf-stat-value') }, p.value),
      h('span', { className: 'sf-stat-label' }, p.label),
      p.note ? h('small', { className: 'body-sm sf-stat-note' }, p.note) : null);
  }

  /* ---------- FeatureCard ---------- */
  function FeatureCard(p) {
    return h('article', { className: cx('sf-card', p.featured && 'sf-card--featured', p.className) },
      p.icon ? h(Icon, { name: p.icon, size: 44, className: 'sf-card-icon' }) : null,
      h('h3', { className: 'h3 sf-card-title' }, p.title),
      h('p', { className: 'body-sm sf-card-text' }, p.children));
  }

  /* ---------- ClubMedal ---------- */
  function ClubMedal(p) {
    var size = p.size || 84;
    return h('span', { className: cx('sf-medal', p.className), style: { width: size, height: size } },
      h('img', { src: p.src, alt: p.alt || '', width: size, height: size, loading: 'lazy' }));
  }

  /* ---------- ClubCard ---------- */
  function ClubCard(p) {
    return h('article', { className: cx('sf-club', p.className) },
      h(ClubMedal, { src: p.logo, alt: 'Логотип клуба ' + p.name + ', ' + p.city, size: 76 }),
      h('div', { className: 'sf-club-body' },
        h('p', { className: 'eyebrow sf-club-city' }, p.city),
        h('h3', { className: 'h3 sf-club-name' }, p.name),
        p.blurb ? h('p', { className: 'body-sm sf-club-blurb' }, p.blurb) : null,
        h('ul', { className: 'body-sm sf-club-meta' },
          p.address ? h('li', null, p.address) : null,
          p.phone ? h('li', null, h('a', { href: 'tel:' + String(p.phone).replace(/[^+\d]/g, '') }, p.phone)) : null)));
  }

  /* ---------- Step ---------- */
  function Step(p) {
    return h('li', { className: cx('sf-step', p.className) },
      h('b', { className: 'sf-step-n' }, p.n),
      h('div', null, h('h4', { className: 'h3 sf-step-title' }, p.title), h('p', { className: 'body-sm sf-step-text' }, p.children)));
  }

  /* ---------- Field ---------- */
  function Field(p) {
    var id = p.id || ('sf-f-' + String(p.label || '').length + '-' + (p.name || 'x'));
    var props = rest(p, ['label', 'error', 'hint', 'options', 'className', 'id']);
    props.id = id;
    props['aria-invalid'] = p.error ? true : undefined;
    props['aria-describedby'] = (p.error || p.hint) ? id + '-d' : undefined;
    props.className = cx('sf-input', p.error && 'is-invalid');
    var control = p.options
      ? h('select', props, p.options.map(function (o) { return h('option', { key: o.value, value: o.value }, o.label); }))
      : h('input', props);
    return h('div', { className: cx('sf-field', p.className) },
      h('label', { className: 'body-sm sf-label', htmlFor: id }, p.label),
      control,
      (p.error || p.hint) ? h('p', { id: id + '-d', className: cx('body-sm', 'sf-fieldmsg', p.error && 'is-error') }, p.error || p.hint) : null);
  }

  /* ---------- NetworkMap ---------- */
  var MAP = { w: 1480, h: 770, minLon: 19, maxLon: 180, minLat: 41, maxLat: 82 };
  function proj(lat, lon) {
    return { x: (lon - MAP.minLon) / (MAP.maxLon - MAP.minLon) * MAP.w, y: (MAP.maxLat - lat) / (MAP.maxLat - MAP.minLat) * MAP.h };
  }
  function NetworkMap(p) {
    var hub = proj((p.hub || { lat: 55.75 }).lat, (p.hub || { lon: 37.62 }).lon);
    var pins = (p.pins || []).map(function (c) {
      var pt = proj(c.lat, c.lon);
      return { c: c, pt: pt, d: Math.hypot(pt.x - hub.x, pt.y - hub.y) };
    });
    var order = pins.slice().sort(function (a, b) { return a.d - b.d; });
    var lit = p.lit == null ? pins.length : p.lit;
    function isOn(item) { return order.indexOf(item) < lit; }
    var arcs = pins.filter(function (i) { return i.d > 14; }).map(function (i, k) {
      var mx = (hub.x + i.pt.x) / 2, my = (hub.y + i.pt.y) / 2 - i.d * 0.22;
      return h('path', { key: k, className: cx('sf-arc', isOn(i) && 'is-on'), pathLength: 1, d: 'M' + hub.x.toFixed(1) + ' ' + hub.y.toFixed(1) + ' Q' + mx.toFixed(1) + ' ' + my.toFixed(1) + ' ' + i.pt.x.toFixed(1) + ' ' + i.pt.y.toFixed(1) });
    });
    function at(pt) { return { left: (pt.x / MAP.w * 100) + '%', top: (pt.y / MAP.h * 100) + '%' }; }
    var dots = pins.map(function (i, k) {
      return h('span', { key: 'p' + k, className: cx('sf-pin', isOn(i) && 'is-on'), style: Object.assign({ '--o': order.indexOf(i) }, at(i.pt)) },
        h('i', { className: 'sf-pin-dot' }), i.c.label ? h('span', { className: 'sf-pin-label' }, i.c.label) : null);
    });
    var ghosts = (p.ghosts || []).map(function (g, k) {
      return h('span', { key: 'g' + k, className: 'sf-pin sf-pin--ghost is-on', style: Object.assign({ '--g': k }, at(proj(g.lat, g.lon))) }, h('i', { className: 'sf-pin-dot' }));
    });
    return h('div', { className: cx('sf-map', p.className), role: 'img', 'aria-label': p.label || 'Карта клубов сети СРП' },
      h('img', { className: 'sf-map-img', src: p.mapSrc, alt: '' }),
      h('svg', { className: 'sf-arcs', viewBox: '0 0 ' + MAP.w + ' ' + MAP.h, preserveAspectRatio: 'none', 'aria-hidden': true },
        h('defs', null, h('linearGradient', { id: 'sf-arc-g', x1: 0, y1: 0, x2: 1, y2: 0 }, h('stop', { offset: 0, stopColor: 'var(--gold-hi)', stopOpacity: 0.9 }), h('stop', { offset: 1, stopColor: 'var(--gold)', stopOpacity: 0.25 }))),
        arcs),
      h('div', { className: 'sf-pins' }, dots, ghosts));
  }

  window.SRPF = Object.assign(window.SRPF || {}, {
    Button: Button, Icon: Icon, SectionHeader: SectionHeader, Stat: Stat, FeatureCard: FeatureCard,
    ClubMedal: ClubMedal, ClubCard: ClubCard, Step: Step, Field: Field, NetworkMap: NetworkMap
  });
})();
