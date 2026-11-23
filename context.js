/**
 * Bible Timeline hub — static JSON, traditional/scholarly lens.
 * Depends on auth-utils requireAuth (page shows container after login).
 */
(function () {
  var state = {
    meta: null,
    ot: null,
    nt: null,
    testament: 'ot',
    lens: 'traditional',
    selectedId: null
  };

  var els = {};

  function $(id) {
    return document.getElementById(id);
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function currentEntities() {
    var pack = state.testament === 'nt' ? state.nt : state.ot;
    if (!pack || !pack.entities) return [];
    return pack.entities.slice().sort(function (a, b) {
      return (a.sortKey || 0) - (b.sortKey || 0);
    });
  }

  function findEntity(id) {
    var list = currentEntities();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return list[0] || null;
  }

  function eraLabels(eraIds) {
    if (!state.meta || !state.meta.eras || !eraIds) return [];
    var map = {};
    state.meta.eras.forEach(function (e) {
      map[e.id] = e.label;
    });
    return eraIds.map(function (id) {
      return map[id] || id;
    });
  }

  function lensBlock(entity) {
    return state.lens === 'scholarly' ? entity.scholarly || entity.traditional : entity.traditional;
  }

  function alternateNote(entity) {
    if (state.lens === 'scholarly') {
      return (entity.scholarly && entity.scholarly.note) || entity.traditionalNote || '';
    }
    // Traditional view: show scholarly one-liner as the “other lens” when present
    if (entity.scholarly && entity.scholarly.note) return entity.scholarly.note;
    return '';
  }

  function typeLabel(type) {
    if (type === 'prophet') return 'Prophet';
    if (type === 'book') return 'Book';
    if (type === 'event') return 'Event';
    return type || '';
  }

  function renderEraBand(entity) {
    var testament = state.testament;
    var eras = (state.meta.eras || []).filter(function (e) {
      return e.testament === testament || (entity && (entity.eras || []).indexOf(e.id) >= 0);
    });
    // Prefer testament-scoped eras for the band
    eras = (state.meta.eras || []).filter(function (e) {
      return e.testament === testament;
    });
    var active = {};
    if (entity && entity.eras) {
      entity.eras.forEach(function (id) {
        active[id] = true;
      });
    }
    els.eraBand.innerHTML = eras
      .map(function (e) {
        var cls = 'timeline-era-chip' + (active[e.id] ? ' is-active' : '');
        return '<span class="' + cls + '">' + escapeHtml(e.label) + '</span>';
      })
      .join('');
  }

  function renderTrack() {
    var entities = currentEntities();
    var html = entities
      .map(function (e) {
        var block = lensBlock(e);
        var pressed = e.id === state.selectedId ? 'true' : 'false';
        var extra = e.canon === 'deuterocanon' ? ' timeline-node--deuterocanon' : '';
        var tag =
          e.canon === 'deuterocanon'
            ? '<span class="timeline-node-tag">Deuterocanon</span>'
            : '';
        return (
          '<button type="button" class="timeline-node' +
          extra +
          '" data-id="' +
          escapeHtml(e.id) +
          '" aria-pressed="' +
          pressed +
          '">' +
          '<span class="timeline-node-label">' +
          escapeHtml(e.label) +
          '</span>' +
          '<span class="timeline-node-date">' +
          escapeHtml(block.dateLabel || '') +
          '</span>' +
          tag +
          '</button>'
        );
      })
      .join('');
    els.scroller.innerHTML = html;
  }

  function renderPanel(entity) {
    if (!entity) {
      els.panel.innerHTML = '<p class="timeline-status">Select an item on the timeline.</p>';
      return;
    }
    var block = lensBlock(entity);
    var eras = eraLabels(entity.eras).join(' · ');
    var where = '';
    if (entity.region) {
      where = entity.region.label || '';
      if (entity.region.audience) {
        where += (where ? ' — ' : '') + 'Audience: ' + entity.region.audience;
      }
    }
    var note = alternateNote(entity);
    var noteLabel = state.lens === 'scholarly' ? 'Scholarly note' : 'Scholarly lens';
    var tradBlurb =
      state.lens === 'traditional' && entity.traditionalNote
        ? '<p class="timeline-note"><strong>Orientation:</strong> ' +
          escapeHtml(entity.traditionalNote) +
          '</p>'
        : '';
    var otherNote = note
      ? '<p class="timeline-note"><strong>' +
        escapeHtml(noteLabel) +
        ':</strong> ' +
        escapeHtml(note) +
        '</p>'
      : '';
    // Avoid duplicating the same sentence twice when scholarly selected
    if (state.lens === 'scholarly') {
      tradBlurb = entity.traditionalNote
        ? '<p class="timeline-note"><strong>Traditional orientation:</strong> ' +
          escapeHtml(entity.traditionalNote) +
          '</p>'
        : '';
    }

    var banner =
      entity.canon === 'deuterocanon'
        ? '<div class="timeline-canon-banner is-visible">Not in the Protestant Old Testament used by Come Follow Me — included in Catholic/Orthodox canons.</div>'
        : '<div class="timeline-canon-banner"></div>';

    var metaBits = [typeLabel(entity.type)];
    if (entity.canon === 'deuterocanon') metaBits.push('Deuterocanon');

    els.panel.innerHTML =
      banner +
      '<h2>' +
      escapeHtml(entity.label) +
      '</h2>' +
      '<div class="timeline-panel-meta">' +
      escapeHtml(metaBits.join(' · ')) +
      '</div>' +
      '<dl class="timeline-dl">' +
      '<div><dt>When</dt><dd>' +
      escapeHtml(block.dateLabel || '—') +
      '</dd></div>' +
      '<div><dt>Where</dt><dd>' +
      escapeHtml(where || '—') +
      '</dd></div>' +
      '<div><dt>Era</dt><dd>' +
      escapeHtml(eras || '—') +
      '</dd></div>' +
      '</dl>' +
      tradBlurb +
      otherNote;
  }

  function selectEntity(id, scrollIntoView) {
    var entity = findEntity(id);
    if (!entity) return;
    state.selectedId = entity.id;
    renderEraBand(entity);
    renderTrack();
    renderPanel(entity);
    if (scrollIntoView) {
      var btn = els.scroller.querySelector('[data-id="' + entity.id + '"]');
      if (btn && btn.scrollIntoView) {
        btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
    try {
      var url = new URL(window.location.href);
      url.searchParams.set('testament', state.testament);
      url.searchParams.set('id', state.selectedId);
      url.searchParams.set('lens', state.lens);
      window.history.replaceState({}, '', url.toString());
    } catch (e) {
      /* ignore */
    }
  }

  function setTestament(testament) {
    state.testament = testament === 'nt' ? 'nt' : 'ot';
    els.btnOt.setAttribute('aria-pressed', state.testament === 'ot' ? 'true' : 'false');
    els.btnNt.setAttribute('aria-pressed', state.testament === 'nt' ? 'true' : 'false');
    var fallback =
      state.testament === 'nt'
        ? (state.meta && state.meta.defaultNtId) || 'jesus-ministry'
        : (state.meta && state.meta.defaultOtId) || 'hosea';
    selectEntity(fallback, true);
  }

  function setLens(lens) {
    state.lens = lens === 'scholarly' ? 'scholarly' : 'traditional';
    var radios = document.querySelectorAll('input[name="timelineLens"]');
    radios.forEach(function (r) {
      r.checked = r.value === state.lens;
    });
    if (state.selectedId) selectEntity(state.selectedId, false);
  }

  function bind() {
    els.btnOt.addEventListener('click', function () {
      setTestament('ot');
    });
    els.btnNt.addEventListener('click', function () {
      setTestament('nt');
    });
    document.querySelectorAll('input[name="timelineLens"]').forEach(function (r) {
      r.addEventListener('change', function () {
        if (r.checked) setLens(r.value);
      });
    });
    els.scroller.addEventListener('click', function (ev) {
      var btn = ev.target.closest('[data-id]');
      if (!btn) return;
      selectEntity(btn.getAttribute('data-id'), false);
    });
  }

  function parseQuery() {
    try {
      var params = new URLSearchParams(window.location.search);
      if (params.get('testament') === 'nt' || params.get('testament') === 'ot') {
        state.testament = params.get('testament');
      }
      if (params.get('lens') === 'scholarly' || params.get('lens') === 'traditional') {
        state.lens = params.get('lens');
      }
      if (params.get('id')) state.selectedId = params.get('id');
    } catch (e) {
      /* ignore */
    }
  }

  function loadJson(path) {
    return fetch(path).then(function (res) {
      if (!res.ok) throw new Error('Failed to load ' + path);
      return res.json();
    });
  }

  function init() {
    els.container = $('timelineMain');
    els.eraBand = $('timelineEraBand');
    els.scroller = $('timelineScroller');
    els.panel = $('timelinePanel');
    els.btnOt = $('timelineOtBtn');
    els.btnNt = $('timelineNtBtn');
    els.status = $('timelineStatus');

    bind();
    parseQuery();

    Promise.all([
      loadJson('data/bible-context-meta.json'),
      loadJson('data/bible-context-ot.json'),
      loadJson('data/bible-context-nt.json')
    ])
      .then(function (results) {
        state.meta = results[0];
        state.ot = results[1];
        state.nt = results[2];
        if (!state.testament) state.testament = state.meta.defaultTestament || 'ot';
        if (!state.lens) state.lens = state.meta.defaultLens || 'traditional';

        els.btnOt.setAttribute('aria-pressed', state.testament === 'ot' ? 'true' : 'false');
        els.btnNt.setAttribute('aria-pressed', state.testament === 'nt' ? 'true' : 'false');
        setLens(state.lens);

        var startId =
          state.selectedId ||
          (state.testament === 'nt' ? state.meta.defaultNtId : state.meta.defaultOtId);
        selectEntity(startId, true);
        if (els.status) els.status.style.display = 'none';
      })
      .catch(function (err) {
        console.error(err);
        if (els.status) {
          els.status.textContent = 'Could not load timeline data. Try refreshing.';
        }
      });
  }

  window.CFMTimeline = { init: init };
})();
