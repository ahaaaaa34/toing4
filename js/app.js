// app.js — STEP 12 代名詞マスター

const state = {
  queue: [],
  fullQueue: [],
  idx: 0,
  answered: false,
  scores: {},
  wrongIds: [],
  correctIds: [],
  excAllWords: [],
  excUsed: new Set(),
  excAnswer: [],
  excBSelected: null,
  excBNumOK: false
};

/* ── Utility ── */
function $(id) { return document.getElementById(id); }

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $(id).classList.add('active');
  window.scrollTo(0, 0);
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function normalize(s) {
  return s.toLowerCase().replace(/\s+/g, ' ').trim().replace(/[.?!]+$/, '');
}

function assembleSentence(q) {
  let s = q.prefix ? q.prefix + ' ' : '';
  s += state.excAnswer.map(x => x.word).join(' ');
  if (q.suffix) s += /^[.,?!]/.test(q.suffix) ? q.suffix : ' ' + q.suffix;
  return s.trim();
}

/* ── Topic tagging ── */
// 各問題の topic は data.js が持つ（person / ref / indef）。未指定は person 扱い。
(function tagTopics() {
  Object.values(QUIZ_DATA).flat().forEach(q => {
    if (!q.topic) q.topic = 'person';
  });
})();

function selectedTopics() {
  return [...document.querySelectorAll('.topic-btn.on')].map(b => b.dataset.topic);
}

/* ── 出題形式ごとの問題配列 ── */
function filteredQuestions(key) {
  const topics = selectedTopics();
  if (!topics.length) return [];
  return (QUIZ_DATA[key] || []).filter(q => topics.includes(q.topic));
}

/* ── 問題数を動的にセット ── */
const SEC_LABELS = {
  frames: '代名詞の基本パターン',
  exA:    '最も適切な語句を選ぶ',
  exB:    '誤りを含む番号を選ぶ',
  exC:    '語句を並べかえる（確認問題）'
};
function updateCounts() {
  const topics = selectedTopics();
  const anyTopic = topics.length > 0;

  // セクションごとの問題数
  ['frames', 'exA', 'exB', 'exC'].forEach(key => {
    const n = filteredQuestions(key).length;
    const elem = document.getElementById('sub-' + key);
    if (elem) elem.textContent = n > 0 ? `${n}問 · ${SEC_LABELS[key]}` : `（該当なし）`;
  });

  // トピック別問題数バッジ
  const cnt = { person: 0, ref: 0, indef: 0 };
  Object.values(QUIZ_DATA).flat().forEach(q => { cnt[q.topic] = (cnt[q.topic] || 0) + 1; });
  [['topic-cnt-person', 'person'], ['topic-cnt-ref', 'ref'], ['topic-cnt-indef', 'indef']].forEach(([id, key]) => {
    const el = $(id);
    if (el) el.textContent = `${cnt[key]}問`;
  });

  // スタートボタン
  const anySec = document.querySelector('.sec-card.on');
  const total  = ['frames','exA','exB','exC'].reduce((s,k)=> s + (document.querySelector(`.sec-card.on[data-sec="${k}"]`) ? filteredQuestions(k).length : 0), 0);
  $('start-btn').disabled = !(anyTopic && anySec && total > 0);
}
updateCounts();

/* ── Topic toggle ── */
document.querySelectorAll('.topic-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    btn.classList.toggle('on');
    updateCounts();
  });
});

/* ── Section toggle ── */
document.querySelectorAll('.sec-card').forEach(card => {
  card.addEventListener('click', () => {
    card.classList.toggle('on');
    updateCounts();
  });
});

/* ── Previous score ── */
(function loadPrev() {
  try {
    const d = JSON.parse(localStorage.getItem('grammar-step12-score'));
    if (!d) return;
    $('prev-card').style.display = '';
    $('prev-val').textContent = `${d.c}/${d.t} (${d.pct}%)`;
    if (d.wrongIds && d.wrongIds.length > 0) {
      const btn = $('home-retry-wrong-btn');
      btn.textContent = `✗ 間違えた ${d.wrongIds.length} 問だけやり直す`;
      btn.style.display = '';
    }
  } catch (_) {}
})();

$('home-retry-wrong-btn').addEventListener('click', () => {
  try {
    const d = JSON.parse(localStorage.getItem('grammar-step12-score'));
    if (!d || !d.wrongIds || !d.wrongIds.length) return;
    const allQ = Object.values(QUIZ_DATA).flat();
    const wrongQ = allQ.filter(q => d.wrongIds.includes(q.id));
    if (!wrongQ.length) return;

    state.queue     = wrongQ;
    state.fullQueue = wrongQ;
    state.idx       = 0;
    state.answered  = false;
    state.wrongIds  = [];
    state.correctIds = [];
    state.scores    = {};
    wrongQ.forEach(item => {
      if (!state.scores[item.section])
        state.scores[item.section] = { c: 0, t: 0, name: item.sectionName };
    });
    showScreen('screen-quiz');
    renderQ();
  } catch (_) {}
});

/* ── Start ── */
$('start-btn').addEventListener('click', () => {
  const q = [];
  document.querySelectorAll('.sec-card.on').forEach(c => {
    const key = c.dataset.sec;
    q.push(...filteredQuestions(key));
  });
  if (!q.length) return;

  state.queue = q;
  state.fullQueue = q;
  state.idx = 0;
  state.answered = false;
  state.wrongIds = [];
  state.correctIds = [];
  state.scores = {};
  q.forEach(item => {
    if (!state.scores[item.section])
      state.scores[item.section] = { c: 0, t: 0, name: item.sectionName };
  });

  showScreen('screen-quiz');
  renderQ();
});

/* ── Navigation ── */
$('quiz-back').addEventListener('click', () => showScreen('screen-home'));
$('home-btn').addEventListener('click', () => showScreen('screen-home'));

$('retry-btn').addEventListener('click', () => {
  state.queue = [...state.fullQueue];
  state.idx = 0;
  state.answered = false;
  state.wrongIds = [];
  state.correctIds = [];
  Object.values(state.scores).forEach(s => { s.c = 0; s.t = 0; });
  showScreen('screen-quiz');
  renderQ();
});

$('retry-wrong-btn').addEventListener('click', () => {
  const wrongQ = state.fullQueue.filter(q => state.wrongIds.includes(q.id));
  if (!wrongQ.length) return;
  state.queue = wrongQ;
  state.fullQueue = wrongQ;
  state.idx = 0;
  state.answered = false;
  state.wrongIds = [];
  state.correctIds = [];
  state.scores = {};
  wrongQ.forEach(item => {
    if (!state.scores[item.section])
      state.scores[item.section] = { c: 0, t: 0, name: item.sectionName };
  });
  showScreen('screen-quiz');
  renderQ();
});

/* ── Render question ── */
function renderQ() {
  const q     = state.queue[state.idx];
  const total = state.queue.length;
  const cur   = state.idx + 1;

  $('prog-txt').textContent  = `${cur} / ${total}`;
  $('prog-fill').style.width = `${(cur / total) * 100}%`;

  const tag = $('q-tag');
  tag.textContent = q.label;
  tag.className   = 'q-tag ' + q.tagClass;
  $('q-src').textContent = q.source ? `〈${q.source}〉` : '';
  $('q-important').style.display = q.important ? 'inline-block' : 'none';

  $('opts').innerHTML = '';
  $('opts').style.display     = 'none';
  $('exb-zone').style.display = 'none';
  $('exc-zone').style.display = 'none';
  $('fb-card').className = 'fb-card';
  $('next-btn').className = 'next-btn';
  $('q-ja').style.display = 'none';
  state.answered = false;

  if (q.type === 'exB') {
    renderExBQ(q);
  } else if (q.type === 'exC') {
    renderExCQ(q);
  } else {
    $('opts').style.display = '';
    renderChoiceQ(q);
  }
}

/* ── Choice (FRAME / ExA) ── */
function renderChoiceQ(q) {
  const html = q.question.replace(/\(\s*\)/g, '<span class="blank">(　　　)</span>');
  $('q-text').innerHTML = html;

  const NUMS = ['①', '②', '③', '④'];
  const container = $('opts');
  q.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'opt-btn';
    btn.innerHTML = `<span class="opt-num">${NUMS[i]}</span><span>${opt}</span>`;
    btn.addEventListener('click', () => selectOption(i));
    container.appendChild(btn);
  });
}

function selectOption(chosen) {
  if (state.answered) return;
  state.answered = true;

  const q    = state.queue[state.idx];
  const isOK = chosen === q.answer;
  const NUMS = ['①', '②', '③', '④'];

  state.scores[q.section].t++;
  if (isOK) { state.scores[q.section].c++; state.correctIds.push(q.id); }
  else        state.wrongIds.push(q.id);

  const btns = $('opts').querySelectorAll('.opt-btn');
  btns.forEach((btn, i) => {
    btn.disabled = true;
    if (i === q.answer)    btn.classList.add('correct');
    else if (i === chosen) btn.classList.add('wrong');
  });

  showFeedback({
    isOK,
    headText:      isOK ? '✓ 正解！' : `✗ 不正解　正解: ${NUMS[q.answer]}`,
    fixText:       null,
    correctedText: null,
    traText:  q.translation ? `[訳] ${q.translation}` : null,
    expText:  q.explanation
  });
}

/* ── ExB ── */
function renderExBQ(q) {
  const NUMS = ['①', '②', '③', '④'];
  const parts = q.question.split(/([①②③④])/);

  // 各番号の下線区間を囲む（spans があれば教科書どおりの範囲、なければ次の番号の手前まで）
  let html = '';
  let open = -1;
  parts.forEach(part => {
    const numIdx = NUMS.indexOf(part);
    if (numIdx >= 0) {
      if (open >= 0) html += '</span>';
      html += `<span class="exb-seg" data-idx="${numIdx}"><button class="exb-num-btn" data-idx="${numIdx}">${part}</button>`;
      open = numIdx;
    } else if (open >= 0) {
      const span = q.spans && q.spans[open];
      if (span && part.startsWith(span)) {
        html += span + '</span>' + part.slice(span.length);
      } else {
        const m = part.match(/^(.*?)([\s.,!?;:]*)$/s);
        html += m[1] + '</span>' + m[2];
      }
      open = -1;
    } else {
      html += part;
    }
  });
  if (open >= 0) html += '</span>';
  $('q-text').innerHTML = html;

  $('q-text').querySelectorAll('.exb-seg').forEach(seg => {
    seg.addEventListener('click', () => {
      if (state.answered || seg.querySelector('.exb-num-btn').disabled) return;
      state.excBSelected = parseInt(seg.dataset.idx);
      $('q-text').querySelectorAll('.exb-seg').forEach(s => {
        const on = parseInt(s.dataset.idx) === state.excBSelected;
        s.classList.toggle('selected', on);
        s.querySelector('.exb-num-btn').classList.toggle('selected', on);
      });
      $('exb-input-wrap').style.display = '';
      $('exb-input').focus();
      $('exb-check-btn').disabled = $('exb-input').value.trim().length === 0;
    });
  });

  state.excBSelected = null;
  state.excBNumOK   = false;
  $('exb-input-wrap').style.display = 'none';
  $('exb-input').value = '';
  $('exb-input').disabled = false;
  $('exb-phase1').style.display = '';
  $('exb-phase2').style.display = 'none';
  $('exb-check-btn').disabled = true;
  $('exb-reveal-btn').style.display = '';
  $('exb-zone').style.display = '';
}

$('exb-input').addEventListener('input', () => {
  if (state.excBSelected !== null)
    $('exb-check-btn').disabled = $('exb-input').value.trim().length === 0;
});
$('exb-input').addEventListener('keydown', e => {
  if (e.key === 'Enter' && !$('exb-check-btn').disabled) $('exb-check-btn').click();
});

$('exb-check-btn').addEventListener('click', () => {
  if (state.excBSelected === null) return;

  const q          = state.queue[state.idx];
  const NUMS       = ['①', '②', '③', '④'];
  const correctNum = q.answer;
  const numOK      = state.excBSelected === correctNum;
  const correctForm = (q.correction.split('→')[1] || '').trim();

  state.excBNumOK = numOK;

  // Lock number buttons, highlight correct one
  $('q-text').querySelectorAll('.exb-num-btn').forEach(btn => {
    btn.disabled = true;
    if (parseInt(btn.dataset.idx) === correctNum) {
      btn.classList.add('correct-ans');
      btn.closest('.exb-seg')?.classList.add('correct-ans');
    }
  });
  $('exb-input').disabled = true;

  // Show number result
  const numResult = $('exb-num-result');
  if (numOK) {
    numResult.textContent = `✓ 番号正解: ${NUMS[state.excBSelected]}`;
    numResult.className   = 'exb-num-result ok';
  } else {
    numResult.textContent = `✗ 番号不正解（正解: ${NUMS[correctNum]}）`;
    numResult.className   = 'exb-num-result ng';
  }

  // Show comparison
  $('exb-typed-val').textContent = $('exb-input').value.trim() || '（未入力）';
  $('exb-correct-val').textContent = correctForm;

  $('exb-phase1').style.display = 'none';
  $('exb-phase2').style.display = '';
});

function resolveExB(textOK) {
  if (state.answered) return;
  state.answered = true;

  const q    = state.queue[state.idx];
  const isOK = state.excBNumOK && textOK;
  const NUMS = ['①', '②', '③', '④'];

  state.scores[q.section].t++;
  if (isOK) { state.scores[q.section].c++; state.correctIds.push(q.id); }
  else        state.wrongIds.push(q.id);

  $('exb-phase2').style.display = 'none';

  showFeedback({
    isOK,
    headText:      isOK ? '✓ 正解！' : `✗ 不正解　正解: ${NUMS[q.answer]}`,
    fixText:       q.correction,
    correctedText: q.corrected,
    traText:  q.translation ? `[訳] ${q.translation}` : null,
    expText:  q.explanation
  });
}

$('exb-self-ok').addEventListener('click', () => resolveExB(true));
$('exb-self-ng').addEventListener('click', () => resolveExB(false));

$('exb-reveal-btn').addEventListener('click', () => {
  if (state.answered) return;
  state.answered = true;

  const q    = state.queue[state.idx];
  const NUMS = ['①', '②', '③', '④'];

  state.scores[q.section].t++;
  state.wrongIds.push(q.id);

  $('q-text').querySelectorAll('.exb-num-btn').forEach(btn => {
    btn.disabled = true;
    if (parseInt(btn.dataset.idx) === q.answer) {
      btn.classList.add('correct-ans');
      btn.closest('.exb-seg')?.classList.add('correct-ans');
    }
  });
  $('exb-phase1').style.display = 'none';
  $('exb-phase2').style.display = 'none';

  showFeedback({
    isOK:          false,
    headText:      `答え: ${NUMS[q.answer]}`,
    fixText:       q.correction,
    correctedText: q.corrected,
    traText:  q.translation ? `[訳] ${q.translation}` : null,
    expText:  q.explanation
  });
});

/* ── ExC ── */
function renderExCQ(q) {
  $('q-text').innerHTML = (q.japanese || '語句を並べかえて英文を完成させなさい。')
    + (q.note ? ` <span class="exc-note">［${q.note}］</span>` : '');

  if (!q.japanese && q.translation) {
    $('q-ja').textContent   = `[意味] ${q.translation}`;
    $('q-ja').style.display = '';
  }

  $('exc-zone').style.display = '';

  let ctxHtml = '';
  if (q.prefix) ctxHtml += `${q.prefix} `;
  ctxHtml += '<span class="ctx-blank">（　　　　　　）</span>';
  if (q.suffix) ctxHtml += /^[.,?!]/.test(q.suffix) ? q.suffix : ` ${q.suffix}`;
  $('exc-ctx').innerHTML = ctxHtml;

  state.excAllWords = shuffle(q.words.map((w, i) => ({ word: w, i })));
  state.excUsed     = new Set();
  state.excAnswer   = [];

  $('check-btn').disabled = true;
  renderExCChips();
}

/* ── ExC chip rendering ── */
function renderExCChips() {
  const buildEl = $('build-area');
  const poolEl  = $('pool-area');
  const hintEl  = $('build-hint');

  [...buildEl.querySelectorAll('.wchip-ans')].forEach(el => el.remove());
  hintEl.style.display = state.excAnswer.length ? 'none' : '';

  state.excAnswer.forEach(({ word, i }, pos) => {
    const btn = makeAnswerChip(word, i, pos);
    buildEl.appendChild(btn);
  });

  poolEl.innerHTML = '';
  state.excAllWords.forEach(({ word, i }) => {
    const btn = document.createElement('button');
    btn.className   = 'wchip wchip-pool';
    btn.textContent = word;
    if (state.excUsed.has(i)) {
      btn.style.visibility = 'hidden';
      btn.disabled = true;
    } else {
      btn.addEventListener('click', () => pickWord(i));
    }
    poolEl.appendChild(btn);
  });
}

/* ── Answer chip factory with long-press drag ── */
function makeAnswerChip(word, wordI, pos) {
  const btn = document.createElement('button');
  btn.className      = 'wchip wchip-ans';
  btn.textContent    = word;
  btn.dataset.ansPos = pos;

  let timer    = null;
  let dragging = false;
  let ghost    = null;
  let startX, startY, capturedId;

  function cleanup() {
    clearTimeout(timer);
    dragging = false;
    if (ghost) { ghost.remove(); ghost = null; }
    btn.classList.remove('dragging');
  }

  btn.addEventListener('pointerdown', e => {
    if (state.answered) return;
    startX     = e.clientX;
    startY     = e.clientY;
    capturedId = e.pointerId;

    timer = setTimeout(() => {
      dragging = true;
      try { btn.setPointerCapture(capturedId); } catch (_) {}
      if (navigator.vibrate) navigator.vibrate(25);

      const rect = btn.getBoundingClientRect();
      ghost = document.createElement('span');
      ghost.className   = 'drag-ghost';
      ghost.textContent = word;
      ghost.style.left  = `${rect.left}px`;
      ghost.style.top   = `${rect.top}px`;
      document.body.appendChild(ghost);
      btn.classList.add('dragging');
    }, 380);
  });

  btn.addEventListener('pointermove', e => {
    if (!dragging) {
      if (Math.hypot(e.clientX - startX, e.clientY - startY) > 8) clearTimeout(timer);
      return;
    }
    if (ghost) {
      ghost.style.left = `${e.clientX - ghost.offsetWidth / 2}px`;
      ghost.style.top  = `${e.clientY - ghost.offsetHeight / 2}px`;
    }
  });

  btn.addEventListener('pointerup', e => {
    if (!dragging) {
      cleanup();
      returnWord(wordI);
      return;
    }

    const fromPos = parseInt(btn.dataset.ansPos);
    const dropX   = e.clientX;
    const dropY   = e.clientY;
    cleanup();

    // getBoundingClientRect scan avoids pointer-capture hit-testing issues
    const chips = [...document.querySelectorAll('.wchip-ans')];
    let targetChip = null;

    for (const chip of chips) {
      if (chip === btn) continue;
      const r = chip.getBoundingClientRect();
      if (dropX >= r.left && dropX <= r.right && dropY >= r.top && dropY <= r.bottom) {
        targetChip = chip;
        break;
      }
    }

    // Fallback: nearest chip center within 80px
    if (!targetChip) {
      let minDist = 80;
      for (const chip of chips) {
        if (chip === btn) continue;
        const r  = chip.getBoundingClientRect();
        const cx = (r.left + r.right) / 2;
        const cy = (r.top  + r.bottom) / 2;
        const d  = Math.hypot(dropX - cx, dropY - cy);
        if (d < minDist) { minDist = d; targetChip = chip; }
      }
    }

    if (targetChip) {
      const toPos = parseInt(targetChip.dataset.ansPos);
      if (!isNaN(toPos) && fromPos !== toPos) {
        const [item] = state.excAnswer.splice(fromPos, 1);
        state.excAnswer.splice(toPos > fromPos ? toPos - 1 : toPos, 0, item);
        renderExCChips();
      }
    }
  });

  btn.addEventListener('pointercancel', cleanup);
  btn.addEventListener('contextmenu', e => e.preventDefault());

  return btn;
}

function pickWord(i) {
  if (state.excUsed.has(i)) return;
  const item = state.excAllWords.find(x => x.i === i);
  state.excUsed.add(i);
  state.excAnswer.push({ word: item.word, i });
  renderExCChips();
  $('check-btn').disabled = false;
}

function returnWord(i) {
  state.excUsed.delete(i);
  state.excAnswer = state.excAnswer.filter(x => x.i !== i);
  renderExCChips();
  if (state.excAnswer.length === 0) $('check-btn').disabled = true;
}

$('check-btn').addEventListener('click', () => {
  if (state.answered) return;
  state.answered = true;
  $('check-btn').disabled = true;

  const q         = state.queue[state.idx];
  const assembled = assembleSentence(q);
  const isOK      = normalize(assembled) === normalize(q.answer);

  state.scores[q.section].t++;
  if (isOK) { state.scores[q.section].c++; state.correctIds.push(q.id); }
  else        state.wrongIds.push(q.id);

  showFeedback({
    isOK,
    headText:      isOK ? '✓ 正解！' : '✗ 不正解',
    fixText:       q.answer,
    correctedText: null,
    traText:       q.translation ? `[訳] ${q.translation}` : null,
    expText:       q.explanation
  });
});

/* ── Shared feedback ── */
function showFeedback({ isOK, headText, fixText, correctedText, traText, expText }) {
  const fb   = $('fb-card');
  const head = $('fb-head');
  const fix  = $('fb-fix');
  const cor  = $('fb-corrected');
  const tra  = $('fb-tra');
  const exp  = $('fb-exp');

  fb.className     = `fb-card show ${isOK ? 'ok' : 'ng'}`;
  head.className   = `fb-head ${isOK ? 'ok' : 'ng'}`;
  head.textContent = headText;

  if (fixText)       { fix.textContent = fixText; fix.style.display = 'block'; }
  else                 fix.style.display = 'none';

  if (correctedText) { cor.textContent = '✓ ' + correctedText; cor.style.display = 'block'; }
  else                 cor.style.display = 'none';

  if (traText)       { tra.textContent = traText; tra.style.display = 'block'; }
  else                 tra.style.display = 'none';

  exp.textContent = expText;
  $('next-btn').className = 'next-btn show';
  saveProgress();
}

function loadStoredWrongIds() {
  try {
    const d = JSON.parse(localStorage.getItem('grammar-step12-score'));
    return (d && Array.isArray(d.wrongIds)) ? d.wrongIds : [];
  } catch (_) { return []; }
}

function saveProgress() {
  try {
    const totalC = Object.values(state.scores).reduce((s, v) => s + v.c, 0);
    const totalT = Object.values(state.scores).reduce((s, v) => s + v.t, 0);
    const pct = totalT ? Math.round(totalC / totalT * 100) : 0;

    // 間違えた問題はセッションをまたいで累積保存。あとで正解した問題はリストから外す。
    const set = new Set(loadStoredWrongIds());
    state.wrongIds.forEach(id => set.add(id));
    state.correctIds.forEach(id => set.delete(id));
    const cumWrong = [...set];

    localStorage.setItem('grammar-step12-score', JSON.stringify({ c: totalC, t: totalT, pct, wrongIds: cumWrong }));
    $('prev-card').style.display = '';
    $('prev-val').textContent = `${totalC}/${totalT} (${pct}%)`;
    const btn = $('home-retry-wrong-btn');
    if (cumWrong.length > 0) {
      btn.textContent = `✗ 間違えた ${cumWrong.length} 問だけやり直す`;
      btn.style.display = '';
    } else {
      btn.style.display = 'none';
    }
  } catch (_) {}
}

/* ── Next ── */
$('next-btn').addEventListener('click', () => {
  state.idx++;
  if (state.idx >= state.queue.length) {
    showResults();
  } else {
    renderQ();
    window.scrollTo(0, 0);
  }
});

/* ── Results ── */
function showResults() {
  let totalC = 0, totalT = 0;
  Object.values(state.scores).forEach(s => { totalC += s.c; totalT += s.t; });

  const pct = totalT ? Math.round(totalC / totalT * 100) : 0;
  $('score-big').textContent = `${totalC}/${totalT}`;
  $('score-pct').textContent = `${pct}%`;

  if      (pct >= 80) $('res-h2').textContent = 'クイズ完了！ 🎉';
  else if (pct >= 60) $('res-h2').textContent = 'クイズ完了！ 👍';
  else                $('res-h2').textContent = 'クイズ完了！';

  const SEC_NAMES = {
    frames: 'FRAME（例題）',
    exA:    'Exercise A（空所補充）',
    exB:    'Exercise B（誤文訂正）',
    exC:    'Exercise C（整序英作文）'
  };

  const container = $('sec-results');
  container.innerHTML = '';
  ['frames', 'exA', 'exB', 'exC'].forEach(key => {
    const s = state.scores[key];
    if (!s || s.t === 0) return;
    const p    = Math.round(s.c / s.t * 100);
    const card = document.createElement('div');
    card.className = 'sec-res';
    card.innerHTML = `
      <span class="sec-res-name">${SEC_NAMES[key]}</span>
      <div class="mini-bar"><div class="mini-fill" style="width:${p}%"></div></div>
      <span class="sec-res-score">${s.c}/${s.t}</span>`;
    container.appendChild(card);
  });

  const wrongBtn = $('retry-wrong-btn');
  if (state.wrongIds.length > 0) {
    wrongBtn.textContent   = `✗ 間違えた ${state.wrongIds.length} 問だけもう一度`;
    wrongBtn.style.display = '';
  } else {
    wrongBtn.style.display = 'none';
  }


  showScreen('screen-results');
}

/* ── Hamburger menu ── */
function openMenu() { $('menu-overlay').classList.add('show'); }
function closeMenu() { $('menu-overlay').classList.remove('show'); }

['hamburger-btn', 'hamburger-quiz', 'hamburger-res', 'hamburger-eigo'].forEach(id => {
  const el = $(id);
  if (el) el.addEventListener('click', openMenu);
});
$('menu-close-area').addEventListener('click', closeMenu);

let currentSubject = 'grammar';

function setMenuActive(subject) {
  ['menu-grammar', 'menu-eigo', 'menu-vocab'].forEach(id => {
    $(id).classList.toggle('active', id === 'menu-' + subject);
  });
  currentSubject = subject;
}

$('menu-grammar').addEventListener('click', () => {
  setMenuActive('grammar');
  closeMenu();
  showScreen('screen-home');
});

$('menu-eigo').addEventListener('click', () => {
  setMenuActive('eigo');
  closeMenu();
  renderEigo();
  showScreen('screen-eigo');
});

$('menu-vocab').addEventListener('click', () => {
  setMenuActive('vocab');
  closeMenu();
  window.location.href = 'vocab/index.html';
});

// #eigo-back は現在マークアップに存在しないため、存在するときだけ束縛する（以降の初期化を止めないように）
$('eigo-back')?.addEventListener('click', () => showScreen('screen-home'));

/* ── Eigo screen ── */
function renderEigo() {
  const body = $('eigo-body');
  if (body.children.length > 0) return;
  EIGO_SENTENCES.forEach((s, i) => {
    const card = document.createElement('div');
    card.className = 'sen-card';
    card.innerHTML = `
      <div class="sen-num">${i + 1} / ${EIGO_SENTENCES.length}</div>
      <div class="sen-en">🇬🇧 ${s.en}</div>
      <div class="sen-ja">🇯🇵 ${s.ja}</div>
      <div class="sen-grammar">📘 文法：${s.grammar}</div>`;
    body.appendChild(card);
  });
}

/* ── Handle deep-link from vocab app ── */
const _p = new URLSearchParams(location.search).get('screen');
if (_p === 'eigo') {
  renderEigo();
  showScreen('screen-eigo');
  setMenuActive('eigo');
  history.replaceState(null, '', location.pathname);
}

/* ── Service Worker ── */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
