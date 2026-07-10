/* ============================================================
   myGPC — AI Learn Mode: Highlighter & Annotation Engine
   Flash Layer overlay for element picking and annotation
   ============================================================ */
(function() {
  'use strict';

  /* ----- Guard: only run if feature flag is enabled ----- */
  if (localStorage.getItem('gpc_feature_ai_learn_mode') !== '1') return;

  /* ----- Constants ----- */
  var GUENTNER_BLUE = '#00549F';
  var OVERLAY_BG = 'rgba(0, 84, 159, 0.08)';
  var STORAGE_KEY = 'gpc_learn_annotations';
  var AUTHOR = 'Key-User';
  var SELECTABLE = 'input, select, textarea, button, a, th, td, .btn, .select-integrated, .input-integrated, .checkbox-group, .radio-option, .us-tab, .us-series-item, .thermo-card, .us-section-card, label, h3, h4, [data-annotation]';

  /* ----- State ----- */
  var isActive = false;
  var isLocked = false;
  var isPickingDep = false;
  var hoveredEl = null;
  var lockedEl = null;
  var depFields = [];
  var annotations = loadAnnotations();

  /* ----- Persistence ----- */
  function loadAnnotations() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch(e) { return []; }
  }

  function saveAnnotations() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(annotations));
  }

  function getPageName() {
    var path = window.location.pathname.split('/').pop() || 'index.html';
    return path.replace('.html', '');
  }

  function getElementPath(el) {
    var parts = [];
    var current = el;
    while (current && current !== document.body && parts.length < 6) {
      var tag = current.tagName.toLowerCase();
      if (current.id) { parts.unshift(tag + '#' + current.id); break; }
      var cls = current.className && typeof current.className === 'string'
        ? '.' + current.className.trim().split(/\s+/).slice(0, 2).join('.')
        : '';
      parts.unshift(tag + cls);
      current = current.parentElement;
    }
    return parts.join(' > ');
  }

  function getFieldLabel(el) {
    /* Try to find the label associated with this element */
    var group = el.closest('.form-group') || el.closest('.checkbox-group') || el.closest('.radio-option');
    if (group) {
      var lbl = group.querySelector('label');
      if (lbl) return lbl.textContent.trim().replace(/:$/, '');
    }
    /* Try preceding label sibling */
    if (el.id) {
      var forLabel = document.querySelector('label[for="' + el.id + '"]');
      if (forLabel) return forLabel.textContent.trim().replace(/:$/, '');
    }
    /* Try card title */
    var card = el.closest('.thermo-card') || el.closest('.us-section-card');
    if (card) {
      var title = card.querySelector('.thermo-card-title, .us-accordion h3');
      if (title) return title.textContent.trim();
    }
    /* Fallback to element text or tag */
    var txt = el.textContent ? el.textContent.trim().substring(0, 40) : '';
    return txt || el.tagName.toLowerCase();
  }

  function findAnnotation(el) {
    var path = getElementPath(el);
    var page = getPageName();
    for (var i = 0; i < annotations.length; i++) {
      if (annotations[i].elementPath === path && annotations[i].page === page) return annotations[i];
    }
    return null;
  }

  /* ----- DOM: Overlay ----- */
  var overlay = document.createElement('div');
  overlay.id = 'learn-overlay';
  overlay.innerHTML = '';
  Object.assign(overlay.style, {
    display: 'none',
    position: 'fixed',
    inset: '0',
    zIndex: '9999',
    background: OVERLAY_BG,
    cursor: 'default',
    transition: 'opacity .3s ease',
    opacity: '0'
  });

  /* Scanning animation */
  var scanLine = document.createElement('div');
  Object.assign(scanLine.style, {
    position: 'absolute',
    left: '0', right: '0',
    height: '2px',
    background: 'linear-gradient(90deg, transparent, ' + GUENTNER_BLUE + ', transparent)',
    opacity: '0.4',
    animation: 'learnScan 3s ease-in-out infinite'
  });
  overlay.appendChild(scanLine);

  /* ----- DOM: Highlight box ----- */
  var highlight = document.createElement('div');
  highlight.id = 'learn-highlight';
  Object.assign(highlight.style, {
    display: 'none',
    position: 'fixed',
    pointerEvents: 'none',
    border: '2px dashed ' + GUENTNER_BLUE,
    borderRadius: '4px',
    zIndex: '10000',
    transition: 'top .1s, left .1s, width .1s, height .1s',
    boxShadow: '0 0 0 4000px rgba(0,84,159,0.06)'
  });

  /* Element label tag */
  var highlightLabel = document.createElement('div');
  Object.assign(highlightLabel.style, {
    position: 'absolute',
    bottom: '100%',
    left: '0',
    background: GUENTNER_BLUE,
    color: '#fff',
    fontSize: '11px',
    fontWeight: '600',
    padding: '2px 8px',
    borderRadius: '3px 3px 0 0',
    whiteSpace: 'nowrap',
    maxWidth: '300px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    fontFamily: 'var(--font, sans-serif)'
  });
  highlight.appendChild(highlightLabel);

  /* ----- DOM: Sidebar ----- */
  var sidebar = document.createElement('div');
  sidebar.id = 'learn-sidebar';
  sidebar.innerHTML =
    '<div class="learn-sidebar-header">' +
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a7 7 0 017 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 01-2 2h-4a2 2 0 01-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 017-7z"/><line x1="9" y1="21" x2="15" y2="21"/></svg>' +
      '<span>Annotation Editor</span>' +
      '<button id="learn-sidebar-close" aria-label="Close">&times;</button>' +
    '</div>' +
    '<div class="learn-sidebar-body">' +
      '<div class="learn-field">' +
        '<label>Element ID</label>' +
        '<input type="text" id="learn-el-id" readonly>' +
      '</div>' +
      '<div class="learn-field">' +
        '<label>Page</label>' +
        '<input type="text" id="learn-page" readonly>' +
      '</div>' +
      '<div class="learn-field">' +
        '<label>Context Type</label>' +
        '<select id="learn-context">' +
          '<option value="">— Select —</option>' +
          '<option value="Info Icon">Info Icon</option>' +
          '<option value="Dependency Information">Dependency Information</option>' +
          '<option value="Chatbot Information">Chatbot Information</option>' +
          '<option value="Sales Tip">Sales Tip</option>' +
        '</select>' +
      '</div>' +
      '<div class="learn-field learn-dep-section" id="learn-dep-section" style="display:none;">' +
        '<label>Related Fields</label>' +
        '<div id="learn-dep-list" class="learn-dep-list"></div>' +
        '<button type="button" id="learn-dep-add" class="learn-btn learn-btn-outline learn-dep-add">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>' +
          ' Add related field' +
        '</button>' +
      '</div>' +
      '<div class="learn-field">' +
        '<label>Expert Description</label>' +
        '<textarea id="learn-desc" rows="5" placeholder="Explain what this element does, why it matters, or how it relates to other parameters..."></textarea>' +
      '</div>' +
    '</div>' +
    '<div class="learn-sidebar-footer">' +
      '<button id="learn-save" class="learn-btn learn-btn-primary">Save Annotation</button>' +
      '<button id="learn-discard" class="learn-btn learn-btn-outline">Discard</button>' +
    '</div>';

  /* ----- DOM: Toggle button (floating) ----- */
  var toggleBtn = document.createElement('button');
  toggleBtn.id = 'learn-toggle';
  toggleBtn.innerHTML =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a7 7 0 017 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 01-2 2h-4a2 2 0 01-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 017-7z"/><line x1="9" y1="21" x2="15" y2="21"/></svg>' +
    '<span>Learn Mode</span>';

  /* ----- Inject CSS ----- */
  var style = document.createElement('style');
  style.textContent =
    '@keyframes learnScan { 0% { top: 0; } 50% { top: 100%; } 100% { top: 0; } }' +
    '@keyframes learnPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(0,84,159,.3); } 50% { box-shadow: 0 0 0 6px rgba(0,84,159,0); } }' +

    /* Toggle button */
    '#learn-toggle {' +
      'position: fixed; bottom: 90px; right: 24px; z-index: 10002;' +
      'display: flex; align-items: center; gap: 8px;' +
      'background: ' + GUENTNER_BLUE + '; color: #fff;' +
      'border: none; border-radius: 8px; padding: 10px 18px;' +
      'font-family: var(--font, sans-serif); font-size: 13px; font-weight: 600;' +
      'cursor: pointer; box-shadow: 0 4px 16px rgba(0,84,159,.35);' +
      'transition: background .2s, transform .2s;' +
    '}' +
    '#learn-toggle:hover { background: #003d7a; transform: translateY(-1px); }' +
    '#learn-toggle.active { background: #c0392b; }' +
    '#learn-toggle.active:hover { background: #a93226; }' +

    /* Sidebar */
    '#learn-sidebar {' +
      'display: none; position: fixed; top: 0; right: 0; bottom: 0; width: 380px;' +
      'background: #fff; z-index: 10001; box-shadow: -4px 0 24px rgba(0,0,0,.12);' +
      'font-family: var(--font, sans-serif); flex-direction: column;' +
      'transition: transform .3s ease; transform: translateX(100%);' +
    '}' +
    '#learn-sidebar.open { display: flex; transform: translateX(0); }' +

    '.learn-sidebar-header {' +
      'display: flex; align-items: center; gap: 10px;' +
      'padding: 20px 24px; border-bottom: 1px solid #ececec;' +
      'background: ' + GUENTNER_BLUE + '; color: #fff;' +
    '}' +
    '.learn-sidebar-header span { flex: 1; font-size: 15px; font-weight: 600; }' +
    '.learn-sidebar-header button {' +
      'background: none; border: none; color: #fff; font-size: 22px;' +
      'cursor: pointer; padding: 0; line-height: 1; opacity: .7;' +
    '}' +
    '.learn-sidebar-header button:hover { opacity: 1; }' +

    '.learn-sidebar-body { flex: 1; overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 20px; }' +

    '.learn-field label {' +
      'display: block; font-size: 12px; font-weight: 500;' +
      'color: #636362; margin-bottom: 6px; text-transform: uppercase; letter-spacing: .5px;' +
    '}' +
    '.learn-field input, .learn-field select, .learn-field textarea {' +
      'width: 100%; padding: 10px 14px; border: 1px solid #c5c5c5; border-radius: 4px;' +
      'font-family: inherit; font-size: 14px; color: #3c3c3b; background: #fff;' +
      'outline: none; box-sizing: border-box;' +
    '}' +
    '.learn-field input:focus, .learn-field select:focus, .learn-field textarea:focus {' +
      'border-color: ' + GUENTNER_BLUE + '; box-shadow: 0 0 0 3px rgba(0,84,159,.12);' +
    '}' +
    '.learn-field input[readonly] { background: #f5f5f5; color: #888; }' +
    '.learn-field textarea { resize: vertical; min-height: 100px; }' +

    /* Dependency section */
    '.learn-dep-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px; }' +
    '.learn-dep-item {' +
      'display: flex; align-items: center; gap: 8px; padding: 8px 10px;' +
      'background: #f5f7fa; border: 1px solid #e0e4ea; border-radius: 4px; font-size: 12.5px; color: #3c3c3b;' +
    '}' +
    '.learn-dep-item span { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: monospace; font-size: 11.5px; }' +
    '.learn-dep-item button {' +
      'background: none; border: none; cursor: pointer; color: #c0392b; font-size: 16px; line-height: 1; padding: 0 2px; flex-shrink: 0;' +
    '}' +
    '.learn-dep-item button:hover { color: #e74c3c; }' +
    '.learn-dep-add {' +
      'display: flex; align-items: center; justify-content: center; gap: 6px;' +
      'width: 100%; padding: 8px 12px; font-size: 13px;' +
    '}' +
    '.learn-dep-picking { background: rgba(0,84,159,.08); border-style: dashed; }' +

    '.learn-sidebar-footer {' +
      'display: flex; gap: 12px; padding: 20px 24px; border-top: 1px solid #ececec;' +
    '}' +
    '.learn-btn {' +
      'flex: 1; padding: 10px 16px; border-radius: 4px; font-family: inherit;' +
      'font-size: 14px; font-weight: 600; cursor: pointer; border: none; transition: background .2s;' +
    '}' +
    '.learn-btn-primary { background: ' + GUENTNER_BLUE + '; color: #fff; }' +
    '.learn-btn-primary:hover { background: #003d7a; }' +
    '.learn-btn-outline { background: #fff; color: ' + GUENTNER_BLUE + '; border: 1px solid ' + GUENTNER_BLUE + '; }' +
    '.learn-btn-outline:hover { background: rgba(0,84,159,.06); }' +

    /* Brain markers */
    '.learn-marker {' +
      'display: inline-flex; align-items: center; justify-content: center;' +
      'width: 22px; height: 22px; font-size: 14px; cursor: pointer;' +
      'position: relative; vertical-align: middle; margin-left: 4px; flex-shrink: 0;' +
      'animation: learnPulse 2s infinite;' +
      'border-radius: 50%; background: rgba(0,84,159,.08);' +
    '}' +
    '.learn-marker-tooltip {' +
      'display: none; position: absolute; bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%);' +
      'background: #1a1f2e; color: #fff; padding: 10px 14px; border-radius: 6px;' +
      'font-size: 12.5px; line-height: 1.5; width: 260px; z-index: 10003;' +
      'box-shadow: 0 4px 16px rgba(0,0,0,.2); pointer-events: none;' +
    '}' +
    '.learn-marker-tooltip::after {' +
      'content: ""; position: absolute; top: 100%; left: 50%; transform: translateX(-50%);' +
      'border: 6px solid transparent; border-top-color: #1a1f2e;' +
    '}' +
    '.learn-marker:hover .learn-marker-tooltip { display: block; }' +
    '.learn-marker-type { color: #39edb5; font-weight: 600; display: block; margin-bottom: 4px; font-size: 11px; text-transform: uppercase; letter-spacing: .5px; }' +
    '.learn-marker-author { color: #888; font-size: 11px; margin-top: 6px; display: block; }';

  document.head.appendChild(style);
  document.body.appendChild(overlay);
  document.body.appendChild(highlight);
  document.body.appendChild(sidebar);
  document.body.appendChild(toggleBtn);

  /* ----- Element Picking ----- */
  function positionHighlight(el) {
    var r = el.getBoundingClientRect();
    highlight.style.display = 'block';
    highlight.style.top = r.top - 2 + 'px';
    highlight.style.left = r.left - 2 + 'px';
    highlight.style.width = r.width + 4 + 'px';
    highlight.style.height = r.height + 4 + 'px';

    var tag = el.tagName.toLowerCase();
    var id = el.id ? '#' + el.id : '';
    var label = el.closest('label') ? el.closest('label').textContent.trim().substring(0, 40) : '';
    var text = el.textContent ? el.textContent.trim().substring(0, 30) : '';
    highlightLabel.textContent = '<' + tag + id + '>' + (label || text ? ' — ' + (label || text) : '');
  }

  function hideHighlight() {
    highlight.style.display = 'none';
  }

  overlay.addEventListener('mousemove', function(e) {
    if (isLocked && !isPickingDep) return;
    overlay.style.pointerEvents = 'none';
    var el = document.elementFromPoint(e.clientX, e.clientY);
    overlay.style.pointerEvents = 'auto';

    if (!el || el === document.body || el === document.documentElement) {
      hideHighlight();
      hoveredEl = null;
      return;
    }

    /* Walk up to find a meaningful selectable element */
    var target = el.closest(SELECTABLE);
    if (!target || target.closest('#learn-sidebar') || target.closest('#learn-toggle')) {
      hideHighlight();
      hoveredEl = null;
      return;
    }

    if (target !== hoveredEl) {
      hoveredEl = target;
      positionHighlight(target);
      if (isPickingDep) {
        highlight.style.border = '2px dashed ' + GUENTNER_BLUE;
        highlightLabel.style.background = GUENTNER_BLUE;
      }
    }
  });

  overlay.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();

    if (!hoveredEl) return;

    /* Dependency picking mode */
    if (isPickingDep) {
      var path = getElementPath(hoveredEl);
      var mainPath = document.getElementById('learn-el-id').value;
      if (path === mainPath) return; /* can't add self */
      for (var i = 0; i < depFields.length; i++) { if (depFields[i].path === path) return; } /* no dupes */

      var fieldLabel = getFieldLabel(hoveredEl);
      depFields.push({ path: path, label: fieldLabel });
      renderDepList();
      /* Stay in picking mode so user can add more */
      return;
    }

    if (isLocked) return;
    lockElement(hoveredEl);
  });

  /* ----- Dependency Picker Helpers ----- */
  var depSection = null;
  var depList = null;
  var depAddBtn = null;

  function initDepRefs() {
    depSection = document.getElementById('learn-dep-section');
    depList = document.getElementById('learn-dep-list');
    depAddBtn = document.getElementById('learn-dep-add');
  }

  function renderDepList() {
    if (!depList) return;
    depList.innerHTML = '';
    depFields.forEach(function(dep, idx) {
      var item = document.createElement('div');
      item.className = 'learn-dep-item';
      item.innerHTML = '<span title="' + escapeHtml(dep.path) + '">' + escapeHtml(dep.label || dep.path) + '</span>' +
        '<button type="button" data-idx="' + idx + '" title="Remove">&times;</button>';
      item.querySelector('button').addEventListener('click', function() {
        depFields.splice(idx, 1);
        renderDepList();
      });
      depList.appendChild(item);
    });
  }

  function showDepSection(show) {
    if (depSection) depSection.style.display = show ? 'block' : 'none';
  }

  function startPickingDep() {
    isPickingDep = true;
    overlay.style.pointerEvents = 'auto';
    if (depAddBtn) {
      depAddBtn.classList.add('learn-dep-picking');
      depAddBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Done selecting';
    }
  }

  function stopPickingDep() {
    isPickingDep = false;
    if (depAddBtn) {
      depAddBtn.classList.remove('learn-dep-picking');
      depAddBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add related field';
    }
    highlight.style.border = '2px dashed ' + GUENTNER_BLUE;
    highlightLabel.style.background = GUENTNER_BLUE;
    hideHighlight();
  }

  /* ----- Lock & Open Sidebar ----- */
  function lockElement(el) {
    isLocked = true;
    lockedEl = el;
    highlight.style.border = '2px solid ' + GUENTNER_BLUE;
    highlight.style.background = 'rgba(0,84,159,0.06)';

    /* Populate sidebar */
    var path = getElementPath(el);
    document.getElementById('learn-el-id').value = path;
    document.getElementById('learn-page').value = getPageName();

    /* Check for existing annotation */
    var existing = findAnnotation(el);
    if (existing) {
      document.getElementById('learn-context').value = existing.contextType || '';
      document.getElementById('learn-desc').value = existing.expertComment || '';
      depFields = existing.dependencies ? existing.dependencies.slice() : [];
    } else {
      document.getElementById('learn-context').value = '';
      document.getElementById('learn-desc').value = '';
      depFields = [];
    }

    initDepRefs();
    renderDepList();
    updateDepVisibility();

    sidebar.classList.add('open');
  }

  function unlockElement() {
    isLocked = false;
    isPickingDep = false;
    lockedEl = null;
    depFields = [];
    highlight.style.border = '2px dashed ' + GUENTNER_BLUE;
    highlight.style.background = 'none';
    hideHighlight();
    sidebar.classList.remove('open');
    showDepSection(false);
  }

  function updateDepVisibility() {
    var ctx = document.getElementById('learn-context').value;
    showDepSection(ctx === 'Dependency Information');
  }

  /* Context type change → show/hide dependency section */
  document.getElementById('learn-context').addEventListener('change', updateDepVisibility);

  /* Add dependency / Done button */
  sidebar.addEventListener('click', function(e) {
    if (e.target.closest('#learn-dep-add')) {
      if (isPickingDep) {
        stopPickingDep();
      } else {
        startPickingDep();
      }
    }
  });

  /* ----- Save / Discard ----- */
  document.getElementById('learn-save').addEventListener('click', function() {
    var context = document.getElementById('learn-context').value;
    var desc = document.getElementById('learn-desc').value.trim();
    if (!desc) { document.getElementById('learn-desc').focus(); return; }

    var path = document.getElementById('learn-el-id').value;
    var page = document.getElementById('learn-page').value;

    /* Remove existing annotation for same element/page */
    annotations = annotations.filter(function(a) {
      return !(a.elementPath === path && a.page === page);
    });

    var entry = {
      elementPath: path,
      page: page,
      contextType: context,
      expertComment: desc,
      timestamp: new Date().toISOString(),
      author: AUTHOR
    };

    if (context === 'Dependency Information' && depFields.length > 0) {
      entry.dependencies = depFields.slice();
    }

    annotations.push(entry);
    saveAnnotations();
    placeMarker(lockedEl, entry);
    unlockElement();
  });

  document.getElementById('learn-discard').addEventListener('click', unlockElement);
  document.getElementById('learn-sidebar-close').addEventListener('click', unlockElement);

  /* ----- Brain Markers ----- */
  function placeMarker(el, annotation) {
    /* Remove existing marker on this element */
    var existing = el.querySelector('.learn-marker');
    if (!existing && el.parentElement) existing = el.parentElement.querySelector('.learn-marker[data-learn-path="' + CSS.escape(annotation.elementPath) + '"]');
    if (existing) existing.remove();

    var marker = document.createElement('span');
    marker.className = 'learn-marker';
    marker.setAttribute('data-learn-path', annotation.elementPath);

    var depHtml = '';
    if (annotation.dependencies && annotation.dependencies.length > 0) {
      depHtml = '<span style="display:block; margin-top:6px; padding-top:6px; border-top:1px solid rgba(255,255,255,.15); font-size:11px; color:#a0a0a0;">Depends on:</span>';
      annotation.dependencies.forEach(function(dep) {
        depHtml += '<span style="display:block; font-size:11px; color:#39edb5; margin-top:2px;">' + escapeHtml(dep.label || dep.path) + '</span>';
      });
    }

    marker.innerHTML = '\uD83E\uDDE0' + /* 🧠 */
      '<span class="learn-marker-tooltip">' +
        '<span class="learn-marker-type">' + escapeHtml(annotation.contextType || 'Note') + '</span>' +
        escapeHtml(annotation.expertComment) +
        depHtml +
        '<span class="learn-marker-author">' + escapeHtml(annotation.author) + ' — ' + formatDate(annotation.timestamp) + '</span>' +
      '</span>';

    /* Insert after the element or its label */
    var target = el.closest('.form-group') || el.closest('.checkbox-group') || el.closest('.radio-option') || el;
    if (target.querySelector('.learn-marker')) return;
    target.style.position = 'relative';
    target.appendChild(marker);
  }

  function escapeHtml(s) {
    var div = document.createElement('div');
    div.textContent = s || '';
    return div.innerHTML;
  }

  function formatDate(iso) {
    try {
      var d = new Date(iso);
      return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch(e) { return iso; }
  }

  /* Restore markers on page load */
  function restoreMarkers() {
    var page = getPageName();
    annotations.forEach(function(a) {
      if (a.page !== page) return;
      /* Try to find the element by path */
      try {
        var parts = a.elementPath.split(' > ');
        var last = parts[parts.length - 1];
        var candidates = document.querySelectorAll(last.split('.')[0] + (last.indexOf('#') > -1 ? last.substring(last.indexOf('#')) : ''));
        for (var i = 0; i < candidates.length; i++) {
          if (getElementPath(candidates[i]) === a.elementPath) {
            placeMarker(candidates[i], a);
            return;
          }
        }
        /* Fallback: try CSS selector from path */
        var el = document.querySelector(a.elementPath);
        if (el) placeMarker(el, a);
      } catch(e) { /* element may no longer exist */ }
    });
  }

  /* ----- Activate / Deactivate ----- */
  function activate() {
    isActive = true;
    overlay.style.display = 'block';
    requestAnimationFrame(function() { overlay.style.opacity = '1'; });
    toggleBtn.classList.add('active');
    toggleBtn.querySelector('span').textContent = 'Exit Learn Mode';
  }

  function deactivate() {
    isActive = false;
    overlay.style.opacity = '0';
    setTimeout(function() { overlay.style.display = 'none'; }, 300);
    toggleBtn.classList.remove('active');
    toggleBtn.querySelector('span').textContent = 'Learn Mode';
    unlockElement();
    hideHighlight();
  }

  toggleBtn.addEventListener('click', function() {
    if (isActive) deactivate(); else activate();
  });

  /* ESC to cancel */
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      if (isLocked) unlockElement();
      else if (isActive) deactivate();
    }
  });

  /* ----- Init: restore markers for current page ----- */
  restoreMarkers();

})();
