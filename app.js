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
  btnStart: document.getElementById('btn-start'),
  btnNext: document.getElementById('btn-next'),
  btnRetry: document.getElementById('btn-retry'),
  btnNewSession: document.getElementById('btn-new-session'),
  themeToggle: document.getElementById('theme-toggle'),
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
};

// =========
// Экраны
// =========
function showScreen(name) {
  el.screenStart.classList.add('hidden');
  el.screenQuestion.classList.add('hidden');
  el.screenResults.classList.add('hidden');
  let target;
  if (name === 'start') {
    target = el.screenStart;
  } else if (name === 'question') {
    target = el.screenQuestion;
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
    if (!data || !Array.isArray(data.questions) || data.questions.length === 0) {
      throw new Error('Некорректная структура JSON: нет массива questions');
    }
    state.allQuestions = data.questions;
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
    options: shuffle(q.options),
  }));
  state.currentIndex = 0;
  state.answers = [];
  state.locked = false;
  el.totalNum.textContent = state.currentPool.length;
  showScreen('question');
  renderQuestion();
}

function getPackQuestions(pack) {
  if (pack === 'original') {
    return state.allQuestions.filter(q => q.type === 'original');
  }
  if (pack === 'additional') {
    return state.allQuestions.filter(q => q.type === 'additional');
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

  // Варианты
  clearChildren(el.optionsList);
  q.options.forEach(optText => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.textContent = optText;
    btn.addEventListener('click', () => handleAnswer(optText, btn));
    el.optionsList.appendChild(btn);
  });

  // Сброс note и «Дальше»
  el.noteBlock.classList.add('hidden');
  el.noteBlock.textContent = '';
  el.btnNext.classList.add('hidden');
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
  el.scoreCorrect.textContent = correct;
  el.scoreTotal.textContent = total;

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
  const questions = getPackQuestions(selected);
  if (questions.length === 0) {
    console.warn('Пустая пачка');
    return;
  }
  startSession(questions);
});

el.btnNext.addEventListener('click', nextQuestion);
el.btnRetry.addEventListener('click', retryMistakes);
el.btnNewSession.addEventListener('click', () => showScreen('start'));

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
