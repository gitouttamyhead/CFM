/**
 * General Conference attribution & disclaimer block (Conference Companion + Church + CFM).
 * Inserts static HTML into a container element.
 */
(function () {
  const SESSION_LABELS = {
    'sat-am': 'Saturday Morning Session',
    'sat-pm': 'Saturday Afternoon Session',
    'sun-am': 'Sunday Morning Session',
    'sun-pm': 'Sunday Afternoon Session'
  };

  function renderGcAttribution(containerId) {
    const el = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    if (!el) return;
    el.className = 'gc-attribution';
    el.innerHTML = [
      '<p><strong>Talk outlines courtesy of <a href="https://live.conferencecompanion.net/" target="_blank" rel="noopener noreferrer">Conference Companion</a></strong> — an unofficial companion that helps you follow General Conference live with real-time captions and AI-generated outlines.</p>',
      '<p><strong>During conference weekend, use <a href="https://live.conferencecompanion.net/" target="_blank" rel="noopener noreferrer">live.conferencecompanion.net</a></strong> for the full live experience (transcript + outline side by side).</p>',
      '<p>Outlines here are imported after each session for study in this app; they may contain errors. <a href="https://conferencecompanion.net/about" target="_blank" rel="noopener noreferrer">About Conference Companion / disclaimer</a></p>',
      '<p>Not affiliated with The Church of Jesus Christ of Latter-day Saints. For official transcripts and teaching, use <a href="https://www.churchofjesuschrist.org" target="_blank" rel="noopener noreferrer">ChurchofJesusChrist.org</a> when available.</p>',
      '<p class="gc-attribution__cfm">Come Follow Me Insights is a personal/family study tool; General Conference outlines are supplementary, not a substitute for scripture or official Church materials.</p>',
      '<p class="gc-attribution__live"><a class="btn btn-secondary gc-live-btn" href="https://live.conferencecompanion.net/" target="_blank" rel="noopener noreferrer">Follow live during conference</a></p>'
    ].join('\n');
  }

  window.GcAttribution = {
    render: renderGcAttribution,
    sessionLabel: function (key) {
      return SESSION_LABELS[key] || key;
    },
    sessionOrder: ['sat-am', 'sat-pm', 'sun-am', 'sun-pm']
  };
})();
