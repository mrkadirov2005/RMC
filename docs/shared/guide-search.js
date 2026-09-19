// Search box behaviour for a role's nested_docs/index.html guide index.
// The searchable items are read from the inert JSON block the page embeds
// (id="search-data") rather than baked into this file, so one script
// serves all four roles' guide indexes.
(function () {
  var dataEl = document.getElementById('search-data');
  var q = document.getElementById('q');
  var results = document.getElementById('results');
  var toc = document.getElementById('toc');
  if (!dataEl || !q || !results || !toc) return;
  var ITEMS = [];
  try { ITEMS = JSON.parse(dataEl.textContent); } catch (e) { ITEMS = []; }

  q.addEventListener('input', function () {
    var v = q.value.trim().toLowerCase();
    if (!v) { results.innerHTML = ''; toc.hidden = false; return; }
    toc.hidden = true;
    var matches = ITEMS.filter(function (it) {
      return (it.t + ' ' + it.a).toLowerCase().indexOf(v) > -1;
    }).slice(0, 30);
    results.innerHTML = matches.length
      ? matches.map(function (it) {
          return '<a class="result" href="' + it.h + '">' + it.t + '<small>' + it.a + '</small></a>';
        }).join('')
      : '<p style="color:var(--ink-3);font-size:13.5px">No matching guide. Try a different word, or browse the areas below.</p>';
  });
})();
