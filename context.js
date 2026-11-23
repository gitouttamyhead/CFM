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
    selectedId: null,
    focusEra: null,
    includeDeuterocanon: false
  };

  var LEDE_OT =
    'Orient yourself in about ten seconds: when, setting vs origin, kings, and empire era — ' +
    'with a traditional default and an optional scholarly lens. Tap an era chip to jump there.';
  var LEDE_NT =
    'New Testament is ordered earliest → latest by the active lens (traditional or scholarly writing/event dates). ' +
    'Flip the lens to see how early vs late editions shift. Optional deuterocanon fills the intertestamental gap.';

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

  function lensDateStart(entity) {
    var block = lensBlock(entity);
    if (block && block.dateStart != null) return block.dateStart;
    return entity.sortKey != null ? entity.sortKey : 0;
  }

  function lensDateEnd(entity) {
    var block = lensBlock(entity);
    if (block && block.dateEnd != null) return block.dateEnd;
    return lensDateStart(entity);
  }

  function sortEntitiesForView(list) {
    return list.slice().sort(function (a, b) {
      // NT: written/event timeline by active lens (early → late)
      if (state.testament === 'nt') {
        var sa = lensDateStart(a);
        var sb = lensDateStart(b);
        if (sa !== sb) return sa - sb;
        var ea = lensDateEnd(a);
        var eb = lensDateEnd(b);
        if (ea !== eb) return ea - eb;
        return String(a.label || '').localeCompare(String(b.label || ''));
      }
      // OT: historical setting order (fixed sortKey)
      return (a.sortKey || 0) - (b.sortKey || 0);
    });
  }

  function currentEntities() {
    if (state.testament === 'nt') {
      var ntList = (state.nt && state.nt.entities) || [];
      var list = ntList.slice();
      if (state.includeDeuterocanon && state.ot && state.ot.entities) {
        state.ot.entities.forEach(function (e) {
          if (e.canon === 'deuterocanon') list.push(e);
        });
      }
      return sortEntitiesForView(list);
    }
    var pack = state.ot;
    if (!pack || !pack.entities) return [];
    return sortEntitiesForView(pack.entities);
  }

  function findEntity(id) {
    var list = currentEntities();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  function firstEntity() {
    var list = currentEntities();
    return list[0] || null;
  }

  function updateTestamentChrome() {
    var isNt = state.testament === 'nt';
    if (els.deutWrap) els.deutWrap.style.display = isNt ? 'inline-flex' : 'none';
    if (els.lede) els.lede.textContent = isNt ? LEDE_NT : LEDE_OT;
  }

  function eraMap() {
    var map = {};
    if (state.meta && state.meta.eras) {
      state.meta.eras.forEach(function (e) {
        map[e.id] = e;
      });
    }
    return map;
  }

  function primaryEraId(entity) {
    if (!entity || !entity.eras || !entity.eras.length) return null;
    return entity.eras[0];
  }

  function eraColorClass(eraId) {
    if (!eraId) return 'era-default';
    var e = eraMap()[eraId];
    var token = (e && e.color) || eraId;
    return 'era-' + token;
  }

  function eraLabels(eraIds) {
    var map = eraMap();
    return (eraIds || []).map(function (id) {
      return (map[id] && map[id].label) || id;
    });
  }

  function lensBlock(entity) {
    return state.lens === 'scholarly' ? entity.scholarly || entity.traditional : entity.traditional;
  }

  function alternateNote(entity) {
    if (state.lens === 'scholarly') {
      return (entity.scholarly && entity.scholarly.note) || '';
    }
    if (entity.scholarly && entity.scholarly.note) return entity.scholarly.note;
    return '';
  }

  function typeLabel(type) {
    if (type === 'prophet') return 'Prophet';
    if (type === 'book') return 'Book';
    if (type === 'event') return 'Event';
    return type || '';
  }

  function settingLines(entity) {
    var r = entity.region || {};
    return {
      setting: r.setting || r.label || '',
      origin: r.origin || '',
      audience: r.audience || ''
    };
  }

  function renderEraBand(entity) {
    var testament = state.testament;
    var eras = (state.meta.eras || []).filter(function (e) {
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
        var color = eraColorClass(e.id);
        var cls =
          'timeline-era-chip ' +
          color +
          (active[e.id] ? ' is-active' : '') +
          (state.focusEra === e.id ? ' is-focused' : '');
        return (
          '<button type="button" class="' +
          cls +
          '" data-era="' +
          escapeHtml(e.id) +
          '" title="Jump to ' +
          escapeHtml(e.label) +
          '">' +
          escapeHtml(e.label) +
          '</button>'
        );
      })
      .join('');
  }

  function renderTrack() {
    var entities = currentEntities();
    var html = entities
      .map(function (e) {
        var block = lensBlock(e);
        var pressed = e.id === state.selectedId ? 'true' : 'false';
        var eraId = primaryEraId(e);
        var color = eraColorClass(eraId);
        var dim =
          state.focusEra && (!e.eras || e.eras.indexOf(state.focusEra) < 0)
            ? ' is-dimmed'
            : '';
        var extra = e.canon === 'deuterocanon' ? ' timeline-node--deuterocanon' : '';
        var tag =
          e.canon === 'deuterocanon'
            ? '<span class="timeline-node-tag">Deuterocanon</span>'
            : '';
        return (
          '<button type="button" class="timeline-node ' +
          color +
          extra +
          dim +
          '" data-id="' +
          escapeHtml(e.id) +
          '" data-era="' +
          escapeHtml(eraId || '') +
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
    var places = settingLines(entity);
    var note = alternateNote(entity);
    var noteLabel = state.lens === 'scholarly' ? 'Scholarly note' : 'Scholarly lens';
    var kings = Array.isArray(entity.kings) ? entity.kings.filter(Boolean) : [];
    var kingsHtml = kings.length
      ? '<div><dt>Kings</dt><dd>' + escapeHtml(kings.join('; ')) + '</dd></div>'
      : '';

    var placeRows = '';
    if (places.setting) {
      placeRows +=
        '<div><dt>Setting</dt><dd>' +
        escapeHtml(places.setting) +
        '<div class="timeline-field-hint">Where the ministry, message, or story is located</div></dd></div>';
    }
    if (places.origin) {
      placeRows +=
        '<div><dt>From</dt><dd>' +
        escapeHtml(places.origin) +
        '<div class="timeline-field-hint">The person\'s origin or home (may differ from the setting)</div></dd></div>';
    }
    if (places.audience) {
      placeRows +=
        '<div><dt>Audience</dt><dd>' + escapeHtml(places.audience) + '</dd></div>';
    }
    if (!placeRows) {
      placeRows = '<div><dt>Setting</dt><dd>—</dd></div>';
    }

    var bioHtml = entity.bio
      ? '<div class="timeline-bio"><strong>Bio</strong><p>' + escapeHtml(entity.bio) + '</p></div>'
      : '';

    var tradBlurb = '';
    var otherNote = note
      ? '<p class="timeline-note"><strong>' +
        escapeHtml(noteLabel) +
        ':</strong> ' +
        escapeHtml(note) +
        '</p>'
      : '';
    if (state.lens === 'scholarly' && entity.traditionalNote) {
      tradBlurb =
        '<p class="timeline-note"><strong>Traditional orientation:</strong> ' +
        escapeHtml(entity.traditionalNote) +
        '</p>';
    }

    var banner =
      entity.canon === 'deuterocanon'
        ? '<div class="timeline-canon-banner is-visible">Not in the Protestant Old Testament used by Come Follow Me — included in Catholic/Orthodox canons.</div>'
        : '<div class="timeline-canon-banner"></div>';

    var metaBits = [typeLabel(entity.type)];
    if (entity.canon === 'deuterocanon') metaBits.push('Deuterocanon');
    var eraId = primaryEraId(entity);
    var panelEraClass = eraColorClass(eraId);

    els.panel.className = 'timeline-panel ' + panelEraClass;
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
      placeRows +
      '<div><dt>Era</dt><dd>' +
      escapeHtml(eras || '—') +
      '</dd></div>' +
      kingsHtml +
      '</dl>' +
      bioHtml +
      tradBlurb +
      otherNote;
  }

  function selectEntity(id, scrollIntoView) {
    var entity = findEntity(id) || firstEntity();
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

  function jumpToEra(eraId) {
    state.focusEra = eraId;
    var list = currentEntities();
    var match = null;
    for (var i = 0; i < list.length; i++) {
      if (list[i].eras && list[i].eras.indexOf(eraId) >= 0) {
        match = list[i];
        break;
      }
    }
    if (match) {
      selectEntity(match.id, true);
    } else {
      renderEraBand(findEntity(state.selectedId) || firstEntity());
      renderTrack();
    }
    // Clear dimming after a moment so the full timeline stays usable
    window.clearTimeout(jumpToEra._t);
    jumpToEra._t = window.setTimeout(function () {
      state.focusEra = null;
      renderEraBand(findEntity(state.selectedId) || firstEntity());
      renderTrack();
    }, 3500);
  }

  function setTestament(testament) {
    state.testament = testament === 'nt' ? 'nt' : 'ot';
    state.focusEra = null;
    els.btnOt.setAttribute('aria-pressed', state.testament === 'ot' ? 'true' : 'false');
    els.btnNt.setAttribute('aria-pressed', state.testament === 'nt' ? 'true' : 'false');
    updateTestamentChrome();
    var fallback =
      state.testament === 'nt'
        ? (state.meta && state.meta.defaultNtId) || 'jesus-ministry'
        : (state.meta && state.meta.defaultOtId) || 'hosea';
    if (state.selectedId && findEntity(state.selectedId)) {
      selectEntity(state.selectedId, true);
    } else {
      selectEntity(fallback, true);
    }
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
    if (els.deutToggle) {
      els.deutToggle.addEventListener('change', function () {
        state.includeDeuterocanon = !!els.deutToggle.checked;
        var keep = state.selectedId;
        renderEraBand(findEntity(keep));
        renderTrack();
        var ent = findEntity(keep);
        if (ent) selectEntity(ent.id, true);
      });
    }
    els.scroller.addEventListener('click', function (ev) {
      var btn = ev.target.closest('[data-id]');
      if (!btn) return;
      state.focusEra = null;
      selectEntity(btn.getAttribute('data-id'), false);
    });
    els.eraBand.addEventListener('click', function (ev) {
      var chip = ev.target.closest('[data-era]');
      if (!chip) return;
      jumpToEra(chip.getAttribute('data-era'));
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
    els.deutWrap = $('timelineDeutWrap');
    els.deutToggle = $('timelineDeutToggle');
    els.lede = $('timelineLede');

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
        updateTestamentChrome();
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
