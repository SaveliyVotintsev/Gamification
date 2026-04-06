'use strict';

// =========
// Состояние
// =========
const state = {
  allQuestions: [],
  currentPool: [],
  currentIndex: 0,
  answers: [],
  locked: false,
};

// =========
// DOM-ссылки
// =========
const el = {
  screenStart: document.getElementById('screen-start'),
  screenQuestion: document.getElementById('screen-question'),
  screenResults: document.getElementById('screen-results'),
  screenBrowse: document.getElementById('screen-browse'),
  browseList: document.getElementById('browse-list'),
  btnBrowseBack: document.getElementById('btn-browse-back'),
  btnStart: document.getElementById('btn-start'),
  btnNext: document.getElementById('btn-next'),
  btnRetry: document.getElementById('btn-retry'),
  btnNewSession: document.getElementById('btn-new-session'),
  themeToggle: document.getElementById('theme-toggle'),
  btnQr: document.getElementById('btn-qr'),
  qrOverlay: document.getElementById('qr-overlay'),
  qrCanvas: document.getElementById('qr-canvas'),
  qrUrl: document.getElementById('qr-url'),
  btnQrClose: document.getElementById('btn-qr-close'),
  loadError: document.getElementById('load-error'),
  questionText: document.getElementById('question-text'),
  optionsList: document.getElementById('options-list'),
  noteBlock: document.getElementById('note-block'),
  currentNum: document.getElementById('current-num'),
  totalNum: document.getElementById('total-num'),
  progressFill: document.getElementById('progress-fill'),
  scoreCorrect: document.getElementById('score-correct'),
  scoreTotal: document.getElementById('score-total'),
  mistakesList: document.getElementById('mistakes-list'),
  scorePct: document.getElementById('score-pct'),
  openAnswerArea: document.getElementById('open-answer-area'),
  openInput: document.getElementById('open-input'),
  btnSubmitAnswer: document.getElementById('btn-submit-answer'),
  openFeedback: document.getElementById('open-feedback'),
};

// =========
// Экраны
// =========
function showScreen(name) {
  el.screenStart.classList.add('hidden');
  el.screenQuestion.classList.add('hidden');
  el.screenResults.classList.add('hidden');
  el.screenBrowse.classList.add('hidden');
  let target;
  if (name === 'start') {
    target = el.screenStart;
  } else if (name === 'question') {
    target = el.screenQuestion;
  } else if (name === 'browse') {
    target = el.screenBrowse;
  } else {
    target = el.screenResults;
  }
  target.classList.remove('hidden');
}

// =========
// Загрузка данных
// =========
async function loadQuiz() {
  try {
    const res = await fetch('./gamification_quiz.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const mc = (data.multiple_choice || []).map(q => ({ ...q, type: 'multiple_choice' }));
    const open = (data.open_questions_octalysis || []).map(q => ({ ...q, type: 'open' }));
    state.allQuestions = [...mc, ...open];
    if (state.allQuestions.length === 0) {
      throw new Error('Некорректная структура JSON: нет вопросов');
    }
    updatePackCounts();
    el.btnStart.disabled = false;
  } catch (err) {
    console.error('Ошибка загрузки квиза:', err);
    el.loadError.textContent = 'Не удалось загрузить вопросы. Проверьте, что файл gamification_quiz.json лежит рядом с index.html.';
    el.loadError.classList.remove('hidden');
    el.btnStart.disabled = true;
  }
}

// =========
// Утилиты
// =========
function shuffle(arr) {
  const result = arr.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function updatePackCounts() {
  const q = state.allQuestions;
  document.getElementById('count-mc').textContent = q.filter(x => x.type === 'multiple_choice').length;
  document.getElementById('count-open').textContent = q.filter(x => x.type === 'open').length;
  document.getElementById('count-all').textContent = q.length;
}

function clearChildren(node) {
  while (node.firstChild) {
    node.firstChild.remove();
  }
}

// =========
// Сессия
// =========
function startSession(questionsSource) {
  // questionsSource — уже отфильтрованный массив вопросов
  state.currentPool = shuffle(questionsSource).map(q => ({
    ...q,
    options: q.options ? shuffle(q.options) : undefined,
  }));
  state.currentIndex = 0;
  state.answers = [];
  state.locked = false;
  el.totalNum.textContent = state.currentPool.length;
  showScreen('question');
  renderQuestion();
}

function getPackQuestions(pack) {
  if (pack === 'multiple_choice') {
    return state.allQuestions.filter(q => q.type === 'multiple_choice');
  }
  if (pack === 'open') {
    return state.allQuestions.filter(q => q.type === 'open');
  }
  if (pack === 'exam') {
    return shuffle(state.allQuestions.slice()).slice(0, 20);
  }
  return state.allQuestions.slice();
}

function renderQuestion() {
  state.locked = false;
  const q = state.currentPool[state.currentIndex];
  el.currentNum.textContent = state.currentIndex + 1;
  el.questionText.textContent = q.text;

  // Прогресс-бар
  const pct = (state.currentIndex / state.currentPool.length) * 100;
  el.progressFill.style.width = `${pct}%`;

  // Сброс
  clearChildren(el.optionsList);
  el.noteBlock.classList.add('hidden');
  el.noteBlock.textContent = '';
  el.btnNext.classList.add('hidden');
  el.openAnswerArea.classList.add('hidden');
  el.openFeedback.classList.remove('visible');
  clearChildren(el.openFeedback);
  el.openInput.value = '';
  el.openInput.disabled = false;
  el.btnSubmitAnswer.textContent = 'Ответить';
  el.btnSubmitAnswer.classList.remove('hidden');

  if (q.type === 'open') {
    // Открытый вопрос
    el.optionsList.classList.add('hidden');
    el.openAnswerArea.classList.remove('hidden');
    el.openInput.focus();
  } else {
    // Тестовый вопрос
    el.optionsList.classList.remove('hidden');
    q.options.forEach(optText => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.textContent = optText;
      btn.addEventListener('click', () => handleAnswer(optText, btn));
      el.optionsList.appendChild(btn);
    });
  }
}

function handleAnswer(pickedOption, pickedBtn) {
  if (state.locked) return;
  state.locked = true;

  const q = state.currentPool[state.currentIndex];
  const isCorrect = pickedOption === q.answer;
  state.answers.push({ questionId: q.id, pickedOption, isCorrect });

  // Подсветка: правильный всегда зелёный, выбранный неправильный — красный, остальные — приглушены
  const buttons = el.optionsList.querySelectorAll('.option-btn');
  buttons.forEach(btn => {
    const text = btn.textContent;
    if (text === q.answer) {
      btn.classList.add('option-correct');
    } else if (btn === pickedBtn) {
      btn.classList.add('option-wrong');
    } else {
      btn.classList.add('option-muted');
    }
    btn.disabled = true;
  });

  // Note (если есть)
  if (q.note) {
    el.noteBlock.textContent = q.note;
    el.noteBlock.classList.remove('hidden');
  }

  // Кнопка «Дальше»
  el.btnNext.classList.remove('hidden');

  // Завершающий прогресс
  const pct = ((state.currentIndex + 1) / state.currentPool.length) * 100;
  el.progressFill.style.width = `${pct}%`;
}

// =========
// Открытые вопросы
// =========
function normalizeAnswer(str) {
  return str.trim().toLowerCase().replaceAll(/\s+/g, ' ').replaceAll(/[.,;:!?]+$/g, '');
}

function handleOpenAnswer() {
  if (state.locked) return;
  const input = el.openInput.value.trim();
  if (!input) return;

  state.locked = true;
  el.openInput.disabled = true;
  el.btnSubmitAnswer.textContent = 'Дальше';

  const q = state.currentPool[state.currentIndex];
  const isCorrect = normalizeAnswer(input) === normalizeAnswer(q.answer);
  state.answers.push({ questionId: q.id, pickedOption: input, isCorrect });

  clearChildren(el.openFeedback);

  el.openFeedback.className = isCorrect
    ? 'open-feedback visible open-feedback-correct'
    : 'open-feedback visible open-feedback-wrong';

  const yourLine = document.createElement('p');
  yourLine.appendChild(document.createTextNode('Ваш ответ: '));
  const inputSpan = document.createElement('span');
  inputSpan.className = isCorrect ? 'correct-text' : 'wrong-text';
  inputSpan.textContent = input;
  yourLine.appendChild(inputSpan);
  el.openFeedback.appendChild(yourLine);

  const correctLine = document.createElement('p');
  correctLine.appendChild(document.createTextNode('Правильно: '));
  const correctSpan = document.createElement('span');
  correctSpan.className = 'correct-text';
  correctSpan.textContent = q.answer;
  correctLine.appendChild(correctSpan);
  el.openFeedback.appendChild(correctLine);

  if (q.note) {
    el.noteBlock.textContent = q.note;
    el.noteBlock.classList.remove('hidden');
  }

  const pct = ((state.currentIndex + 1) / state.currentPool.length) * 100;
  el.progressFill.style.width = `${pct}%`;
}

function nextQuestion() {
  state.currentIndex++;
  if (state.currentIndex >= state.currentPool.length) {
    showResults();
  } else {
    renderQuestion();
  }
}

function buildMistakeItem(question, answer) {
  const block = document.createElement('div');
  block.className = 'mistake-item';

  const qEl = document.createElement('p');
  qEl.className = 'mistake-question';
  qEl.textContent = question.text;
  block.appendChild(qEl);

  const pickedEl = document.createElement('p');
  pickedEl.className = 'mistake-picked';
  pickedEl.appendChild(document.createTextNode('Ваш ответ: '));
  const wrongSpan = document.createElement('span');
  wrongSpan.className = 'wrong-text';
  wrongSpan.textContent = answer.pickedOption;
  pickedEl.appendChild(wrongSpan);
  block.appendChild(pickedEl);

  const correctEl = document.createElement('p');
  correctEl.className = 'mistake-correct';
  correctEl.appendChild(document.createTextNode('Правильно: '));
  const correctSpan = document.createElement('span');
  correctSpan.className = 'correct-text';
  correctSpan.textContent = question.answer;
  correctEl.appendChild(correctSpan);
  block.appendChild(correctEl);

  if (question.note) {
    const noteEl = document.createElement('p');
    noteEl.className = 'mistake-note';
    noteEl.textContent = question.note;
    block.appendChild(noteEl);
  }

  return block;
}

function showResults() {
  const correct = state.answers.filter(a => a.isCorrect).length;
  const total = state.answers.length;
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  el.scoreCorrect.textContent = correct;
  el.scoreTotal.textContent = total;
  el.scorePct.textContent = `${pct}%`;

  // Список ошибок
  clearChildren(el.mistakesList);
  const mistakes = state.answers.filter(a => !a.isCorrect);

  if (mistakes.length === 0) {
    const msg = document.createElement('p');
    msg.className = 'all-correct';
    msg.textContent = 'Все ответы правильные.';
    el.mistakesList.appendChild(msg);
  } else {
    mistakes.forEach(a => {
      const q = state.currentPool.find(item => item.id === a.questionId);
      el.mistakesList.appendChild(buildMistakeItem(q, a));
    });
  }

  el.btnRetry.disabled = mistakes.length === 0;
  showScreen('results');
}

function showBrowse() {
  clearChildren(el.browseList);
  state.allQuestions.forEach((q, i) => {
    const item = document.createElement('div');
    item.className = 'browse-item';

    const num = document.createElement('span');
    num.className = 'browse-num';
    num.textContent = `${i + 1}.`;

    const text = document.createElement('p');
    text.className = 'browse-question';
    text.textContent = q.text;

    const answer = document.createElement('p');
    answer.className = 'browse-answer';
    answer.textContent = q.answer;

    item.appendChild(num);
    item.appendChild(text);
    item.appendChild(answer);
    el.browseList.appendChild(item);
  });
  showScreen('browse');
}

function retryMistakes() {
  const wrongIds = new Set(state.answers.filter(a => !a.isCorrect).map(a => a.questionId));
  // Берём оригинальные (не перемешанные) вопросы из allQuestions,
  // чтобы startSession сам заново перемешал варианты
  const wrongQuestions = state.allQuestions.filter(q => wrongIds.has(q.id));
  if (wrongQuestions.length === 0) return;
  startSession(wrongQuestions);
}

// =========
// Обработчики
// =========
el.btnStart.addEventListener('click', () => {
  const selected = document.querySelector('input[name="pack"]:checked').value;
  if (selected === 'browse') {
    showBrowse();
    return;
  }
  const questions = getPackQuestions(selected);
  if (questions.length === 0) {
    console.warn('Пустая пачка');
    return;
  }
  startSession(questions);
});

el.btnBrowseBack.addEventListener('click', () => showScreen('start'));
el.btnNext.addEventListener('click', nextQuestion);
el.btnSubmitAnswer.addEventListener('click', () => {
  if (state.locked) {
    nextQuestion();
  } else {
    handleOpenAnswer();
  }
});
el.openInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleOpenAnswer();
});
el.btnRetry.addEventListener('click', retryMistakes);
el.btnNewSession.addEventListener('click', () => showScreen('start'));

// =========
// QR-код
// =========
function showQr() {
  const url = globalThis.location.href;
  el.qrUrl.textContent = url;
  if (typeof QRCode !== 'undefined') {
    QRCode.toCanvas(el.qrCanvas, url, {
      width: 200,
      margin: 2,
      color: {
        dark: getComputedStyle(document.documentElement).getPropertyValue('--fg').trim(),
        light: getComputedStyle(document.documentElement).getPropertyValue('--bg').trim(),
      },
    });
  }
  el.qrOverlay.classList.remove('hidden');
}

function hideQr() {
  el.qrOverlay.classList.add('hidden');
}

el.btnQr.addEventListener('click', showQr);
el.btnQrClose.addEventListener('click', hideQr);
el.qrOverlay.addEventListener('click', (e) => {
  if (e.target === el.qrOverlay) hideQr();
});

// =========
// Темы
// =========
function initTheme() {
  const prefersDark = globalThis.matchMedia('(prefers-color-scheme: dark)').matches;
  if (prefersDark) {
    document.documentElement.classList.add('dark');
    el.themeToggle.textContent = '☀️';
  } else {
    el.themeToggle.textContent = '🌙';
  }
}

function toggleTheme() {
  const isDark = document.documentElement.classList.toggle('dark');
  el.themeToggle.textContent = isDark ? '☀️' : '🌙';
}

el.themeToggle.addEventListener('click', toggleTheme);
initTheme();

// =========
// Запуск
// =========
loadQuiz();
