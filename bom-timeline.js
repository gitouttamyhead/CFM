/**
 * Book of Mormon narrative Timeline — lanes + sync points.
 */
(function () {
  var state = {
    data: null,
    laneFilter: 'all',
    selectedId: null
  };

  var els = {};
  var laneColor = {
    'jerusalem-backdrop': 'lane-jerusalem',
    'nephite-main': 'lane-nephite',
    'nephi-colony': 'lane-colony',
    'alma-wilderness': 'lane-alma',
    jaredite: 'lane-jaredite'
  };

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

  function laneMap() {
    var map = {};
    (state.data.lanes || []).forEach(function (l) {
      map[l.id] = l;
    });
    return map;
  }

  function entityMap() {
    var map = {};
    (state.data.entities || []).forEach(function (e) {
      map[e.id] = e;
    });
    return map;
  }

  function findEntity(id) {
    return entityMap()[id] || null;
  }

  function laneClass(laneId) {
    return laneColor[laneId] || '';
  }

  function overlapsLabels(ids) {
    var map = entityMap();
    return (ids || [])
      .map(function (id) {
        return map[id] ? map[id].label : id;
      })
      .filter(Boolean);
  }

  function visibleEntity(e) {
    if (state.laneFilter === 'all') return true;
    return e.lane === state.laneFilter;
  }

  function renderLaneFilters() {
    var html =
      '<span>Lanes:</span><button type="button" class="bom-lane-chip" data-lane="all" aria-pressed="' +
      (state.laneFilter === 'all' ? 'true' : 'false') +
      '">All</button>';
    (state.data.lanes || []).forEach(function (l) {
      html +=
        '<button type="button" class="bom-lane-chip ' +
        laneClass(l.id) +
        '" data-lane="' +
        escapeHtml(l.id) +
        '" aria-pressed="' +
        (state.laneFilter === l.id ? 'true' : 'false') +
        '">' +
        escapeHtml(l.short || l.label) +
        '</button>';
    });
    els.laneFilters.innerHTML = html;
  }

  function renderSyncBand() {
    els.syncBand.innerHTML = (state.data.syncPoints || [])
      .map(function (s) {
        var active = s.entityId === state.selectedId ? ' is-active' : '';
        return (
          '<button type="button" class="bom-sync-btn' +
          active +
          '" data-entity="' +
          escapeHtml(s.entityId) +
          '">' +
          escapeHtml(s.label) +
          '</button>'
        );
      })
      .join('');
  }

  function cardButton(e) {
    var pressed = e.id === state.selectedId ? 'true' : 'false';
    var dim = state.laneFilter !== 'all' && e.lane !== state.laneFilter ? ' is-dimmed' : '';
    var tag =
      e.type === 'sync'
        ? '<span class="bom-card-tag">Sync</span>'
        : e.type === 'backdrop'
          ? '<span class="bom-card-tag">Backdrop</span>'
          : '';
    return (
      '<button type="button" class="bom-card ' +
      laneClass(e.lane) +
      dim +
      '" data-id="' +
      escapeHtml(e.id) +
      '" aria-pressed="' +
      pressed +
      '">' +
      '<span class="bom-card-label">' +
      escapeHtml(e.label) +
      '</span>' +
      '<span class="bom-card-meta">' +
      escapeHtml(e.dateLabel || '') +
      '</span>' +
      tag +
      '</button>'
    );
  }

  function renderSections() {
    var bySection = {};
    (state.data.entities || []).forEach(function (e) {
      if (!bySection[e.section]) bySection[e.section] = [];
      bySection[e.section].push(e);
    });

    var lanes = laneMap();
    var html = '';
    (state.data.sections || []).forEach(function (sec) {
      var items = bySection[sec.id] || [];
      if (!items.length) return;

      html +=
        '<section class="bom-section" data-section="' +
        escapeHtml(sec.id) +
        '">' +
        '<h2>' +
        escapeHtml(sec.label) +
        '</h2>' +
        '<p class="bom-section-hint">' +
        escapeHtml(sec.hint || '') +
        '</p>';

      if (sec.id === 'mosiah-knot') {
        var order = ['nephite-main', 'nephi-colony', 'alma-wilderness'];
        html += '<div class="bom-card-row--parallel">';
        order.forEach(function (laneId) {
          var col = items.filter(function (e) {
            return e.lane === laneId;
          });
          if (!col.length) return;
          html +=
            '<div class="bom-parallel-col">' +
            '<h3>' +
            escapeHtml((lanes[laneId] && lanes[laneId].short) || laneId) +
            '</h3>' +
            '<div class="bom-card-row">' +
            col.map(cardButton).join('') +
            '</div></div>';
        });
        // any other lanes in this section
        items.forEach(function (e) {
          if (order.indexOf(e.lane) < 0) {
            html += '<div class="bom-parallel-col"><div class="bom-card-row">' + cardButton(e) + '</div></div>';
          }
        });
        html += '</div>';
      } else {
        html += '<div class="bom-card-row">' + items.map(cardButton).join('') + '</div>';
      }
      html += '</section>';
    });

    els.sections.innerHTML = html;
  }

  function renderPanel(entity) {
    if (!entity) {
      els.panel.innerHTML = '<p class="bom-status">Select a card or sync point.</p>';
      els.panel.className = 'bom-panel';
      return;
    }
    var lanes = laneMap();
    var lane = lanes[entity.lane];
    els.panel.className = 'bom-panel ' + laneClass(entity.lane);

    var overlaps = overlapsLabels(entity.overlaps);
    var ot =
      entity.otParallel && entity.otParallel.href
        ? '<a class="bom-ot-link" href="' +
          escapeHtml(entity.otParallel.href) +
          '">' +
          escapeHtml(entity.otParallel.label || 'Open OT Timeline') +
          '</a>'
        : '';

    els.panel.innerHTML =
      '<h2>' +
      escapeHtml(entity.label) +
      '</h2>' +
      '<div class="bom-panel-meta">' +
      escapeHtml((lane && lane.label) || entity.lane) +
      (entity.type === 'sync' ? ' · Sync point' : '') +
      (entity.type === 'backdrop' ? ' · Jerusalem backdrop' : '') +
      '</div>' +
      '<dl class="bom-dl">' +
      '<div><dt>In the book</dt><dd>' +
      escapeHtml(entity.bookRef || '—') +
      '</dd></div>' +
      '<div><dt>When</dt><dd>' +
      escapeHtml(entity.dateLabel || '—') +
      '</dd></div>' +
      '<div><dt>Overlaps</dt><dd>' +
      escapeHtml(overlaps.length ? overlaps.join('; ') : '—') +
      '</dd></div>' +
      '</dl>' +
      (entity.summary
        ? '<div class="bom-why"><strong>Orientation</strong><p style="margin:0">' +
          escapeHtml(entity.summary) +
          '</p></div>'
        : '') +
      (entity.whyConfusing
        ? '<div class="bom-why"><strong>Why this feels confusing</strong><p style="margin:0">' +
          escapeHtml(entity.whyConfusing) +
          '</p></div>'
        : '') +
      ot;
  }

  function selectEntity(id, scroll) {
    var entity = findEntity(id) || findEntity(state.data.defaultId) || (state.data.entities || [])[0];
    if (!entity) return;
    state.selectedId = entity.id;
    renderLaneFilters();
    renderSyncBand();
    renderSections();
    renderPanel(entity);
    if (scroll) {
      var btn = els.sections.querySelector('[data-id="' + entity.id + '"]');
      if (btn && btn.scrollIntoView) {
        btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
    try {
      var url = new URL(window.location.href);
      url.searchParams.set('id', state.selectedId);
      if (state.laneFilter !== 'all') url.searchParams.set('lane', state.laneFilter);
      else url.searchParams.delete('lane');
      window.history.replaceState({}, '', url.toString());
    } catch (err) {
      /* ignore */
    }
  }

  function bind() {
    els.laneFilters.addEventListener('click', function (ev) {
      var btn = ev.target.closest('[data-lane]');
      if (!btn) return;
      state.laneFilter = btn.getAttribute('data-lane') || 'all';
      renderLaneFilters();
      renderSections();
    });
    els.syncBand.addEventListener('click', function (ev) {
      var btn = ev.target.closest('[data-entity]');
      if (!btn) return;
      selectEntity(btn.getAttribute('data-entity'), true);
    });
    els.sections.addEventListener('click', function (ev) {
      var btn = ev.target.closest('[data-id]');
      if (!btn) return;
      selectEntity(btn.getAttribute('data-id'), false);
    });
  }

  function parseQuery() {
    try {
      var params = new URLSearchParams(window.location.search);
      if (params.get('id')) state.selectedId = params.get('id');
      if (params.get('lane')) state.laneFilter = params.get('lane');
    } catch (e) {
      /* ignore */
    }
  }

  function init() {
    els.laneFilters = $('bomLaneFilters');
    els.syncBand = $('bomSyncBand');
    els.sections = $('bomSections');
    els.panel = $('bomPanel');
    els.status = $('bomStatus');

    bind();
    parseQuery();

    fetch('data/bom-timeline.json')
      .then(function (res) {
        if (!res.ok) throw new Error('Failed to load bom-timeline.json');
        return res.json();
      })
      .then(function (data) {
        state.data = data;
        if (els.status) els.status.style.display = 'none';
        selectEntity(state.selectedId || data.defaultId, true);
      })
      .catch(function (err) {
        console.error(err);
        if (els.status) els.status.textContent = 'Could not load Book of Mormon timeline data.';
      });
  }

  window.CFMBomTimeline = { init: init };
})();
