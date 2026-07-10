/* ============================================================
   myGPC — Güntner Product Configurator
   Shared JavaScript
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ----- Feature Flags (read from localStorage, set via admin.html) ----- */
  const GPC_FEATURES = {
    aiLearnMode:     localStorage.getItem('gpc_feature_ai_learn_mode') === '1',
    chatbot:         localStorage.getItem('gpc_feature_chatbot') === '1',
    basicExpertView: localStorage.getItem('gpc_feature_basic_expert_view') === '1'
  };

  // Show or hide chatbot elements based on feature flag
  (function() {
    var chatEl = document.querySelector('.chatbot-dialog');
    var trigEl = document.querySelector('.chatbot-trigger');
    if (GPC_FEATURES.chatbot) {
      if (trigEl) trigEl.classList.add('visible');
    } else {
      if (trigEl) {
        trigEl.classList.remove('visible', 'open');
        trigEl.style.display = 'none';
      }
      if (chatEl) {
        chatEl.classList.remove('open', 'docked');
        chatEl.style.display = 'none';
      }
    }
  })();

  /* User avatar dropdown moved to site-header.js — it owns the avatar element. */

  /* ----- Index page accordion sections ----- */
  /* Most accordions toggle independently. Exception: Units and Bare Coils
     form a mutually-exclusive pair — opening one closes the other, because
     they represent competing product entry paths. */
  var ACCORDION_PAIRS = {
    'acc-category-block': 'acc-coils-block',
    'acc-coils-block':    'acc-category-block'
  };
  document.querySelectorAll('.index-accordion-header').forEach(function(header) {
    header.addEventListener('click', function() {
      var self = header.parentElement;
      var willOpen = !self.classList.contains('open');
      if (willOpen) {
        var partnerId = ACCORDION_PAIRS[self.id];
        if (partnerId) {
          var partner = document.getElementById(partnerId);
          if (partner) partner.classList.remove('open');
        }
      }
      self.classList.toggle('open', willOpen);
    });
  });

  /* ----- Hamburger menu toggle ----- */
  const hamburger = document.querySelector('.hamburger-btn');
  if (hamburger) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('open');
    });
  }

  /* ----- Collapsible sections ----- */
  document.querySelectorAll('.collapsible-header').forEach(header => {
    header.addEventListener('click', () => {
      header.classList.toggle('open');
      const body = header.nextElementSibling;
      if (body && body.classList.contains('collapsible-body')) {
        body.classList.toggle('open');
      }
    });
  });

  /* ----- Table sorting ----- */
  document.querySelectorAll('.data-table th[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
      const table = th.closest('table');
      const tbody = table.querySelector('tbody');
      const idx = Array.from(th.parentNode.children).indexOf(th);
      const rows = Array.from(tbody.querySelectorAll('tr'));
      const isAsc = th.classList.contains('sort-asc');

      // Clear all sort classes
      table.querySelectorAll('th').forEach(h => h.classList.remove('sort-asc', 'sort-desc'));
      th.classList.add(isAsc ? 'sort-desc' : 'sort-asc');

      rows.sort((a, b) => {
        const aVal = a.children[idx]?.textContent.trim() || '';
        const bVal = b.children[idx]?.textContent.trim() || '';
        const aNum = parseFloat(aVal);
        const bNum = parseFloat(bVal);
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return isAsc ? bNum - aNum : aNum - bNum;
        }
        return isAsc ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
      });

      rows.forEach(row => tbody.appendChild(row));
    });
  });

  /* ----- Pagination ----- */
  document.querySelectorAll('.pagination').forEach(pag => {
    pag.querySelectorAll('.page-btn:not(.nav-arrow)').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        pag.querySelectorAll('.page-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  });

  /* ----- Tabs ----- */
  document.querySelectorAll('.panel-tabs').forEach(tabs => {
    tabs.querySelectorAll('.panel-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
      });
    });
  });

  /* ----- Sidebar items ----- */
  document.querySelectorAll('.panel-sidebar').forEach(sidebar => {
    sidebar.querySelectorAll('.sidebar-item').forEach(item => {
      item.addEventListener('click', () => {
        sidebar.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
      });
    });
  });

  /* ----- Search input clear ----- */
  document.querySelectorAll('.search-input-wrap').forEach(wrap => {
    const input = wrap.querySelector('input');
    const clearBtn = wrap.querySelector('.clear-btn');
    if (input && clearBtn) {
      clearBtn.addEventListener('click', () => {
        input.value = '';
        input.focus();
      });
    }
  });

  /* ----- Form reset buttons ----- */
  document.querySelectorAll('.btn-reset').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const form = btn.closest('form') || document.querySelector('form');
      if (form) form.reset();
    });
  });

  /* ----- Unit Selection tabs (us-tabs) ----- */
  document.querySelectorAll('.us-tabs').forEach(tabGroup => {
    tabGroup.querySelectorAll('.us-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const targetId = tab.getAttribute('data-tab');
        if (!targetId) return;

        // Toggle active tab button
        tabGroup.querySelectorAll('.us-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // Toggle tab content panels (CSS handles display via .active class)
        const container = tabGroup.closest('.us-left');
        if (container) {
          container.querySelectorAll('.us-tab-content').forEach(panel => {
            panel.classList.remove('active');
          });
          const target = container.querySelector('#tab-' + targetId);
          if (target) {
            target.classList.add('active');
          }
        }
      });
    });
  });

  /* ----- Unit Selection accordion toggles (us-accordion) ----- */
  document.querySelectorAll('.us-accordion').forEach(acc => {
    acc.addEventListener('click', (e) => {
      if (e.target.type === 'checkbox') return;
      acc.classList.toggle('open');
      const body = acc.nextElementSibling;
      if (body && body.classList.contains('collapsible-body')) {
        body.classList.toggle('open');
      }
    });
  });

  /* ----- Series item selection ----- */
  document.querySelectorAll('.us-series-item').forEach(item => {
    item.addEventListener('click', () => {
      const container = item.closest('.us-tab-content') || item.closest('.us-left');
      if (container) {
        container.querySelectorAll('.us-series-item').forEach(i => i.classList.remove('active'));
      }
      item.classList.add('active');
    });
  });

  /* ----- Model table row selection ----- */
  document.querySelectorAll('.us-model-table-row').forEach(row => {
    row.addEventListener('click', () => {
      const table = row.closest('.us-model-table');
      if (table) {
        table.querySelectorAll('.us-model-table-row').forEach(r => r.classList.remove('selected'));
      }
      row.classList.add('selected');
    });
  });

  /* ----- Chatbot Configuration Wizard ----- */
  const chatTrigger = document.querySelector('.chatbot-trigger');
  const chatDialog = document.querySelector('.chatbot-dialog');
  const chatInput = document.querySelector('.chatbot-input');
  const chatSend = document.querySelector('.chatbot-send');
  const chatBody = document.querySelector('.chatbot-dialog-body');
  const chatExpandBtn = document.querySelector('.chatbot-expand');

  /* Docked mode elements */
  const dockedChatBody = document.querySelector('.chatbot-docked-chat-body');
  const dockedInput = document.querySelector('.chatbot-docked-input');
  const dockedSend = document.querySelector('.chatbot-docked-send');
  const guidanceArea = document.getElementById('guidance-active-area');

  if (chatTrigger && chatDialog) {

    let isDocked = false;

    /* --- Active chat body (switches between floating and docked) --- */
    function getActiveChatBody() {
      return isDocked ? dockedChatBody : chatBody;
    }

    function getActiveInput() {
      return isDocked ? dockedInput : chatInput;
    }

    /* --- Open / Close --- */
    function toggleChat() {
      if (isDocked) {
        closeChat();
        return;
      }
      const wasOpen = chatDialog.classList.contains('open');
      chatTrigger.classList.toggle('open');
      chatDialog.classList.toggle('open');
      if (!wasOpen) {
        if (wizard.step === 0) showWelcome();
        if (chatInput) setTimeout(() => chatInput.focus(), 200);
      }
    }

    function closeChat() {
      if (isDocked) undock();
      chatTrigger.classList.remove('open', 'docked-active');
      chatDialog.classList.remove('open', 'docked');
      isDocked = false;
      saveChatDocked(false);
    }

    chatTrigger.addEventListener('click', toggleChat);
    const chatClose = document.querySelector('.chatbot-close');
    if (chatClose) chatClose.addEventListener('click', closeChat);

    /* --- Expand / Collapse (fixed right sidebar) --- */
    /* Move all child nodes from one container to another. We need to MOVE,
       not innerHTML-copy, because cloning loses the click listeners attached
       to choice buttons (welcome CTA, category pills, …). */
    function moveChildren(from, to) {
      if (!from || !to) return;
      while (from.firstChild) to.appendChild(from.firstChild);
    }

    function dock() {
      isDocked = true;
      chatDialog.classList.add('docked');
      chatTrigger.classList.add('docked-active');

      /* Move chat history into the expanded chat body (keeps listeners). */
      if (dockedChatBody) {
        moveChildren(chatBody, dockedChatBody);
        scrollDockedChat();
      }

      /* Sync guidance cards with wizard data */
      syncGuidanceCards();

      if (wizard.step === 0) {
        showGuidanceWelcome();
      } else {
        renderGuidanceActiveStep();
      }
      saveChatDocked(true);
    }

    function undock() {
      isDocked = false;
      chatDialog.classList.remove('docked');
      chatTrigger.classList.remove('docked-active');

      /* Move chat history back to the floating body (keeps listeners). */
      if (dockedChatBody) {
        moveChildren(dockedChatBody, chatBody);
        scrollChat();
      }
      saveChatDocked(false);
    }

    function saveChatDocked(isDock) {
      localStorage.setItem('gpc_chat_docked', isDock ? '1' : '0');
    }

    if (chatExpandBtn) {
      chatExpandBtn.addEventListener('click', () => {
        if (isDocked) {
          undock();
        } else {
          dock();
        }
      });
    }

    /* --- Helpers --- */
    function scrollChat() {
      setTimeout(() => { chatBody.scrollTop = chatBody.scrollHeight; }, 50);
    }

    function scrollDockedChat() {
      if (dockedChatBody) {
        setTimeout(() => { dockedChatBody.scrollTop = dockedChatBody.scrollHeight; }, 50);
      }
    }

    function scrollActiveChat() {
      if (isDocked) scrollDockedChat(); else scrollChat();
    }

    function addBot(html) {
      const target = getActiveChatBody();
      const msg = document.createElement('div');
      msg.className = 'chatbot-msg bot';
      msg.innerHTML = html;
      target.appendChild(msg);
      scrollActiveChat();
      return msg;
    }

    function addUser(text) {
      const target = getActiveChatBody();
      const msg = document.createElement('div');
      msg.className = 'chatbot-msg user';
      msg.textContent = text;
      target.appendChild(msg);
      scrollActiveChat();
    }

    function addStepLabel(label) {
      const target = getActiveChatBody();
      const el = document.createElement('div');
      el.className = 'chatbot-step-indicator';
      el.textContent = label;
      target.appendChild(el);
      scrollActiveChat();
    }

    function addChoices(options, callback) {
      const target = getActiveChatBody();
      const wrap = document.createElement('div');
      wrap.className = 'chatbot-choices';
      options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'chatbot-choice-btn';
        btn.textContent = opt;
        btn.addEventListener('click', () => {
          wrap.querySelectorAll('.chatbot-choice-btn').forEach(b => {
            b.classList.add('selected');
            b.disabled = true;
          });
          btn.style.opacity = '1';
          addUser(opt);
          callback(opt);
        });
        wrap.appendChild(btn);
      });
      target.appendChild(wrap);
      scrollActiveChat();
    }

    function showTyping() {
      const target = getActiveChatBody();
      const el = document.createElement('div');
      el.className = 'chatbot-typing';
      el.innerHTML = '<span></span><span></span><span></span>';
      target.appendChild(el);
      scrollActiveChat();
      return el;
    }

    function botReply(html, delay) {
      return new Promise(resolve => {
        const typing = showTyping();
        setTimeout(() => {
          typing.remove();
          addBot(html);
          resolve();
        }, delay || 700);
      });
    }

    function botChoices(html, options, delay) {
      return new Promise(resolve => {
        const typing = showTyping();
        setTimeout(() => {
          typing.remove();
          addBot(html);
          addChoices(options, resolve);
        }, delay || 700);
      });
    }

    /* --- Highlight form fields --- */
    function clearHighlights() {
      document.querySelectorAll('.chatbot-highlight').forEach(el => {
        el.classList.remove('chatbot-highlight');
      });
      document.querySelectorAll('.chatbot-highlight-label').forEach(el => el.remove());
    }

    function highlightField(selector, label) {
      clearHighlights();
      const el = document.querySelector(selector);
      if (!el) return;
      el.classList.add('chatbot-highlight');
      if (label) {
        const tag = document.createElement('span');
        tag.className = 'chatbot-highlight-label';
        tag.textContent = label;
        const parent = el.closest('.form-group') || el.parentElement;
        if (parent) { parent.style.position = 'relative'; parent.appendChild(tag); }
      }
      /* Only scroll when the element is completely out of view. If any pixel
         is currently visible (or the element is taller than the viewport),
         leave the page where it is — the highlight ring is enough of a cue
         and any auto-scroll feels jarring while the user reads the chat. */
      const rect = el.getBoundingClientRect();
      const viewportH = window.innerHeight || document.documentElement.clientHeight;
      const anyPartVisible = rect.bottom > 0 && rect.top < viewportH;
      if (!anyPartVisible) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }

    function fillField(selector, value) {
      const el = document.querySelector(selector);
      if (!el) return;
      if (el.tagName === 'SELECT') {
        let matched = false;
        for (const opt of el.options) {
          if (opt.text.toLowerCase().includes(value.toLowerCase())) {
            el.value = opt.value;
            matched = true;
            break;
          }
        }
        if (!matched && el.options.length > 0) el.selectedIndex = 0;
      } else if (el.tagName === 'INPUT') {
        el.value = value;
      }
      el.style.transition = 'background .3s';
      el.style.background = 'rgba(38,143,243,.1)';
      setTimeout(() => { el.style.background = ''; }, 1500);
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }

    /* --- Wizard state (persisted across pages) --- */
    function saveWizard() {
      localStorage.setItem('gpc_wizard', JSON.stringify(wizard));
    }
    function loadWizard() {
      try { return JSON.parse(localStorage.getItem('gpc_wizard')) || null; } catch(e) { return null; }
    }
    function clearWizardStorage() {
      localStorage.removeItem('gpc_wizard');
    }

    /* --- Detect current page --- */
    const path = window.location.pathname.toLowerCase();
    const pageName = path.includes('thermodynamics') ? 'thermodynamics'
      : path.includes('unit-selection') ? 'unit-selection'
      : path.includes('results') ? 'results'
      : path.includes('datasheet') ? 'datasheet'
      : 'category';
    const isThermo = pageName === 'thermodynamics';
    /* Start page = myGPC landing (index.html or root). Always restart the
       wizard here so the user is re-asked which entry path they want. */
    const isStartPage = path === '/' || path === '' || /\/index\.html?$/.test(path);

    if (isStartPage) clearWizardStorage();
    const saved = isStartPage ? null : loadWizard();
    const wizard = saved || { step: 0, data: {}, awaitingInput: null };

    /* --- Product recommendation logic --- */
    function getRecommendation(data) {
      const cat = data.category || '';
      const kw = parseFloat(data.capacity) || 10;
      const ref = data.refrigerant || 'R134a';
      let series, model;
      // Match both English (current bot labels) and the legacy German values
      if (cat.includes('Evaporator') || cat.includes('Verdampfer')) {
        if (kw <= 20) { series = 'GACC RX'; model = 'GACC RX 031.1/1-40.A'; }
        else if (kw <= 60) { series = 'GACV AP'; model = 'GACV AP 080.2HN/2E-A0.B'; }
        else { series = 'GACV AP'; model = 'GACV AP 071.2JN/2E-A0.B'; }
      } else if (cat.includes('Condenser') || cat.includes('Verfl')) {
        if (kw <= 30) { series = 'GCVC'; model = 'GCVC RD 040.1/11-34'; }
        else { series = 'GCHV'; model = 'GCHV 100.2/2-DS.E'; }
      } else {
        if (kw <= 50) { series = 'GFH'; model = 'GFH 052A/2-L.E'; }
        else { series = 'GFD'; model = 'GFD 100.1/3-LN.E'; }
      }
      return { series, model, ref };
    }

    /* --- Page-specific greeting messages --- */
    const pageGreetings = {
      'category': {
        title: 'Product Configuration',
        text: 'Hello! Can I help you configure a product? Which unit do you need?',
        btn: 'Start configuration'
      },
      'thermodynamics': {
        title: 'Thermodynamics',
        text: 'I see you are on the thermodynamic parameters page. Shall I guide you through the settings for refrigerant, temperature and capacity?',
        btn: 'Configure parameters'
      },
      'unit-selection': {
        title: 'Unit Selection',
        text: 'You have reached the unit selection step. I can help you pick the right series and options for your requirements.',
        btn: 'Start selection'
      },
      'results': {
        title: 'Results Overview',
        text: 'These are the matching units. Shall I explain the differences between the models or help you make a choice?',
        btn: 'Discuss results'
      },
      'datasheet': {
        title: 'Datasheet',
        text: 'You are viewing the technical details. Do you have questions about the specifications, or would you like to configure the product?',
        btn: 'Ask a question'
      }
    };

    /* --- Welcome screen (page-aware) --- */
    function showWelcome() {
      const target = getActiveChatBody();
      target.innerHTML = '';
      const g = pageGreetings[pageName] || pageGreetings['category'];

      /* Show bot greeting as a chat bubble */
      const greeting = document.createElement('div');
      greeting.className = 'chatbot-msg bot';
      greeting.innerHTML = '<strong>' + g.title + '</strong><br>' + g.text;
      target.appendChild(greeting);

      /* Show action button as a choice */
      const choices = document.createElement('div');
      choices.className = 'chatbot-choices';
      const btn = document.createElement('button');
      btn.className = 'chatbot-choice-btn';
      btn.textContent = g.btn;
      btn.addEventListener('click', () => {
        btn.classList.add('selected');
        btn.disabled = true;
        addUser(g.btn);
        startFromCurrentPage();
      });
      choices.appendChild(btn);
      target.appendChild(choices);
      scrollActiveChat();
    }

    /* --- Start wizard from the appropriate step based on current page --- */
    function startFromCurrentPage() {
      if (pageName === 'category') {
        wizardStart();
      } else if (pageName === 'thermodynamics') {
        wizard.step = 3;
        if (!wizard.data.category) wizard.data.category = 'Evaporator';
        if (!wizard.data.application) wizard.data.application = 'Cold storage';
        saveWizard();
        addBot('Let us start with the thermodynamic configuration.');
        setTimeout(() => wizardStep3(), 400);
      } else if (pageName === 'unit-selection') {
        addBot('I will help you with the unit selection. Take a look at the series on the left — I can explain the details of each one.');
        wizard.awaitingInput = null;
      } else if (pageName === 'results') {
        addBot('The table shows all matching units. Click on a Unit Key to open the datasheet. Shall I explain the values?');
        wizard.awaitingInput = null;
      } else if (pageName === 'datasheet') {
        addBot('The datasheet shows all technical specifications. Feel free to ask me about individual values — I will explain the details.');
        wizard.awaitingInput = null;
      }
    }

    /* --- Guidance panel (docked mode) --- */
    function syncGuidanceCards() {
      const d = wizard.data;
      const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val || '';
      };
      setVal('gv-category', d.category);
      setVal('gv-application', d.application);
      setVal('gv-capacity', d.capacity ? d.capacity + ' kW' : '');
      setVal('gv-refrigerant', d.refrigerant);
      setVal('gv-temperature', d.temperature ? d.temperature + ' °C' : '');

      if (wizard.step === 6 && d.category) {
        const rec = getRecommendation(d);
        setVal('gv-summary', rec.model);
      }

      /* Update card states */
      document.querySelectorAll('.guidance-step-card').forEach(card => {
        const step = parseInt(card.getAttribute('data-guidance-step'));
        card.classList.remove('active', 'completed');
        if (step < wizard.step) card.classList.add('completed');
        if (step === wizard.step) card.classList.add('active');
      });
    }

    function showGuidanceWelcome() {
      if (!guidanceArea) return;
      guidanceArea.innerHTML =
        '<h4>Ready to configure</h4>' +
        '<p style="color:var(--text-light); margin-bottom:16px;">Click "Start configuration" in the chat on the right, or pick a step directly.</p>';
    }

    function renderGuidanceActiveStep() {
      if (!guidanceArea) return;
      syncGuidanceCards();

      const stepLabels = {
        1: 'Product category',
        2: 'Application',
        3: 'Cooling capacity',
        4: 'Refrigerant',
        5: 'Ambient temperature',
        6: 'Summary'
      };

      if (wizard.step >= 1 && wizard.step <= 5) {
        guidanceArea.innerHTML =
          '<h4>Current step: ' + stepLabels[wizard.step] + '</h4>' +
          '<p style="color:var(--text-light);">Please answer the question in the chat on the right.</p>';
      } else if (wizard.step === 6) {
        const d = wizard.data;
        const rec = getRecommendation(d);
        guidanceArea.innerHTML =
          '<h4>Recommendation</h4>' +
          '<div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:12px; font-size:14px;">' +
            '<div><span style="color:var(--text-light);">Model:</span><br><strong>' + rec.model + '</strong></div>' +
            '<div><span style="color:var(--text-light);">Series:</span><br><strong>' + rec.series + '</strong></div>' +
            '<div><span style="color:var(--text-light);">Refrigerant:</span><br><strong>' + rec.ref + '</strong></div>' +
            '<div><span style="color:var(--text-light);">Capacity:</span><br><strong>' + (d.capacity || '—') + ' kW</strong></div>' +
          '</div>';
      }
    }

    /* --- Replay previous answers in chat --- */
    function replayHistory() {
      const d = wizard.data;
      if (d.category) {
        addStepLabel('Step 1 of 6 — Product category');
        addBot('Which Güntner product would you like to configure?');
        addUser(d.category);
      }
      if (d.application) {
        addStepLabel('Step 2 of 6 — Application');
        addBot('For which application will the unit be used?');
        addUser(d.application);
      }
      if (d.capacity) {
        addStepLabel('Step 3 of 6 — Cooling capacity');
        addBot('What cooling capacity do you need in kW?');
        addUser(d.capacity + ' kW');
      }
      if (d.refrigerant) {
        addStepLabel('Step 4 of 6 — Refrigerant');
        addBot('Which refrigerant is used in your system?');
        addUser(d.refrigerant);
      }
      if (d.temperature) {
        addStepLabel('Step 5 of 6 — Ambient temperature');
        addBot('What is the maximum ambient temperature at the installation site in °C?');
        addUser(d.temperature + ' °C');
      }
    }

    /* --- Wizard steps --- */
    async function wizardStart() {
      /* On the start page (index.html) the basic user journey is:
         click "Start configuration" → open the Units accordion → ask
         for the category right away. The entry-path question (Category /
         Application / Bare Coil) is intentionally skipped here so the bot
         lands the user directly in the cards. */
      if (isStartPage) {
        wizard.data.entryPath = 'Category';
        saveWizard();
        openAccordion('#acc-category');
      }
      wizard.step = 1;
      await botReply('Great! I will walk you through the configuration in 6 short steps.', 500);
      if (isDocked) { syncGuidanceCards(); renderGuidanceActiveStep(); }
      wizardStep1();
    }

    /* Mark the card on the index page that matches a chat-selected category.
       Maps the bot label to a search term and finds the right `.cat-card`
       (matched against the card title or its action buttons). */
    function markCatCardActive(category) {
      const cards = document.querySelectorAll('.cat-card');
      if (!cards.length || !category) return;
      const synonyms = {
        // English (current bot labels)
        'Evaporator': 'evaporator',
        'Condenser': 'condenser',
        'Dry Cooler': 'dry cooler',
        'Air Cooler': 'air cooler',
        'Oil Cooler': 'oil cooler',
        'Subcooler': 'subcooler',
        'Gas Cooler': 'gas cooler',
        // German legacy (still recognised so older saved wizard state matches)
        'Verdampfer': 'evaporator',
        'Verflussiger': 'condenser',
        'Verflüssiger': 'condenser'
      };
      const term = (synonyms[category] || category).toLowerCase();
      cards.forEach(c => c.classList.remove('is-selected'));
      for (const card of cards) {
        const titleEl = card.querySelector('.cat-card-title');
        const title = (titleEl ? titleEl.textContent : '').toLowerCase();
        const btns = Array.from(card.querySelectorAll('.cat-card-btn'))
          .map(b => b.textContent.toLowerCase()).join(' ');
        if (title.indexOf(term) !== -1 || btns.indexOf(term) !== -1) {
          card.classList.add('is-selected');
          try { card.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
          break;
        }
      }
    }

    /* Open an index-page accordion (Units / By Application / Bare Coils),
       collapse all others, and bring the active one into user focus. */
    function openAccordion(headerSelector) {
      const header = document.querySelector(headerSelector);
      if (!header) return;
      const target = header.closest('.index-accordion');
      if (!target) return;

      /* Collapse all other accordions */
      document.querySelectorAll('.index-accordion.open').forEach(acc => {
        if (acc !== target) acc.classList.remove('open');
      });

      /* Open and visually emphasise the target */
      target.classList.add('open');
      target.classList.remove('index-accordion--focus');
      /* Force reflow so the animation restarts on re-select */
      void target.offsetWidth;
      target.classList.add('index-accordion--focus');

      /* Scroll header just below the sticky page header — but only if the
         header is currently off-screen. When it is already visible (typical
         on index.html where the accordion sits at the top), don't scroll
         at all so the user stays on the same view. */
      setTimeout(() => {
        const headerOffset = 80; /* clearance for site header */
        const rect = header.getBoundingClientRect();
        const viewportH = window.innerHeight || document.documentElement.clientHeight;
        const fullyVisible = rect.top >= headerOffset && rect.bottom <= viewportH;
        if (fullyVisible) return;
        const targetY = window.scrollY + rect.top - headerOffset;
        window.scrollTo({ top: targetY, behavior: 'smooth' });
      }, 250);

      /* Remove focus class after animation so it can re-trigger later */
      setTimeout(() => target.classList.remove('index-accordion--focus'), 1600);
    }

    async function wizardStepApplication() {
      wizard.step = 1;
      addStepLabel('Select application area');
      openAccordion('#acc-application');
      highlightField('#acc-application', 'By Application');
      if (isDocked) { syncGuidanceCards(); renderGuidanceActiveStep(); }
      const choice = await botChoices(
        'The <strong>By Application</strong> section is open. For which application area will the unit be used?',
        ['Data Centers', 'Food Processing', 'Industrial Refrigeration']
      );
      wizard.data.application = choice;
      if (!wizard.data.category) wizard.data.category = 'Evaporator';
      clearHighlights();
      saveWizard();
      saveChatOpen(true);
      await botReply('You selected <strong>' + choice + '</strong>. Next, the thermodynamics — I will ask the remaining questions there (capacity, refrigerant, temperature).', 600);
      setTimeout(() => { window.location.href = 'thermodynamics.html'; }, 700);
    }

    async function wizardStepBareCoil() {
      wizard.step = 1;
      wizard.data.bareCoil = true;
      addStepLabel('Select Bare Coil');
      openAccordion('#acc-coils');
      highlightField('#acc-coils', 'Bare Coils');
      if (isDocked) { syncGuidanceCards(); renderGuidanceActiveStep(); }
      const choice = await botChoices(
        'The <strong>Bare Coils</strong> section is open. Which bare coil do you need?',
        ['Evaporator DX', 'Evaporator Pump', 'Air cooler', 'Dry cooler', 'Condenser', 'Sub Cooler']
      );
      wizard.data.category = choice;
      clearHighlights();
      saveWizard();
      saveChatOpen(true);
      await botReply('Got it — <strong>' + choice + '</strong>. Next, the coil configuration — I will ask the remaining questions there (capacity, refrigerant, temperature).', 600);
      setTimeout(() => { window.location.href = 'coil-thermodynamics.html'; }, 700);
    }

    async function wizardStep1() {
      wizard.step = 1;
      addStepLabel('Step 1 of 6 — Product category');
      highlightField('.category-grid', 'Product category');
      if (isDocked) { syncGuidanceCards(); renderGuidanceActiveStep(); }
      const choice = await botChoices(
        'Which Güntner product would you like to configure?',
        ['Evaporator', 'Condenser', 'Dry Cooler', 'Air Cooler', 'Oil Cooler', 'Subcooler', 'Gas Cooler']
      );
      wizard.data.category = choice;
      clearHighlights();
      saveWizard();

      /* Mark the matching cat-card on the index page so the user can see the
         choice reflected in the layout before navigating away. */
      markCatCardActive(choice);

      /* Navigate to thermodynamics after product selection */
      saveChatOpen(true);
      await botReply('You selected <strong>' + choice + '</strong>. Continuing to thermodynamic configuration…', 500);
      setTimeout(() => {
        window.location.href = 'thermodynamics.html';
      }, 1200);
    }

    async function wizardStep2() {
      wizard.step = 2;
      addStepLabel('Step 2 of 6 — Application');
      if (isDocked) { syncGuidanceCards(); renderGuidanceActiveStep(); }
      const choice = await botChoices(
        'For which application will the unit be used?',
        ['Cold storage', 'Deep freeze', 'Industrial cooling']
      );
      wizard.data.application = choice;
      wizard.step = 3;
      saveWizard();
      if (isDocked) syncGuidanceCards();

      if (!isThermo) {
        await botReply('Great! Switching to the thermodynamic configuration now…', 500);
        setTimeout(() => {
          window.location.href = 'thermodynamics.html';
        }, 600);
      } else {
        setTimeout(() => wizardStep3(), 400);
      }
    }

    async function wizardStep3() {
      wizard.step = 3;
      addStepLabel('Step 3 of 6 — Cooling capacity');
      highlightField('#field-capacity-wrap', 'Cooling capacity (kW)');
      if (isDocked) { syncGuidanceCards(); renderGuidanceActiveStep(); }
      await botReply('What cooling capacity do you need in kW?');
      wizard.awaitingInput = 'capacity';
      saveWizard();
      const inp = getActiveInput();
      if (inp) { inp.placeholder = 'e.g. 60'; inp.focus(); }
    }

    async function wizardStep4() {
      wizard.step = 4;
      addStepLabel('Step 4 of 6 — Refrigerant');
      highlightField('#field-medium-wrap', 'Refrigerant');
      if (isDocked) { syncGuidanceCards(); renderGuidanceActiveStep(); }
      const choice = await botChoices(
        'Which refrigerant is used in your system?',
        ['R134a', 'R404A', 'R449A', 'CO2']
      );
      wizard.data.refrigerant = choice;
      fillField('#field-medium', choice);
      clearHighlights();
      saveWizard();
      if (isDocked) syncGuidanceCards();
      setTimeout(() => wizardStep5(), 400);
    }

    async function wizardStep5() {
      wizard.step = 5;
      addStepLabel('Step 5 of 6 — Ambient temperature');
      highlightField('#field-evap-wrap', 'Evaporating temperature (°C)');
      if (isDocked) { syncGuidanceCards(); renderGuidanceActiveStep(); }
      await botReply('What is the maximum ambient temperature at the installation site in °C?');
      wizard.awaitingInput = 'temperature';
      saveWizard();
      const inp = getActiveInput();
      if (inp) { inp.placeholder = 'e.g. 32'; inp.focus(); }
    }

    async function wizardStep6() {
      wizard.step = 6;
      clearHighlights();
      addStepLabel('Step 6 of 6 — Summary');

      const d = wizard.data;
      const rec = getRecommendation(d);

      if (isDocked) { syncGuidanceCards(); renderGuidanceActiveStep(); }

      const typing = showTyping();
      setTimeout(() => {
        typing.remove();
        const target = getActiveChatBody();
        const summary = document.createElement('div');
        summary.className = 'chatbot-summary';
        summary.innerHTML =
          '<strong>Your configuration:</strong><br>' +
          'Category: ' + (d.category || '—') + '<br>' +
          'Application: ' + (d.application || '—') + '<br>' +
          'Cooling capacity: ' + (d.capacity || '—') + ' kW<br>' +
          'Refrigerant: ' + (d.refrigerant || '—') + '<br>' +
          'Ambient temp.: ' + (d.temperature || '—') + ' °C' +
          '<div class="recommendation">' +
            'Recommendation: ' + rec.model + '<br>' +
            '<span class="recommendation-detail">Series: ' + rec.series + ' | Refrigerant: ' + rec.ref + '</span>' +
          '</div>';
        target.appendChild(summary);
        scrollActiveChat();

        setTimeout(() => {
          addBot('Would you like to continue with this configuration? You can still adjust the values on the page at any time.');
          addChoices(['Apply configuration', 'Start over'], (choice) => {
            if (choice === 'Start over') {
              wizard.step = 0;
              wizard.data = {};
              wizard.awaitingInput = null;
              clearWizardStorage();
              getActiveChatBody().innerHTML = '';
              if (isDocked) { syncGuidanceCards(); showGuidanceWelcome(); }
              showWelcome();
            } else {
              addBot('All values have been applied to the form fields. You can refine the details or click "Next" to continue.');
              wizard.awaitingInput = null;
              clearWizardStorage();
              const inp = getActiveInput();
              if (inp) inp.placeholder = 'Type a message…';
            }
          });
        }, 600);
      }, 1000);
    }

    /* --- Handle user text input --- */
    /* ============================================================
       Bella — RAG Chat via /api/chat (SSE Streaming)
       ============================================================
       Wird für freie Fragen verwendet. Der schrittgesteuerte Konfig-
       Wizard (capacity, temperature) bleibt unverändert. */
    function escapeHtml(s) {
      const d = document.createElement('div');
      d.textContent = s == null ? '' : String(s);
      return d.innerHTML;
    }

    /** Wandelt minimales Markdown + Citations in HTML um (kein externes Lib). */
    function lightMarkdown(text) {
      let html = escapeHtml(text);
      // **bold**
      html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      // *italic* (nur wenn nicht Teil von **)
      html = html.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>');
      // Aufzählungen (- xxx oder * xxx am Zeilenanfang)
      html = html.replace(/(^|\n)[-*] (.+)/g, '$1• $2');
      // Citations [1], [2], ...
      html = html.replace(/\[(\d+)\]/g,
        '<sup class="bella-cite" data-num="$1" style="color:#0078BE;cursor:help;font-weight:600;">[$1]</sup>');
      // Zeilenumbrüche
      html = html.replace(/\n/g, '<br>');
      return html;
    }

    /** Baut die Backend-Proxy-URL für ein DMS-Dokument (Browser-Vorschau). */
    function dmsContentUrl(dmsId) {
      return '/api/dms/content/' + encodeURIComponent(dmsId) + '?inline=1';
    }

    /** Rendert die Quellen-Liste unter der Bot-Antwort.
        Speichert auch das Source-Mapping auf der Bubble (bubble._bellaSources),
        damit Inline-Citations [N] in der Antwort darauf zugreifen können. */
    function renderSources(bubble, sources) {
      if (!sources || sources.length === 0) return;
      bubble._bellaSources = sources;

      const srcWrap = document.createElement('div');
      srcWrap.className = 'bella-sources';
      srcWrap.style.cssText =
        'margin-top:10px;padding-top:8px;border-top:1px dashed rgba(0,86,150,.25);' +
        'font-size:11.5px;line-height:1.55;color:#475569;';

      const lines = sources.map(function(s) {
        const docName = escapeHtml(s.documentName || ('Quelle ' + s.number));
        const dmsRef = s.dmsId
          ? ' <span style="color:#94a3b8;font-family:monospace;font-size:10.5px;">' +
            escapeHtml(s.dmsId) + (s.version ? ' v' + escapeHtml(s.version) : '') +
            '</span>'
          : '';
        const score = (typeof s.score === 'number')
          ? ' <span style="color:#94a3b8;">· score ' + s.score.toFixed(2) + '</span>'
          : '';
        const inner =
          '<sup style="color:#0078BE;font-weight:600;">[' + s.number + ']</sup> ' +
          docName + dmsRef + score;

        // Klickbar machen, wenn das Dokument im DMS liegt
        if (s.dmsId) {
          return '<div class="bella-source-row" data-dms-id="' + escapeHtml(s.dmsId) + '"' +
                 ' style="padding:3px 6px;border-radius:4px;cursor:pointer;transition:background .12s;"' +
                 ' onmouseover="this.style.background=\'rgba(0,120,190,.06)\'"' +
                 ' onmouseout="this.style.background=\'transparent\'"' +
                 ' title="Im DMS öffnen (' + escapeHtml(s.dmsId) + ')">' + inner + '</div>';
        }
        return '<div style="padding:3px 6px;">' + inner + '</div>';
      });
      srcWrap.innerHTML = '<strong style="color:#003865;">Quellen:</strong>' + lines.join('');
      bubble.appendChild(srcWrap);
    }

    /** Lazy-erzeugtes Source-Modal (Singleton). */
    function getOrCreateSourceModal() {
      let modal = document.getElementById('bella-source-modal');
      if (modal) return modal;
      modal = document.createElement('div');
      modal.id = 'bella-source-modal';
      modal.style.cssText =
        'position:fixed;inset:0;background:rgba(0,40,73,.55);z-index:99999;' +
        'display:none;align-items:center;justify-content:center;' +
        'opacity:0;transition:opacity .15s ease;';
      modal.innerHTML =
        '<div id="bella-source-modal-card" style="' +
          'background:#fff;width:min(720px,92vw);max-height:80vh;border-radius:12px;' +
          'box-shadow:0 12px 40px rgba(0,40,73,.25);display:flex;flex-direction:column;' +
          'transform:scale(.96);transition:transform .15s ease;">' +
          '<div style="padding:18px 22px 14px;border-bottom:1px solid rgba(0,86,150,.12);">' +
            '<div style="display:flex;align-items:flex-start;gap:12px;">' +
              '<div style="flex-shrink:0;width:34px;height:34px;border-radius:7px;' +
                  'background:linear-gradient(135deg,#0078BE 0%,#003865 100%);color:#fff;' +
                  'display:flex;align-items:center;justify-content:center;">' +
                '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                  '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>' +
                  '<polyline points="14 2 14 8 20 8"/></svg>' +
              '</div>' +
              '<div style="flex:1;min-width:0;">' +
                '<div id="bsm-cite-num" style="font-size:11px;font-weight:600;letter-spacing:.6px;' +
                    'color:#0078BE;text-transform:uppercase;margin-bottom:2px;">Quelle</div>' +
                '<div id="bsm-title" style="font-size:15px;font-weight:600;color:#003865;line-height:1.35;' +
                    'word-break:break-word;"></div>' +
                '<div id="bsm-meta" style="font-size:11.5px;color:#64748b;font-family:DM Mono,monospace;margin-top:4px;"></div>' +
              '</div>' +
              '<button id="bsm-close" type="button" style="background:transparent;border:0;' +
                  'font-size:20px;cursor:pointer;color:#94a3b8;padding:4px 8px;line-height:1;' +
                  'border-radius:4px;" title="Schließen (ESC)">&times;</button>' +
            '</div>' +
          '</div>' +
          '<div style="padding:16px 22px;flex:1;overflow:auto;">' +
            '<div id="bsm-snippet-label" style="font-size:11px;font-weight:600;letter-spacing:.5px;' +
                'color:#94a3b8;text-transform:uppercase;margin-bottom:8px;">Zitierter Ausschnitt</div>' +
            '<div id="bsm-snippet" style="font-size:13.5px;line-height:1.65;color:#334155;' +
                'white-space:pre-wrap;background:#f8fafc;padding:14px 16px;border-radius:8px;' +
                'border-left:3px solid #0078BE;font-family:Georgia,serif;"></div>' +
            '<div id="bsm-snippet-trunc" style="font-size:11px;color:#94a3b8;margin-top:6px;font-style:italic;display:none;">' +
              '(Auszug, im vollständigen Dokument fortgesetzt)</div>' +
          '</div>' +
          '<div style="padding:14px 22px;border-top:1px solid rgba(0,86,150,.12);' +
              'display:flex;gap:10px;justify-content:flex-end;background:#f8fafc;border-radius:0 0 12px 12px;">' +
            '<button id="bsm-cancel" type="button" style="background:transparent;border:1px solid rgba(0,40,73,.18);' +
                'color:#475569;padding:8px 16px;border-radius:7px;cursor:pointer;font-size:13px;font-weight:500;">' +
              'Schließen</button>' +
            '<a id="bsm-open" href="#" target="_blank" rel="noopener" style="background:#0078BE;color:#fff;' +
                'padding:8px 16px;border-radius:7px;cursor:pointer;font-size:13px;font-weight:500;' +
                'text-decoration:none;display:inline-flex;align-items:center;gap:6px;">' +
              '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">' +
                '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>' +
                '<polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>' +
              'Im DMS öffnen</a>' +
          '</div>' +
        '</div>';
      document.body.appendChild(modal);

      function close() {
        modal.style.opacity = '0';
        document.getElementById('bella-source-modal-card').style.transform = 'scale(.96)';
        setTimeout(function() { modal.style.display = 'none'; }, 150);
      }
      modal.querySelector('#bsm-close').addEventListener('click', close);
      modal.querySelector('#bsm-cancel').addEventListener('click', close);
      modal.addEventListener('click', function(e) { if (e.target === modal) close(); });
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal.style.display === 'flex') close();
      });
      return modal;
    }

    /** Öffnet das Modal mit den Daten einer Source. */
    function openSourceModal(source) {
      if (!source) return;
      const modal = getOrCreateSourceModal();
      modal.querySelector('#bsm-cite-num').textContent = '[' + source.number + '] · Quelle';
      modal.querySelector('#bsm-title').textContent = source.documentName || ('Quelle ' + source.number);

      const metaParts = [];
      if (source.dmsId)      metaParts.push('dmsId ' + source.dmsId);
      if (source.version)    metaParts.push('v' + source.version);
      if (typeof source.score === 'number') metaParts.push('Score ' + source.score.toFixed(3));
      if (source.chunkIndex != null)        metaParts.push('Chunk #' + source.chunkIndex);
      modal.querySelector('#bsm-meta').textContent = metaParts.join(' · ') || '—';

      const snippet = source.snippet || '(Kein Vorschau-Text verfügbar)';
      modal.querySelector('#bsm-snippet').textContent = snippet;
      modal.querySelector('#bsm-snippet-trunc').style.display = source.snippetTruncated ? 'block' : 'none';

      const openBtn = modal.querySelector('#bsm-open');
      if (source.dmsId) {
        openBtn.href = dmsContentUrl(source.dmsId);
        openBtn.style.display = 'inline-flex';
      } else {
        openBtn.style.display = 'none';
      }

      modal.style.display = 'flex';
      // Animation in zwei Frames triggern, damit transition greift
      requestAnimationFrame(function() {
        modal.style.opacity = '1';
        document.getElementById('bella-source-modal-card').style.transform = 'scale(1)';
      });
    }

    /** Globale Event-Delegation für Source-Clicks und Citation-Clicks.
        Einmalig auf document-Level installiert — funktioniert auch für
        nachträglich gerenderte Bubbles. Klick öffnet zunächst das Modal
        mit Snippet-Vorschau, von dort führt ein zweiter Klick ins DMS. */
    if (!window._bellaClickHandlerInstalled) {
      window._bellaClickHandlerInstalled = true;
      document.addEventListener('click', function(e) {
        // (1) Quellen-Zeile geklickt?
        const sourceRow = e.target.closest && e.target.closest('.bella-source-row');
        if (sourceRow) {
          const bubble = sourceRow.closest('.chatbot-msg');
          if (bubble && bubble._bellaSources) {
            const dmsId = sourceRow.dataset.dmsId;
            const src = bubble._bellaSources.find(function(s) { return s.dmsId === dmsId; });
            if (src) openSourceModal(src);
          }
          return;
        }
        // (2) Inline-Citation [N] geklickt?
        const cite = e.target.closest && e.target.closest('.bella-cite');
        if (cite) {
          const bubble = cite.closest('.chatbot-msg');
          const num = parseInt(cite.dataset.num, 10);
          if (bubble && bubble._bellaSources && num) {
            const src = bubble._bellaSources.find(function(s) { return s.number === num; });
            if (src) openSourceModal(src);
          }
        }
      });
      // Hover-Effekt für Citations: Tooltip mit Doc-Name
      document.addEventListener('mouseover', function(e) {
        const cite = e.target.closest && e.target.closest('.bella-cite');
        if (!cite || cite.title) return;
        const bubble = cite.closest('.chatbot-msg');
        const num = parseInt(cite.dataset.num, 10);
        if (bubble && bubble._bellaSources && num) {
          const src = bubble._bellaSources.find(function(s) { return s.number === num; });
          if (src) {
            cite.title = (src.documentName || 'Quelle ' + num) + '\n(Klick: Vorschau öffnen)';
            cite.style.textDecoration = 'underline';
            cite.style.textDecorationStyle = 'dotted';
          }
        }
      });
    }

    /** Multi-Turn-Chat-History.
        Jeder erfolgreiche Bella-Turn (frei-form, kein Wizard-Schritt) wird hier
        akkumuliert. Beim nächsten Aufruf wird die History (max. 6 Turns =
        12 Messages) als Kontext mitgeschickt, damit Bella Folgefragen versteht.
        Lebt nur in dieser Session — kein localStorage, da privacy-relevant. */
    let bellaHistory = [];
    const MAX_HISTORY_TURNS = 6;

    /**
     * Streamt eine Frage an /api/chat und rendert die Antwort live.
     * Nutzt fetch + ReadableStream + manuellen SSE-Parser
     * (EventSource kann kein POST → fetch-Variante).
     */
    async function streamBella(query) {
      const bubble = addBot('<span class="bella-typing" style="color:#94a3b8;font-style:italic;">Bella überlegt …</span>');
      let fullText = '';
      let sources = [];
      let receivedAnyToken = false;

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: query,
            topK: 5,
            minScore: 0.05,
            language: 'de',
            effort: 'medium',
            history: bellaHistory  // Kontext aus früheren Turns dieser Session
          })
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);

        const reader = res.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // SSE: events sind durch leere Zeile (\n\n) getrennt
          let idx;
          while ((idx = buffer.indexOf('\n\n')) >= 0) {
            const block = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 2);
            const evMatch = block.match(/^event:\s*(.+)$/m);
            const dataMatch = block.match(/^data:\s*(.+)$/m);
            if (!evMatch || !dataMatch) continue;
            let payload;
            try { payload = JSON.parse(dataMatch[1]); } catch (e) { continue; }
            const evName = evMatch[1].trim();

            if (evName === 'sources') {
              sources = payload.sources || [];
            } else if (evName === 'text') {
              if (!receivedAnyToken) {
                bubble.innerHTML = '';
                receivedAnyToken = true;
              }
              fullText += payload.text;
              bubble.innerHTML = lightMarkdown(fullText);
              scrollActiveChat();
            } else if (evName === 'thinking') {
              // Adaptive Thinking ist standardmäßig off — einfach ignorieren
            } else if (evName === 'done') {
              if (!receivedAnyToken) {
                bubble.innerHTML = '<em style="color:#94a3b8;">Bella hat keine Antwort generiert (' +
                  escapeHtml(payload.stopReason || 'unbekannt') + ').</em>';
              } else {
                // Erfolgreichen Turn in History aufnehmen (User + Assistant)
                // Wir nutzen den vollen Antworttext (ohne Citations-Sup-Tags),
                // damit Bella im nächsten Turn zitierbare Aussagen referenzieren kann.
                bellaHistory.push({ role: 'user', content: query });
                bellaHistory.push({ role: 'assistant', content: payload.fullText || fullText });
                // Auf max. 2 × MAX_HISTORY_TURNS Messages trimmen (User+Assistant pro Turn)
                if (bellaHistory.length > MAX_HISTORY_TURNS * 2) {
                  bellaHistory = bellaHistory.slice(-MAX_HISTORY_TURNS * 2);
                }
              }
              renderSources(bubble, sources);
              scrollActiveChat();
            } else if (evName === 'error') {
              bubble.innerHTML = '<em style="color:#dc2626;">⚠ ' + escapeHtml(payload.error) + '</em>';
              scrollActiveChat();
            }
          }
        }
      } catch (err) {
        bubble.innerHTML = '<em style="color:#dc2626;">Verbindung zur Bella-API fehlgeschlagen: ' +
          escapeHtml(err.message) + '</em>';
      }
    }

    function handleSend(inputEl) {
      if (!inputEl) return;
      const text = inputEl.value.trim();
      if (!text) return;
      addUser(text);
      inputEl.value = '';

      if (wizard.awaitingInput === 'capacity') {
        const kw = parseFloat(text);
        if (isNaN(kw) || kw <= 0) {
          botReply('Please enter a valid value in kW (e.g. 60).', 400);
          return;
        }
        wizard.data.capacity = text;
        wizard.awaitingInput = null;
        fillField('#field-capacity', text);
        clearHighlights();
        saveWizard();
        if (isDocked) syncGuidanceCards();
        const inp = getActiveInput();
        if (inp) inp.placeholder = 'Type a message…';
        setTimeout(() => wizardStep4(), 400);

      } else if (wizard.awaitingInput === 'temperature') {
        const temp = parseFloat(text);
        if (isNaN(temp)) {
          botReply('Please enter a valid temperature in °C (e.g. 32).', 400);
          return;
        }
        wizard.data.temperature = text;
        wizard.awaitingInput = null;
        fillField('#field-evap-temp', text);
        clearHighlights();
        saveWizard();
        if (isDocked) syncGuidanceCards();
        const inp = getActiveInput();
        if (inp) inp.placeholder = 'Type a message…';
        setTimeout(() => wizardStep6(), 400);

      } else {
        // Freie Frage → an Bella (RAG-gestützt) weiterleiten.
        // Der schrittgesteuerte Wizard läuft separat; freie Fragen können
        // jederzeit gestellt werden, ohne den Wizard zu stören.
        streamBella(text);
      }
    }

    /* Floating chat input */
    if (chatSend) chatSend.addEventListener('click', () => handleSend(chatInput));
    if (chatInput) chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleSend(chatInput);
    });

    /* Docked chat input */
    if (dockedSend) dockedSend.addEventListener('click', () => handleSend(dockedInput));
    if (dockedInput) dockedInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleSend(dockedInput);
    });

    /* --- Persist chat open state across pages --- */
    function saveChatOpen(isOpen) {
      localStorage.setItem('gpc_chat_open', isOpen ? '1' : '0');
    }

    /* Track open/close state */
    const origToggle = toggleChat;
    toggleChat = function() {
      origToggle();
      saveChatOpen(chatDialog.classList.contains('open'));
    };

    const origClose = closeChat;
    closeChat = function() {
      origClose();
      saveChatOpen(false);
    };

    /* Override to track state */
    chatTrigger.removeEventListener('click', origToggle);
    chatTrigger.addEventListener('click', toggleChat);
    if (chatClose) {
      chatClose.removeEventListener('click', origClose);
      chatClose.addEventListener('click', closeChat);
    }

    /* --- Inject current-page indicator into chat header --- */
    (function injectPageBadge() {
      const header = chatDialog.querySelector('.chatbot-dialog-header');
      if (!header || header.querySelector('.chatbot-page-badge')) return;
      const labels = {
        'category':       'Category',
        'thermodynamics': 'Thermodynamics',
        'unit-selection': 'Unit Selection',
        'results':        'Results',
        'datasheet':      'Datasheet'
      };
      const badge = document.createElement('div');
      badge.className = 'chatbot-page-badge';
      badge.style.cssText =
        'display:inline-flex;align-items:center;gap:5px;margin-bottom:8px;' +
        'padding:3px 9px;border-radius:11px;background:rgba(255,255,255,.18);' +
        'color:#fff;font-size:10.5px;font-weight:500;letter-spacing:.6px;' +
        'text-transform:uppercase;line-height:1.4;width:fit-content;';
      badge.innerHTML =
        '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="flex-shrink:0"><path d="M9 22V12h6v10"/><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>' +
        '<span>' + (labels[pageName] || pageName) + '</span>';
      header.insertBefore(badge, header.firstChild);
    })();

    /* Resume chat if it was open on previous page (only if chatbot feature is enabled) */
    const wasChatOpen = localStorage.getItem('gpc_chat_open') === '1';
    const wasChatDocked = localStorage.getItem('gpc_chat_docked') === '1';
    if (GPC_FEATURES.chatbot && (wasChatOpen || (saved && saved.step > 0))) {
      chatTrigger.classList.add('open');
      chatDialog.classList.add('open');
      if (saved && saved.step > 0) {
        replayHistory();
        /* Continue wizard on thermodynamics page */
        if (isThermo && saved.step >= 1 && saved.data.category) {
          setTimeout(() => {
            addBot('You selected <strong>' + saved.data.category + '</strong>. Let us start with the thermodynamic configuration.');
            setTimeout(() => wizardStep3(), 600);
          }, 400);
        }
      } else {
        showWelcome();
      }
      /* Restore docked (expanded sidebar) state from previous page */
      if (wasChatDocked) {
        setTimeout(dock, 0);
      }
    }
  }

});
