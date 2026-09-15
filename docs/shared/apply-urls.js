// Rewrites every element carrying data-route="/some/path" into the real,
// clickable app URL, built from the single BASE_URL in config.js.
//
// A route holding a ":param" segment (e.g. /students/:studentId, or
// /teachers/:teacherId/profile) is a pattern, not an address anyone can
// open — it is still shown in full against the real domain, but left as
// plain text rather than a link. Anything that isn't a path at all (e.g.
// "Any page", "Sidebar", "Lesson workflow") is left exactly as written.
(function () {
  var BASE = String(window.RMC_DOCS_BASE_URL || '').replace(/\/+$/, '');
  var placeholder = !BASE || /YOUR-DOMAIN-HERE/i.test(BASE);

  document.querySelectorAll('[data-route]').forEach(function (el) {
    var raw = el.getAttribute('data-route');
    var match = raw.match(/^(\/[^\s,]+)([\s\S]*)$/);
    if (!match) return; // not a path — leave the original text alone

    var path = match[1];
    var rest = match[2] || '';
    var isDynamic = path.indexOf(':') > -1;
    var full = (placeholder ? BASE || 'https://your-domain' : BASE) + '/#' + path + rest;

    if (isDynamic || placeholder) {
      el.textContent = full;
      if (placeholder) el.title = 'Set RMC_DOCS_BASE_URL in docs/shared/config.js to make this a live link.';
      return;
    }

    var a = document.createElement('a');
    a.className = el.className;
    a.href = full;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = full;
    el.replaceWith(a);
  });
})();
