// Basic web Noita save editor focusing on wands + spells.
// Runs entirely in the browser: load player.xml, edit, download.

let spellLibrary = [];
let spellLibraryById = {};
let saveGame = null;
let xmlDoc = null;

class Card {
  constructor(element) {
    this.el = element;
    this.item = this.el.querySelector('ItemComponent');
  }

  get actionId() {
    const comp = this.el.querySelector('ItemActionComponent');
    return comp ? comp.getAttribute('action_id') : '';
  }

  set actionId(id) {
    const comp = this.el.querySelector('ItemActionComponent');
    if (comp) comp.setAttribute('action_id', id);
  }

  get slotX() {
    if (!this.item) return 0;
    const v = parseFloat(this.item.getAttribute('inventory_slot.x'));
    return isNaN(v) ? 0 : v;
  }

  set slotX(v) {
    if (!this.item) return;
    const clamped = Math.max(0, Math.floor(v));
    this.item.setAttribute('inventory_slot.x', String(clamped));
  }
}

class Wand {
  constructor(entityElement) {
    this.el = entityElement;
    this.abilities = this.el.querySelector('AbilityComponent');
    this.item = this.el.querySelector('ItemComponent');
    this.cards = [];
    const cardEntities = Array.from(this.el.querySelectorAll('Entity[tags="card_action"]'));
    this.cards = cardEntities.map(e => new Card(e));
    this._reindexCards();
  }

  get name() {
    return this.abilities ? this.abilities.getAttribute('ui_name') || 'Wand' : 'Wand';
  }

  get mana() {
    return this._getNumberAttr(this.abilities, 'mana', 0);
  }
  set mana(v) { this._setNumberAttr(this.abilities, 'mana', v); }

  get manaMax() {
    return this._getNumberAttr(this.abilities, 'mana_max', 0);
  }
  set manaMax(v) { this._setNumberAttr(this.abilities, 'mana_max', v); }

  get manaRecharge() {
    return this._getNumberAttr(this.abilities, 'mana_charge_speed', 0);
  }
  set manaRecharge(v) { this._setNumberAttr(this.abilities, 'mana_charge_speed', v); }

  get capacity() {
    const cfg = this._gunConfig();
    return this._getNumberAttr(cfg, 'deck_capacity', 1);
  }
  set capacity(v) {
    const cfg = this._gunConfig();
    if (cfg) cfg.setAttribute('deck_capacity', String(v));
  }

  get spellsCast() {
    const cfg = this._gunConfig();
    return this._getNumberAttr(cfg, 'actions_per_round', 1);
  }
  set spellsCast(v) {
    const cfg = this._gunConfig();
    if (cfg) cfg.setAttribute('actions_per_round', String(v));
  }

  get reloadTime() {
    const cfg = this._gunConfig();
    return this._getNumberAttr(cfg, 'reload_time', 0);
  }
  set reloadTime(v) {
    const cfg = this._gunConfig();
    if (cfg) cfg.setAttribute('reload_time', String(v));
  }

  get castDelay() {
    const acfg = this._gunActionConfig();
    return this._getNumberAttr(acfg, 'fire_rate_wait', 0);
  }
  set castDelay(v) {
    const acfg = this._gunActionConfig();
    if (acfg) acfg.setAttribute('fire_rate_wait', String(v));
  }

  get shuffles() {
    const cfg = this._gunConfig();
    if (!cfg) return false;
    return cfg.getAttribute('shuffle_deck_when_empty') === '1';
  }
  set shuffles(flag) {
    const cfg = this._gunConfig();
    if (cfg) cfg.setAttribute('shuffle_deck_when_empty', flag ? '1' : '0');
  }

  get spread() {
    const acfg = this._gunActionConfig();
    return this._getNumberAttr(acfg, 'spread_degrees', 0);
  }
  set spread(v) {
    const acfg = this._gunActionConfig();
    if (acfg) acfg.setAttribute('spread_degrees', String(v));
  }

  get slotX() {
    return this._getNumberAttr(this.item, 'inventory_slot.x', 0);
  }
  set slotX(v) {
    const clamped = Math.max(0, Math.floor(v));
    this._setNumberAttr(this.item, 'inventory_slot.x', clamped);
  }

  get slotY() {
    return this._getNumberAttr(this.item, 'inventory_slot.y', 0);
  }
  set slotY(v) {
    const clamped = Math.max(0, Math.floor(v));
    this._setNumberAttr(this.item, 'inventory_slot.y', clamped);
  }

  addCardFromTemplate(actionId, templateCardEl, slotIndex) {
    if (!templateCardEl) return;
    const clone = templateCardEl.cloneNode(true);
    const card = new Card(clone);
    card.actionId = actionId;
    if (typeof slotIndex === 'number') {
      card.slotX = Math.max(0, Math.floor(slotIndex));
    } else {
      card.slotX = this.cards.length;
    }
    this.el.appendChild(clone);
    this.cards.push(card);
    this._reindexCards();
    return card;
  }

  removeCardAtSlot(slotIndex) {
    const card = this.cardAtSlot(Math.max(0, Math.floor(slotIndex)));
    if (!card) return false;
    this.cards = this.cards.filter(c => c !== card);
    if (card.el.parentNode === this.el) {
      this.el.removeChild(card.el);
    }
    this._reindexCards();
    this._syncCardDomOrder();
    return true;
  }

  moveCard(fromIndex, toIndex) {
    const fromSlot = Math.max(0, Math.floor(fromIndex));
    const toSlot = Math.max(0, Math.floor(toIndex));
    if (fromSlot === toSlot) return;
    const card = this.cardAtSlot(fromSlot);
    if (!card) return;

    const occupying = this.cardAtSlot(toSlot);
    card.slotX = toSlot;
    if (occupying && occupying !== card) {
      occupying.slotX = fromSlot;
    }

    this._reindexCards();
    this._syncCardDomOrder();
  }

  _gunConfig() {
    return this.abilities ? this.abilities.querySelector('gun_config') : null;
  }

  _gunActionConfig() {
    return this.abilities ? this.abilities.querySelector('gunaction_config') : null;
  }

  _getNumberAttr(el, name, defVal) {
    if (!el) return defVal;
    const v = parseFloat(el.getAttribute(name));
    return isNaN(v) ? defVal : v;
  }

  _setNumberAttr(el, name, v) {
    if (!el) return;
    el.setAttribute(name, String(v));
  }

  _syncCardDomOrder() {
    const existing = Array.from(this.el.querySelectorAll('Entity[tags="card_action"]'));
    for (const e of existing) {
      this.el.removeChild(e);
    }
    for (const card of this.cards) {
      this.el.appendChild(card.el);
    }
  }

  _reindexCards() {
    this.cards.sort((a, b) => a.slotX - b.slotX);
    this.cardSlots = new Map();
    this.maxCardSlot = 0;
    for (const card of this.cards) {
      this.cardSlots.set(card.slotX, card);
      if (card.slotX > this.maxCardSlot) this.maxCardSlot = card.slotX;
    }
  }

  cardAtSlot(slotIndex) {
    if (!this.cardSlots) this._reindexCards();
    return this.cardSlots.get(slotIndex) || null;
  }
}

class SaveGame {
  constructor(doc) {
    this.doc = doc;
    this.root = doc.documentElement;
    this.quickInventory = this.root.querySelector('Entity[name="inventory_quick"]');
    this.fullInventory = this.root.querySelector('Entity[name="inventory_full"]');
    this.wands = this._loadWands();
    this.sortWandsBySlot();
  }

  _loadWands() {
    if (!this.quickInventory) return [];
    const entities = Array.from(this.quickInventory.getElementsByTagName('Entity'));
    const wands = [];
    for (const e of entities) {
      const tags = (e.getAttribute('tags') || '').split(',');
      if (tags.includes('wand')) {
        wands.push(new Wand(e));
      }
    }
    return wands;
  }

  sortWandsBySlot() {
    this.wands.sort((a, b) => a.slotX - b.slotX);
  }

  firstCardTemplate() {
    // Search full inventory first, then wands
    if (this.fullInventory) {
      const card = this.fullInventory.querySelector('Entity[tags="card_action"]');
      if (card) return card;
    }
    for (const w of this.wands) {
      if (w.cards.length > 0) return w.cards[0].el;
    }
    return null;
  }
}

function init() {
  const fileInput = document.getElementById('file-input');
  const downloadBtn = document.getElementById('download-btn');
  const tabs = Array.from(document.querySelectorAll('.wand-tab'));

  fileInput.addEventListener('change', handleFileSelect);
  downloadBtn.addEventListener('click', handleDownload);

  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = btn.getAttribute('data-wand-index');
      setActiveWandTab(parseInt(idx, 10));
    });
  });

  document.getElementById('spell-type-filter').addEventListener('change', renderSpellLibrary);
  document.getElementById('spell-search').addEventListener('input', renderSpellLibrary);

  loadSpellLibrary();
}

async function loadSpellLibrary() {
  try {
    const res = await fetch('spells.json');
    if (!res.ok) throw new Error('Failed to fetch spells.json');
    const data = await res.json();
    spellLibrary = data;
    spellLibraryById = {};
    const typeSet = new Set();
    for (const s of data) {
      spellLibraryById[s.id] = s;
      if (s.type) typeSet.add(s.type);
    }
    const typeSelect = document.getElementById('spell-type-filter');
    for (const t of Array.from(typeSet).sort()) {
      const opt = document.createElement('option');
      opt.value = t;
      opt.textContent = t;
      typeSelect.appendChild(opt);
    }
    renderSpellLibrary();
  } catch (e) {
    console.error('Error loading spells.json', e);
  }
}

function renderSpellLibrary() {
  const grid = document.getElementById('spell-library-grid');
  grid.innerHTML = '';
  if (!spellLibrary.length) return;

  const typeFilter = document.getElementById('spell-type-filter').value;
  const search = document.getElementById('spell-search').value.trim().toLowerCase();

  for (const s of spellLibrary) {
    if (typeFilter !== 'all' && s.type !== typeFilter) continue;
    const name = s.name || s.id;
    if (search && !name.toLowerCase().includes(search) && !s.id.toLowerCase().includes(search)) continue;

    const tile = document.createElement('div');
    tile.className = 'spell-tile';
    tile.draggable = true;
    tile.dataset.spellId = s.id;
    const typeClass = getSpellTypeClass(s.type);
    if (typeClass) tile.classList.add(typeClass);

    const img = document.createElement('img');
    img.className = 'spell-icon';
    img.alt = s.id;
    img.src = `icons/${s.id}.png`;
    img.draggable = false;
    tile.appendChild(img);

    tile.addEventListener('dragstart', ev => {
      ev.dataTransfer.setData('text/spell-id', s.id);
      ev.dataTransfer.setData('text/plain', s.id);
    });

    grid.appendChild(tile);
  }
}

function handleFileSelect(ev) {
  const file = ev.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    parseXml(reader.result);
  };
  reader.readAsText(file);
}

function parseXml(xmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'application/xml');
  const parserError = doc.querySelector('parsererror');
  if (parserError) {
    console.error('XML parse error', parserError.textContent);
    alert('Failed to parse XML file.');
    return;
  }
  xmlDoc = doc;
  saveGame = new SaveGame(doc);
  renderWandPanels();
  document.getElementById('download-btn').disabled = false;
}

function renderWandPanels() {
  const container = document.getElementById('wand-panels');
  container.innerHTML = '';

  if (saveGame) {
    saveGame.sortWandsBySlot();
  }

  for (let i = 0; i < 4; i++) {
    const wand = saveGame ? saveGame.wands[i] : null;
    const panel = document.createElement('div');
    panel.className = 'wand-panel' + (i === 0 ? ' active' : '');
    panel.dataset.wandIndex = String(i);

    const stats = document.createElement('div');
    stats.className = 'wand-stats';
    const title = document.createElement('h3');
    title.textContent = wand ? wand.name : 'Empty Slot';
    stats.appendChild(title);

    if (wand) {
      // Order roughly matches in-game UI (ignoring Speed)
      stats.appendChild(makeStatRow('Spells/Cast', wand.spellsCast, val => wand.spellsCast = val));
      stats.appendChild(makeStatRow('Cast delay (frames)', wand.castDelay, val => wand.castDelay = val));
      stats.appendChild(makeStatRow('Recharge time (frames)', wand.reloadTime, val => wand.reloadTime = val));
      stats.appendChild(makeStatRow('Mana max', wand.manaMax, val => wand.manaMax = val));
      stats.appendChild(makeStatRow('Mana recharge', wand.manaRecharge, val => wand.manaRecharge = val));
      stats.appendChild(makeStatRow('Mana', wand.mana, val => wand.mana = val));
      stats.appendChild(makeStatRow('Capacity', wand.capacity, val => {
        const intVal = Math.max(1, Math.floor(val));
        wand.capacity = intVal;
        renderWandPanels();
      }));

      stats.appendChild(makeStatRow('Spread', wand.spread, val => wand.spread = val));

      const shuffleRow = document.createElement('div');
      shuffleRow.className = 'stat-row';
      const label = document.createElement('label');
      label.textContent = 'Shuffle';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = wand.shuffles;
      cb.addEventListener('change', () => {
        wand.shuffles = cb.checked;
      });
      shuffleRow.appendChild(label);
      shuffleRow.appendChild(cb);
      stats.appendChild(shuffleRow);
    }

    const slotsWrap = document.createElement('div');
    slotsWrap.className = 'wand-slots';
    const slotsTitle = document.createElement('h4');
    slotsTitle.textContent = 'Slots';
    slotsWrap.appendChild(slotsTitle);

    const slotGrid = document.createElement('div');
    slotGrid.className = 'slot-grid';
    slotGrid.dataset.wandIndex = String(i);

    const baseSlots = 26; // visual default like in-game UI
    const highestCardSlot = wand ? (wand.maxCardSlot || 0) + 1 : 0;
    const numSlots = wand ? Math.max(baseSlots, wand.capacity, highestCardSlot) : 0;
    for (let s = 0; s < numSlots; s++) {
      const slot = document.createElement('div');
      slot.className = 'slot';
      slot.dataset.slotIndex = String(s);
      const card = wand ? wand.cardAtSlot(s) : null;
      if (card) {
        slot.classList.add('filled');
        const spellId = card.actionId;
        const typeClass = getSpellTypeClassById(spellId);
        if (typeClass) slot.classList.add(typeClass);
        const img = document.createElement('img');
        img.className = 'spell-icon';
        img.alt = spellId;
        img.src = `../icons/${spellId}.png`;
        img.draggable = false;
        slot.appendChild(img);

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'slot-remove-btn';
        removeBtn.textContent = '×';
        removeBtn.title = 'Remove spell';
        removeBtn.addEventListener('click', ev => {
          ev.stopPropagation();
          ev.preventDefault();
          handleRemoveSpell(i, s);
        });
        slot.appendChild(removeBtn);

        slot.draggable = true;
        slot.addEventListener('dragstart', ev => {
          ev.dataTransfer.setData('text/wand-card', JSON.stringify({ wandIndex: i, slotIndex: s }));
        });
      }

      slot.addEventListener('dragover', ev => {
        ev.preventDefault();
      });
      slot.addEventListener('drop', ev => {
        ev.preventDefault();
        handleDropOnWandSlot(i, s, ev);
      });
      slotGrid.appendChild(slot);
    }

    slotsWrap.appendChild(slotGrid);
    panel.appendChild(stats);
    panel.appendChild(slotsWrap);
    container.appendChild(panel);
  }
}

function makeStatRow(labelText, value, onChange) {
  const row = document.createElement('div');
  row.className = 'stat-row';
  const label = document.createElement('label');
  label.textContent = labelText;
  const input = document.createElement('input');
  input.type = 'number';
  input.value = String(value);
  input.addEventListener('change', () => {
    const v = parseFloat(input.value);
    if (!isNaN(v)) onChange(v);
  });
  row.appendChild(label);
  row.appendChild(input);
  return row;
}

function handleDropSpellOnWand(wandIndex, slotIndex, spellId) {
  if (!saveGame) return;
  const wand = saveGame.wands[wandIndex];
  if (!wand) return;
  const template = saveGame.firstCardTemplate();
  if (!template) {
    alert('Cannot add spells: no card template found in this save.');
    return;
  }

  const requestedIndex = Math.max(0, Math.floor(slotIndex));
  const existing = wand.cardAtSlot(requestedIndex);

  if (existing) {
    const card = existing;
    card.actionId = spellId;
  } else {
    wand.addCardFromTemplate(spellId, template, requestedIndex);
    wand._syncCardDomOrder();
  }

  if (requestedIndex >= wand.capacity) {
    wand.capacity = requestedIndex + 1;
  }

  renderWandPanels();
}

function handleDropOnWandSlot(wandIndex, slotIndex, ev) {
  if (!saveGame) return;

  const moveData = ev.dataTransfer.getData('text/wand-card');
  if (moveData) {
    try {
      const info = JSON.parse(moveData);
      const sourceWand = saveGame.wands[info.wandIndex];
      if (!sourceWand) return;
      if (info.wandIndex === wandIndex) {
        sourceWand.moveCard(info.slotIndex, slotIndex);
        if (slotIndex >= sourceWand.capacity) {
          sourceWand.capacity = slotIndex + 1;
        }
        renderWandPanels();
      }
    } catch (e) {
      console.error('Invalid wand-card drag data', e);
    }
    return;
  }

  const spellId = ev.dataTransfer.getData('text/spell-id') || ev.dataTransfer.getData('text/plain');
  if (spellId) {
    handleDropSpellOnWand(wandIndex, slotIndex, spellId);
  }
}

function handleRemoveSpell(wandIndex, slotIndex) {
  if (!saveGame) return;
  const wand = saveGame.wands[wandIndex];
  if (!wand) return;
  if (wand.removeCardAtSlot(slotIndex)) {
    renderWandPanels();
  }
}

function getSpellTypeClass(type) {
  if (!type) return '';
  const key = String(type).trim().toLowerCase();
  const normalized = key.replace(/\s+/g, '_');
  if (normalized === 'projectile' || normalized === 'static_projectile') return 'spell-type-projectile';
  if (normalized === 'modifier' || normalized === 'projectile_modifier') return 'spell-type-projectile-mod';
  if (normalized === 'utility') return 'spell-type-utility';
  if (normalized === 'material' || normalized === 'material_spells') return 'spell-type-material';
  if (normalized === 'other') return 'spell-type-other';
  if (normalized === 'multicast') return 'spell-type-multicast';
  return '';
}

function getSpellTypeClassById(spellId) {
  if (!spellId) return '';
  const spell = spellLibraryById[spellId];
  return spell ? getSpellTypeClass(spell.type) : '';
}

function setActiveWandTab(index) {
  const tabs = Array.from(document.querySelectorAll('.wand-tab'));
  tabs.forEach(btn => {
    const idx = parseInt(btn.getAttribute('data-wand-index'), 10);
    btn.classList.toggle('active', idx === index);
  });
  const panels = Array.from(document.querySelectorAll('.wand-panel'));
  panels.forEach(panel => {
    const idx = parseInt(panel.dataset.wandIndex, 10);
    panel.classList.toggle('active', idx === index);
  });
}

function handleDownload() {
  if (!xmlDoc) return;
  const serializer = new XMLSerializer();
  const xmlStr = serializer.serializeToString(xmlDoc);
  const blob = new Blob([xmlStr], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'player_edited.xml';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

window.addEventListener('DOMContentLoaded', init);
