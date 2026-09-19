// Search box behaviour for a role's user-action-flows.html index page.
// The total flow count is read from the input's own data-total attribute
// rather than baked into this file, so one script serves all four pages.
(function () {
  var input = document.getElementById('flow-search');
  var shown = document.getElementById('shown');
  if (!input || !shown) return;
  var total = input.getAttribute('data-total') || '0';
  var flows = [].slice.call(document.querySelectorAll('.flow'));
  var groups = [].slice.call(document.querySelectorAll('.group'));
  input.addEventListener('input', function () {
    var q = input.value.trim().toLowerCase();
    var n = 0;
    flows.forEach(function (f) {
      var hit = !q || f.dataset.hay.indexOf(q) > -1;
      f.hidden = !hit;
      if (hit) n++;
    });
    groups.forEach(function (g) {
      g.hidden = !g.querySelector('.flow:not([hidden])');
    });
    shown.textContent = q
      ? 'Showing ' + n + ' of ' + total + ' flows.'
      : 'Showing all ' + total + ' flows. Each flow becomes one step-by-step document once approved.';
  });
})();
