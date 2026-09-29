/** Shared browser paginator. Both lanes use measured fixed-height page shells. */
export const PAGINATE_SOURCE = String.raw`
function paginate(doc, PAGE_H) {
  var stage = doc.getElementById('cv-stage');
  var source = doc.getElementById('cv-source');
  if (!stage || !source) throw new Error('Missing cv-stage or cv-source');
  var shell = doc.getElementById('cv-page-shell');
  var roots = [];
  stage.replaceChildren();
  function root(index) {
    if (index >= 100) throw new Error('CV exceeds the 100-page limit');
    while (roots.length <= index) {
      var p = shell ? shell.content.firstElementChild.cloneNode(true) : doc.createElement('article');
      p.classList.add('cv-page');
      p.setAttribute('data-page-index', String(roots.length));
      p.style.height = PAGE_H + 'px';
      if (roots.length > 0) p.querySelectorAll('[data-first-page-only]').forEach(function (e) { e.remove(); });
      stage.appendChild(p);
      roots.push(p);
    }
    return roots[index];
  }
  function destination(index, lane) {
    var p = root(index);
    var d = lane ? p.querySelector(lane) : p;
    if (!d) throw new Error('Page shell is missing ' + lane);
    return d;
  }
  function append(d, el) {
    if (!d.firstElementChild && !el.hasAttribute('data-preserve-margin')) el.style.marginTop = '0px';
    d.appendChild(el);
  }
  function fits(d) {
    var style = getComputedStyle(d);
    var bottom = d.getBoundingClientRect().bottom - parseFloat(style.paddingBottom || '0');
    return Array.from(d.children).every(function (el) {
      return el.getBoundingClientRect().bottom + parseFloat(getComputedStyle(el).marginBottom || '0') <= bottom + 0.5;
    });
  }
  function continued(title, sidebar) {
    var h = doc.createElement('h2');
    h.className = sidebar ? 'blk sec-h side-h' : 'blk sec-h';
    h.dataset.continued = '1';
    h.dataset.title = title;
    h.append(doc.createTextNode(title + ' '));
    var span = doc.createElement('span'); span.className = 'cont'; span.textContent = '(continued)'; h.append(span);
    return h;
  }
  // Split a semantic block at a word boundary, preserving inline markup and lists.
  // Only explicitly splittable content participates; decorative/header blocks fail clearly.
  function split(el, d) {
    if (!el.hasAttribute('data-splittable')) return null;
    var walker = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    var points = [], node;
    while ((node = walker.nextNode())) {
      var re = /\S+\s*/g, match;
      while ((match = re.exec(node.textContent))) points.push([node, match.index + match[0].length]);
    }
    if (points.length < 2) return null;
    function fragment(point, before) {
      var range = doc.createRange(); range.selectNodeContents(el);
      if (before) range.setEnd(point[0], point[1]); else range.setStart(point[0], point[1]);
      var copy = el.cloneNode(false); copy.removeAttribute('id'); copy.append(range.cloneContents());
      return copy;
    }
    var lo = 0, hi = points.length - 2, best = -1;
    while (lo <= hi) {
      var mid = Math.floor((lo + hi) / 2);
      var candidate = fragment(points[mid], true); append(d, candidate);
      var ok = fits(d); candidate.remove();
      if (ok) { best = mid; lo = mid + 1; } else hi = mid - 1;
    }
    if (best < 0) return null;
    var first = fragment(points[best], true), rest = fragment(points[best], false);
    // A split can leave empty cloned wrappers at the boundary; remove those only.
    rest.querySelectorAll('li,p,span,div').forEach(function(e) { if (!e.textContent.trim() && !e.querySelector('img,svg')) e.remove(); });
    return [first, rest];
  }
  function flow(blocks, lane, start) {
    var index = start || 0, d = destination(index, lane);
    function next() { index++; d = destination(index, lane); }
    for (var i = 0; i < blocks.length; i++) {
      var el = blocks[i], header = null;
      if (el.classList.contains('sec-h')) {
        header = el; el = blocks[++i];
        if (!el || el.classList.contains('sec-h')) throw new Error('Section heading has no content');
      }
      var title = el.getAttribute('data-section') || (header && header.getAttribute('data-title'));
      var started = d.children.length;
      if (header) append(d, header);
      append(d, el);
      if (fits(d)) continue;
      el.remove(); if (header) header.remove();
      // Keep a normal entry together whenever it fits a fresh page.
      if (started) next();
      if (!header && title) header = continued(title, !!lane && lane.indexOf('sidebar') >= 0);
      if (header) append(d, header);
      append(d, el);
      if (fits(d)) continue;
      el.remove();
      while (true) {
        var parts = split(el, d);
        if (!parts) {
          // The first-page masthead may consume the space this block needs.
          if (index === 0 && shell) {
            if (header) header.remove(); next(); if (header) append(d, header);
            append(d, el); if (fits(d)) break; el.remove(); continue;
          }
          throw new Error('Content cannot fit on a page: ' + (title || el.textContent.slice(0, 60)) + '. Reduce an unbreakable element or adjust the template.');
        }
        append(d, parts[0]); el = parts[1]; next();
        if (title) { header = continued(title, !!lane && lane.indexOf('sidebar') >= 0); append(d, header); }
        append(d, el); if (fits(d)) break; el.remove();
      }
    }
    return index;
  }
  var blocks = Array.from(source.children);
  var consent = blocks.find(function(el) { return el.hasAttribute('data-consent'); });
  blocks = blocks.filter(function(el) { return el !== consent; });
  flow(blocks, shell ? '[data-page-content]' : null, 0);
  var side = doc.getElementById('cv-sidebar-source');
  if (side) flow(Array.from(side.children), '[data-sidebar-content]', 0);
  if (consent) flow([consent], shell ? '[data-page-content]' : null, roots.length - 1);
  roots.forEach(function(p) {
    p.querySelectorAll('[data-page-content],[data-sidebar-content]').forEach(function(d) {
      if (!fits(d)) throw new Error('Page content overflow');
    });
    // Horizontal overflow must never be silently clipped either.
    if (p.scrollWidth > p.clientWidth + 1 || Array.from(p.querySelectorAll('.blk')).some(function(el) { return el.scrollWidth > el.clientWidth + 1; })) throw new Error('Content is too wide for the page; shorten an unbreakable value or adjust the template');
  });
  doc.__pageCount = roots.length;
  return stage;
}
`;
