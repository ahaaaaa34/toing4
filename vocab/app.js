import { initTts, speak } from './tts.js';
import { WORDS } from './data.js?v=7';

const state = {
  queue: [],
  idx: 0,
  mode: 'en-jp',
  shown: false,
  correct: 0,
  wrong: 0,
  wrongIds: [],
};

function $(id) { return document.getElementById(id); }

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $(id).classList.add('active');
}

const LEVEL_LABELS  = { '3': '3級', 'pre2': '準2級', '2': '2級', 'pre1': '準1級' };
const LEVEL_CLASSES = { '3': 'lv-3', 'pre2': 'lv-pre2', '2': 'lv-2', 'pre1': 'lv-pre1' };

function startSession(wordList) {
  state.queue   = shuffle(wordList);
  state.idx     = 0;
  state.correct = 0;
  state.wrong   = 0;
  state.wrongIds = [];
  state.shown   = false;
  showScreen('screen-fc');
  renderCard();
}

function highlightWord(sentence, word) {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return sentence.replace(new RegExp(`(${escaped})`, 'gi'), '<span class="hl">$1</span>');
}

function renderCard() {
  const word  = state.queue[state.idx];
  const total = state.queue.length;

  $('fc-progress').textContent = `${state.idx + 1} / ${total}`;
  $('fc-bar').style.width = `${state.idx / total * 100}%`;

  const lvEl = $('fc-level');
  lvEl.textContent = LEVEL_LABELS[word.level] ?? word.level;
  lvEl.className   = 'level-badge ' + (LEVEL_CLASSES[word.level] ?? 'lv-3');
  $('fc-important').style.display = word.important ? '' : 'none';

  if (state.mode === 'en-jp') {
    $('fc-front-word').textContent  = word.en;
    $('fc-back-answer').textContent = word.ja;
  } else {
    $('fc-front-word').textContent  = word.ja;
    $('fc-back-answer').textContent = word.en;
  }

  $('fc-back-ex').innerHTML    = word.ex  ? highlightWord(word.ex, word.en) : '';
  $('fc-back-exja').textContent = word.exja ?? '';

  showFront();
}

function showFront() {
  state.shown = false;
  document.querySelector('.fc-front').style.display = '';
  document.querySelector('.fc-back').style.display  = 'none';
  $('fc-btn-show').style.display = '';
  $('fc-btn-row').style.display  = 'none';
}

function showBack() {
  state.shown = true;
  document.querySelector('.fc-front').style.display = 'none';
  document.querySelector('.fc-back').style.display  = 'flex';
  $('fc-btn-show').style.display = 'none';
  $('fc-btn-row').style.display  = 'flex';
}

function grade(isCorrect) {
  const word = state.queue[state.idx];
  if (isCorrect) {
    state.correct++;
  } else {
    state.wrong++;
    state.wrongIds.push(word.id);
  }
  state.idx++;
  if (state.idx >= state.queue.length) {
    showResult();
  } else {
    renderCard();
  }
}

function showResult() {
  $('res-correct').textContent = state.correct;
  $('res-wrong').textContent   = state.wrong;

  const retryWrongBtn = $('btn-retry-wrong');
  if (state.wrongIds.length > 0) {
    retryWrongBtn.style.display = '';
  } else {
    retryWrongBtn.style.display = 'none';
  }
  showScreen('screen-result');
}

// ── Event listeners ──

$('btn-en-jp').addEventListener('click', () => {
  state.mode = 'en-jp';
  startSession([...WORDS]);
});

$('btn-jp-en').addEventListener('click', () => {
  state.mode = 'jp-en';
  startSession([...WORDS]);
});

$('btn-back-home').addEventListener('click', () => showScreen('screen-home'));

$('fc-card').addEventListener('click', () => {
  if (!state.shown) showBack();
});

$('fc-btn-show').addEventListener('click', showBack);

$('fc-btn-correct').addEventListener('click', () => grade(true));
$('fc-btn-wrong').addEventListener('click', () => grade(false));

$('fc-speak-front').addEventListener('click', e => {
  e.stopPropagation();
  const word = state.queue[state.idx];
  const text = state.mode === 'en-jp' ? word.en : word.ja;
  const lang = state.mode === 'en-jp' ? 'en' : 'ja';
  speak(text, lang);
});

$('fc-speak-back').addEventListener('click', e => {
  e.stopPropagation();
  const word = state.queue[state.idx];
  speak(word.en, 'en');
});

$('btn-retry-wrong').addEventListener('click', () => {
  const wrongWords = WORDS.filter(w => state.wrongIds.includes(w.id));
  startSession(wrongWords);
});

$('btn-retry').addEventListener('click', () => startSession([...WORDS]));

$('btn-result-home').addEventListener('click', () => showScreen('screen-home'));

// ── Hamburger menu ──
function openVMenu() { document.getElementById('v-menu-overlay').classList.add('show'); }
function closeVMenu() { document.getElementById('v-menu-overlay').classList.remove('show'); }

['v-hamburger-home', 'v-hamburger-fc', 'v-hamburger-result'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('click', openVMenu);
});
document.getElementById('v-menu-close').addEventListener('click', closeVMenu);

document.getElementById('vmenu-grammar').addEventListener('click', () => {
  window.location.href = '../index.html';
});
document.getElementById('vmenu-eigo').addEventListener('click', () => {
  window.location.href = '../index.html?screen=eigo';
});
document.getElementById('vmenu-vocab').addEventListener('click', closeVMenu);

// ── Init ──
document.querySelector('.home-count').textContent = `${WORDS.length} WORDS`;
initTts();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js');
}
