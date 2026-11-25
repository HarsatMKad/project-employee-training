import { useCallback, useEffect, useState } from 'react';

const API = '/api/v1';
const MAX_QUESTIONS = 40;
const MAX_ANSWER_OPTIONS = 8;

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    credentials: 'include',
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }
  if (!response.ok) {
    const message = Array.isArray(data.message)
      ? data.message.join(', ')
      : data.message || 'Не удалось выполнить запрос';
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return data;
}

function Icon({ name, size = 20 }) {
  const paths = {
    book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" /></>,
    layers: <><path d="m12 2 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5M3 17l9 5 9-5" /></>,
    chart: <><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-5 5" /></>,
    check: <><path d="m5 12 4 4L19 6" /></>,
    arrow: <><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    play: <><path d="m7 4 13 8-13 8V4Z" /></>,
    lock: <><rect width="14" height="11" x="5" y="11" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
    spark: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z" /><path d="m19 14 1 2.5 2.5 1-2.5 1L19 21l-1-2.5-2.5-1 2.5-1L19 14Z" /></>,
    logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5M21 12H9" /></>,
  };
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name] || paths.spark}
    </svg>
  );
}

function formatDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(value));
}

function Login({ onLogin, busy, error }) {
  const [email, setEmail] = useState('hr@demo.local');
  const [password, setPassword] = useState('Demo123!');

  return (
    <main className="login-page">
      <div className="login-story">
        <div className="brand brand-light">
          <div className="brand-mark"><Icon name="layers" size={23} /></div>
          <span>Рост<span className="brand-dot">.</span></span>
        </div>
        <div className="story-copy">
          <div className="eyebrow eyebrow-light"><span className="eyebrow-line" /> ОБУЧЕНИЕ, КОТОРОЕ ДВИГАЕТ ВПЕРЁД</div>
          <h1>Знания команды<br />становятся её<br /><em>силой.</em></h1>
          <p>Понятный путь от первого урока до навыка, который можно применить в работе.</p>
        </div>
        <div className="story-foot">
          <div className="avatar-stack"><span>АС</span><span>ИП</span><span>+</span></div>
          <span>Развивайте потенциал команды</span>
        </div>
        <div className="story-orbit orbit-one" />
        <div className="story-orbit orbit-two" />
      </div>

      <div className="login-side">
        <div className="login-card">
          <div className="mobile-brand brand">
            <div className="brand-mark"><Icon name="layers" size={22} /></div>
            <span>Рост<span className="brand-dot">.</span></span>
          </div>
          <div className="eyebrow">ДЕМО-ПЛАТФОРМА</div>
          <h2>С возвращением</h2>
          <p className="login-subtitle">Войдите, чтобы продолжить обучение</p>

          <div className="role-picker" aria-label="Выберите демо-профиль">
            <button
              type="button"
              className={email === 'hr@demo.local' ? 'role-option active' : 'role-option'}
              onClick={() => setEmail('hr@demo.local')}
            >
              <span className="role-option-icon"><Icon name="chart" size={17} /></span>
              <span>Создатель</span>
            </button>
            <button
              type="button"
              className={email === 'employee@demo.local' ? 'role-option active' : 'role-option'}
              onClick={() => setEmail('employee@demo.local')}
            >
              <span className="role-option-icon"><Icon name="book" size={17} /></span>
              <span>Сотрудник</span>
            </button>
          </div>

          <form className="login-form" onSubmit={(event) => {
            event.preventDefault();
            onLogin(email, password);
          }}>
            <label htmlFor="login-email">Рабочая почта</label>
            <input id="login-email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required />
            <label htmlFor="login-password">Пароль</label>
            <input id="login-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            {error && <div className="inline-error" role="alert">{error}</div>}
            <button className="button button-primary login-submit" type="submit" disabled={busy}>
              {busy ? 'Входим…' : 'Войти в систему'} <Icon name="arrow" size={18} />
            </button>
          </form>
          <div className="demo-hint"><Icon name="spark" size={17} /><span>Демо-пароль уже заполнен. Выберите профиль выше.</span></div>
        </div>
        <div className="login-legal">Локальная демонстрационная версия · Демо-компания</div>
      </div>
    </main>
  );
}

function AppShell({ user, onLogout, children }) {
  const isCreator = user.role === 'creator';
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark"><Icon name="layers" size={22} /></div><span>Рост<span className="brand-dot">.</span></span></div>
        <div className="workspace-switch"><span className="workspace-avatar">ДК</span><span><b>Демо-компания</b><small>Рабочее пространство</small></span><span className="switch-chevron">⌄</span></div>
        <div className="side-label">РАБОЧЕЕ МЕСТО</div>
        <div className="side-nav-item active"><Icon name={isCreator ? 'chart' : 'book'} size={18} /><span>{isCreator ? 'Обзор обучения' : 'Моё обучение'}</span></div>
        <div className="sidebar-bottom">
          <div className="sidebar-note"><div className="note-icon"><Icon name="spark" size={17} /></div><b>Растём вместе</b><p>Каждый пройденный урок — ещё один шаг к новым возможностям.</p></div>
          <button type="button" className="user-menu" onClick={onLogout}>
            <span className="user-avatar">{user.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span>
            <span className="user-copy"><b>{user.name}</b><small>{isCreator ? 'Создатель курсов' : 'Сотрудник'}</small></span>
            <span className="logout-icon"><Icon name="logout" size={17} /></span>
          </button>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb">Платформа <span>/</span> <b>{isCreator ? 'Обзор' : 'Моё обучение'}</b></div>
          <div className="topbar-right"><span className="status-dot" /> Демо-режим <span className="topbar-divider" /><span className="topbar-date">{new Intl.DateTimeFormat('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date())}</span></div>
        </header>
        {children}
      </main>
    </div>
  );
}

function CreatorDashboard({ dashboard, refresh, setNotice }) {
  const [tab, setTab] = useState('overview');
  const courses = dashboard.courses || [];
  const publishedCount = courses.filter((course) => course.status === 'published').length;
  const assignedCount = courses.reduce((sum, course) => sum + Number(course.enrollment_count || 0), 0);
  const completedCount = courses.reduce((sum, course) => sum + (course.employees || []).filter((employee) => employee.status === 'completed').length, 0);

  return (
    <div className="page-content">
      <div className="welcome-row">
        <div>
          <div className="eyebrow">НОВЫЕ ВОЗМОЖНОСТИ ДЛЯ КОМАНДЫ</div>
          <h1>Добрый день, Анна <span className="wave">✦</span></h1>
          <p>Создавайте обучение, которое помогает команде расти.</p>
        </div>
        <button className="button button-primary" type="button" onClick={() => setTab('create')}><Icon name="plus" size={18} /> Создать курс</button>
      </div>

      <div className="stats-grid">
        <StatCard label="Опубликовано курсов" value={publishedCount} note="В вашей компании" icon="book" tone="blue" />
        <StatCard label="Назначено обучений" value={assignedCount} note="Сотрудникам команды" icon="layers" tone="violet" />
        <StatCard label="Завершено" value={completedCount} note={assignedCount ? `${Math.round((completedCount / assignedCount) * 100)}% от назначенных` : 'Первые результаты уже скоро'} icon="check" tone="green" />
      </div>

      <div className="section-tabs">
        <button className={tab === 'overview' ? 'tab active' : 'tab'} onClick={() => setTab('overview')} type="button">Мои курсы <span className="tab-count">{courses.length}</span></button>
        <button className={tab === 'create' ? 'tab active' : 'tab'} onClick={() => setTab('create')} type="button">Конструктор курса</button>
        <button className={tab === 'skills' ? 'tab active' : 'tab'} onClick={() => setTab('skills')} type="button">Навыки <span className="tab-count">{dashboard.skills?.length || 0}</span></button>
      </div>

      {tab === 'create' ? (
        <CourseBuilder dashboard={dashboard} onComplete={async () => { await refresh(); setTab('overview'); setNotice('Курс опубликован и назначен сотруднику'); }} />
      ) : tab === 'skills' ? (
        <SkillManager dashboard={dashboard} refresh={refresh} setNotice={setNotice} />
      ) : (
        <CreatorCourseList courses={courses} />
      )}
    </div>
  );
}

function SkillManager({ dashboard, refresh, setNotice }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function createSkill(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await request('/skills', {
        method: 'POST',
        body: JSON.stringify({ name, description }),
      });
      setName('');
      setDescription('');
      await refresh();
      setNotice('Навык добавлен в каталог');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteSkill(skill) {
    const confirmed = window.confirm(
      `Удалить навык «${skill.name}»? Он будет снят с курсов и удалён из профилей сотрудников.`,
    );
    if (!confirmed) return;

    setError('');
    setBusy(true);
    try {
      await request(`/skills/${skill.id}`, { method: 'DELETE' });
      await refresh();
      setNotice('Навык удалён');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  const skills = dashboard.skills || [];

  return (
    <section className="skill-manager">
      <div className="skill-manager-heading">
        <div>
          <div className="eyebrow">КОМПЕТЕНЦИИ КОМАНДЫ</div>
          <h2>Каталог навыков</h2>
          <p>Связывайте навыки с курсами, чтобы подтверждать их после обучения.</p>
        </div>
        <span className="skill-manager-count">{skills.length} {skills.length === 1 ? 'навык' : 'навыков'}</span>
      </div>

      <form className="skill-create-form" onSubmit={createSkill}>
        <div className="skill-create-title"><span className="section-number"><Icon name="plus" size={16} /></span><div><h3>Добавить навык</h3><p>Новый навык сразу появится в конструкторе курсов.</p></div></div>
        <div className="skill-create-fields">
          <label className="field">Название навыка<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Например, Работа с возражениями" maxLength={100} required /></label>
          <label className="field">Краткое описание<textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Что сотрудник сможет делать?" rows={2} maxLength={500} /></label>
        </div>
        {error && <div className="inline-error" role="alert">{error}</div>}
        <button className="button button-primary" type="submit" disabled={busy}><Icon name="plus" size={16} />{busy ? 'Сохраняем…' : 'Добавить навык'}</button>
      </form>

      <div className="skill-manager-list">
        <div className="skill-manager-list-heading"><h3>Навыки организации</h3><span>{skills.length}</span></div>
        {skills.length ? skills.map((skill) => (
          <article className="managed-skill" key={skill.id}>
            <div className="skill-symbol"><Icon name="spark" size={18} /></div>
            <div className="managed-skill-copy"><b>{skill.name}</b><p>{skill.description || 'Описание не добавлено'}</p></div>
            <button type="button" className="delete-skill-button" onClick={() => deleteSkill(skill)} disabled={busy} aria-label={`Удалить навык ${skill.name}`}>Удалить</button>
          </article>
        )) : <div className="skill-manager-empty">Каталог пока пуст. Добавьте первый навык.</div>}
      </div>
    </section>
  );
}

function StatCard({ label, value, note, icon, tone }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${tone}`}><Icon name={icon} size={19} /></div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-note">{note}</div>
      <div className={`stat-decoration ${tone}`} />
    </div>
  );
}

function CreatorCourseList({ courses }) {
  if (!courses.length) {
    return <div className="empty-card">
      <div className="empty-illustration"><Icon name="book" size={30} /></div>
      <h3>Здесь появятся ваши курсы</h3>
      <p>Создайте первый курс, добавьте урок и короткий тест, чтобы запустить обучение.</p>
    </div>;
  }
  return (
    <div className="course-list">
      {courses.map((course, index) => (
        <article className="creator-course-card" key={course.id}>
          <div className={`course-cover cover-${index % 4}`}><Icon name="book" size={25} /><span>0{index + 1}</span></div>
          <div className="creator-course-body">
            <div className="course-title-line"><h3>{course.title}</h3><span className={`badge ${course.status === 'published' ? 'badge-published' : 'badge-draft'}`}>{course.status === 'published' ? 'Опубликован' : 'Черновик'}</span></div>
            <p>{course.description || 'Внутренний учебный курс'}</p>
            <div className="course-meta"><span><Icon name="layers" size={15} />{course.skill_name || 'Навык не выбран'}</span><span><Icon name="play" size={14} />{course.enrollment_count || 0} назначено</span></div>
          </div>
          <div className="course-results">
            {(course.employees || []).length ? course.employees.map((employee) => (
              <div className="employee-result" key={employee.id}>
                <span className="mini-avatar">{employee.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span>
                <span className="result-person"><b>{employee.name}</b><small>{employee.completed_count || 0}/{employee.lesson_count || 0} уроков · тест {employee.latest_score == null ? '—' : `${employee.latest_score}%`}</small></span>
                <span className={`result-state ${employee.status === 'completed' ? 'done' : ''}`}>{employee.status === 'completed' ? 'Готово' : 'В процессе'}</span>
              </div>
            )) : <div className="not-assigned">Курс ещё не назначен</div>}
          </div>
        </article>
      ))}
    </div>
  );
}

function CourseBuilder({ dashboard, onComplete }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [skillIds, setSkillIds] = useState([]);
  const [skillsOpen, setSkillsOpen] = useState(false);
  const [passingScore, setPassingScore] = useState(70);
  const [lessons, setLessons] = useState([{ title: 'Введение', content: '', videoUrl: '' }]);
  const [questions, setQuestions] = useState([{ prompt: '', options: ['', ''], correctOptionIndex: 0 }]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const updateLesson = (index, key, value) => setLessons((items) => items.map((item, current) => current === index ? { ...item, [key]: value } : item));
  const updateQuestion = (index, patch) => setQuestions((items) => items.map((item, current) => current === index ? { ...item, ...patch } : item));
  const removeOption = (questionIndex, optionIndex) => setQuestions((items) => items.map((item, current) => {
    if (current !== questionIndex || item.options.length <= 2) return item;
    const options = item.options.filter((_, index) => index !== optionIndex);
    const correctOptionIndex = item.correctOptionIndex === optionIndex
      ? Math.min(optionIndex, options.length - 1)
      : item.correctOptionIndex > optionIndex
        ? item.correctOptionIndex - 1
        : item.correctOptionIndex;
    return { ...item, options, correctOptionIndex };
  }));
  const addQuestion = () => setQuestions((items) => items.length >= MAX_QUESTIONS
    ? items
    : [...items, { prompt: '', options: ['', ''], correctOptionIndex: 0 }]);
  const toggleSkill = (skillId) => setSkillIds((selected) => selected.includes(skillId)
    ? selected.filter((id) => id !== skillId)
    : [...selected, skillId]);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const created = await request('/courses', {
        method: 'POST',
        body: JSON.stringify({
          title,
          description,
          skillIds,
          passingScore: Number(passingScore),
          lessons,
          questions,
        }),
      });
      await request(`/courses/${created.id}/publish`, { method: 'POST' });
      const employeeId = dashboard.employees?.[0]?.id;
      if (!employeeId) throw new Error('В демо-компании нет сотрудника для назначения');
      await request(`/courses/${created.id}/assign`, {
        method: 'POST',
        body: JSON.stringify({ employeeId }),
      });
      await onComplete();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="builder-card" onSubmit={submit}>
      <div className="builder-heading"><div><div className="eyebrow">НОВЫЙ МАТЕРИАЛ</div><h2>Конструктор курса</h2><p>Соберите короткий путь от знания к подтверждённому навыку.</p></div><div className="builder-step"><span>01</span> ОСНОВНОЕ</div></div>
      <div className="form-grid">
        <label className="field field-wide">Название курса<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Например, Основы клиентского сервиса" required maxLength={120} /></label>
        <label className="field field-wide">Краткое описание<textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Чему научится сотрудник после прохождения курса?" rows={2} maxLength={500} /></label>
        <div className="field skill-select-field"><span>Навыки для подтверждения</span>
          <button type="button" className="skill-select-trigger" onClick={() => setSkillsOpen((open) => !open)} aria-expanded={skillsOpen}>
            <span>{skillIds.length ? `${skillIds.length} выбрано` : 'Выберите навыки'}</span><span className="select-chevron">⌄</span>
          </button>
          {skillsOpen && <div className="skill-dropdown" role="group" aria-label="Выберите навыки курса">
            {(dashboard.skills || []).length ? dashboard.skills.map((skill) => <label className="skill-checkbox-option" key={skill.id}>
              <input type="checkbox" checked={skillIds.includes(skill.id)} onChange={() => toggleSkill(skill.id)} />
              <b>{skill.name}</b>
            </label>) : <div className="skill-dropdown-empty">Сначала добавьте навык во вкладке «Навыки».</div>}
          </div>}
          {skillIds.length > 0 && <div className="selected-skill-list">{dashboard.skills.filter((skill) => skillIds.includes(skill.id)).map((skill) => <span className="selected-skill-chip" key={skill.id}>{skill.name}</span>)}</div>}
        </div>
        <label className="field">Порог прохождения теста<input type="number" min="0" max="100" value={passingScore} onChange={(event) => setPassingScore(event.target.value)} required /><small>Процент правильных ответов</small></label>
      </div>

      <div className="builder-section-title"><span className="section-number">1</span><div><h3>Уроки курса</h3><p>Текстовый материал и необязательная ссылка на видео</p></div></div>
      <div className="builder-items">
        {lessons.map((lesson, index) => (
          <div className="lesson-editor" key={`lesson-${index}`}>
            <div className="item-index">УРОК {String(index + 1).padStart(2, '0')}</div>
            <label className="field">Название<input value={lesson.title} onChange={(event) => updateLesson(index, 'title', event.target.value)} required maxLength={120} /></label>
            <label className="field">Содержание<textarea value={lesson.content} onChange={(event) => updateLesson(index, 'content', event.target.value)} rows={4} placeholder="Ключевые правила, инструкции и примеры…" required /></label>
            <label className="field">Ссылка на видео <span className="optional">необязательно</span><input type="url" value={lesson.videoUrl} onChange={(event) => updateLesson(index, 'videoUrl', event.target.value)} placeholder="https://…" /></label>
            {lessons.length > 1 && <button className="remove-link" type="button" onClick={() => setLessons((items) => items.filter((_, current) => current !== index))}>Убрать урок</button>}
          </div>
        ))}
        <button className="button button-quiet" type="button" onClick={() => setLessons((items) => [...items, { title: '', content: '', videoUrl: '' }])}><Icon name="plus" size={17} /> Добавить урок</button>
      </div>

      <div className="builder-section-title quiz-heading"><span className="section-number violet-number">2</span><div><h3>Проверка знаний</h3><p>Добавьте вопросы с вариантами ответа</p></div></div>
      <div className="builder-items">
        {questions.map((question, index) => (
          <div className="question-editor" key={`question-${index}`}>
            <div className="question-title-row"><div className="item-index">ВОПРОС {String(index + 1).padStart(2, '0')}</div>{questions.length > 1 && <button className="remove-link" type="button" onClick={() => setQuestions((items) => items.filter((_, current) => current !== index))}>Убрать</button>}</div>
            <label className="field">Формулировка<input value={question.prompt} onChange={(event) => updateQuestion(index, { prompt: event.target.value })} placeholder="Что должен знать сотрудник?" required maxLength={300} /></label>
            <div className="answer-options">
              {question.options.map((option, optionIndex) => (
                <div className="answer-option" key={`option-${optionIndex}`}>
                  <input type="radio" name={`correct-${index}`} checked={question.correctOptionIndex === optionIndex} onChange={() => updateQuestion(index, { correctOptionIndex: optionIndex })} aria-label={`Правильный ответ ${optionIndex + 1}`} />
                  <input type="text" value={option} onChange={(event) => updateQuestion(index, { options: question.options.map((item, current) => current === optionIndex ? event.target.value : item) })} placeholder={`Вариант ${optionIndex + 1}`} required />
                  {question.options.length > 2 && <button className="remove-link answer-option-remove" type="button" onClick={() => removeOption(index, optionIndex)} aria-label={`Убрать вариант ${optionIndex + 1}`}>Убрать</button>}
                </div>
              ))}
            </div>
            <button className="text-button" type="button" onClick={() => updateQuestion(index, { options: [...question.options, ''] })} disabled={question.options.length >= MAX_ANSWER_OPTIONS}><Icon name="plus" size={15} /> {question.options.length >= MAX_ANSWER_OPTIONS ? 'Максимум 8 вариантов' : 'Добавить вариант'}</button>
          </div>
        ))}
        <button className="button button-quiet" type="button" onClick={addQuestion} disabled={questions.length >= MAX_QUESTIONS}><Icon name="plus" size={17} /> {questions.length >= MAX_QUESTIONS ? 'Достигнут лимит (40)' : 'Добавить вопрос'}</button>
      </div>
      {error && <div className="inline-error builder-error" role="alert">{error}</div>}
      <div className="builder-footer"><span><Icon name="lock" size={16} /> Курс будет назначен Ивану Петрову</span><button className="button button-primary" type="submit" disabled={busy}>{busy ? 'Публикуем…' : 'Опубликовать и назначить'} <Icon name="arrow" size={17} /></button></div>
    </form>
  );
}

function EmployeeDashboard({ dashboard, refresh, setNotice }) {
  const [selectedId, setSelectedId] = useState('');
  const [course, setCourse] = useState(null);
  const [loadingCourse, setLoadingCourse] = useState(false);
  const [answers, setAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);
  const [error, setError] = useState('');
  const courses = dashboard.courses || [];
  const completed = courses.filter((item) => item.enrollment_status === 'completed').length;
  const totalLessons = courses.reduce((sum, item) => sum + Number(item.lesson_count || 0), 0);
  const completedLessons = courses.reduce((sum, item) => sum + Number(item.completed_count || 0), 0);

  const openCourse = useCallback(async (id) => {
    setSelectedId(id);
    setLoadingCourse(true);
    setError('');
    setQuizResult(null);
    setAnswers({});
    try {
      setCourse(await request(`/courses/${id}`));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoadingCourse(false);
    }
  }, []);

  async function completeLesson(lessonId) {
    try {
      await request(`/courses/${course.id}/lessons/${lessonId}/complete`, { method: 'POST' });
      await Promise.all([openCourse(course.id), refresh()]);
      setNotice('Урок отмечен как пройденный');
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function submitQuiz(event) {
    event.preventDefault();
    setError('');
    try {
      const result = await request(`/courses/${course.id}/submit`, {
        method: 'POST',
        body: JSON.stringify({ answers }),
      });
      await Promise.all([openCourse(course.id), refresh()]);
      setQuizResult(result);
      if (result.passed && result.enrollmentStatus === 'completed') {
        setNotice('Курс завершён — навык подтверждён');
      }
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  const progress = (item) => item.lesson_count
    ? Math.round((Number(item.completed_count || 0) / item.lesson_count) * 100)
    : 0;

  return (
    <div className="page-content employee-page">
      <div className="welcome-row employee-welcome">
        <div>
          <div className="eyebrow">ВАШ ПУТЬ РАЗВИТИЯ</div>
          <h1>Добрый день, Иван <span className="wave">✦</span></h1>
          <p>Новые навыки начинаются с одного урока. Продолжайте в своём темпе.</p>
        </div>
        <div className="learning-streak"><span className="streak-icon">✳</span><span><b>Ваш прогресс</b><small>{completedLessons} из {totalLessons} уроков завершено</small></span></div>
      </div>

      <div className="employee-summary">
        <div className="summary-main"><div className="summary-icon"><Icon name="book" size={20} /></div><div><span>МОЁ ОБУЧЕНИЕ</span><b>{completed} <small>из</small> {courses.length} <small>курсов завершено</small></b></div></div>
        <div className="summary-progress"><div className="progress-caption"><span>Общий прогресс</span><b>{totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0}%</b></div><div className="progress-track"><span style={{ width: `${totalLessons ? (completedLessons / totalLessons) * 100 : 0}%` }} /></div></div>
        <div className="summary-decoration"><Icon name="spark" size={32} /></div>
      </div>

      <div className="employee-content-grid">
        <section className="learning-section">
          <div className="section-heading"><div><div className="eyebrow">ВАША ПРОГРАММА</div><h2>Назначенные курсы</h2></div><span className="muted-count">{courses.length} курса</span></div>
          {courses.length ? <div className="learner-course-list">{courses.map((item, index) => (
            <button className={`learner-course-card ${selectedId === item.id ? 'selected' : ''}`} type="button" onClick={() => openCourse(item.id)} key={item.id}>
              <div className={`learner-cover learner-cover-${index % 4}`}><Icon name="book" size={22} /></div>
              <div className="learner-course-info"><div className="course-title-line"><h3>{item.title}</h3>{item.enrollment_status === 'completed' && <span className="completed-check"><Icon name="check" size={14} /></span>}</div><p>{item.skill_name || 'Обучение для вашей команды'}</p><div className="learner-progress-line"><div className="progress-track"><span style={{ width: `${progress(item)}%` }} /></div><small>{item.completed_count || 0}/{item.lesson_count || 0} уроков</small></div></div>
              <span className="course-open"><Icon name="arrow" size={18} /></span>
            </button>
          ))}</div> : <div className="empty-card learner-empty"><div className="empty-illustration"><Icon name="book" size={28} /></div><h3>Пока нет назначенных курсов</h3><p>Когда создатель назначит вам обучение, оно появится здесь.</p></div>}

          {selectedId && <section className="course-detail-card">
            {loadingCourse ? <div className="loading-inline">Загружаем курс…</div> : course && <>
              <div className="detail-heading"><div><div className="eyebrow">ВАШ УЧЕБНЫЙ МАРШРУТ</div><h2>{course.title}</h2><p>{course.description}</p></div><button className="icon-button" type="button" onClick={() => { setSelectedId(''); setCourse(null); }} aria-label="Закрыть курс">×</button></div>
              <div className="detail-lessons">{course.lessons.map((lesson, index) => (
                <div className={`lesson-row ${lesson.completed ? 'lesson-done' : ''}`} key={lesson.id}>
                  <span className="lesson-number">{lesson.completed ? <Icon name="check" size={16} /> : String(index + 1).padStart(2, '0')}</span>
                  <div className="lesson-copy"><b>{lesson.title}</b><p>{lesson.content}</p>{lesson.videoUrl && <a href={lesson.videoUrl} target="_blank" rel="noreferrer" className="video-link"><Icon name="play" size={14} /> Смотреть видео</a>}</div>
                  <button className={lesson.completed ? 'lesson-action completed-action' : 'lesson-action'} type="button" onClick={() => completeLesson(lesson.id)} disabled={lesson.completed}>{lesson.completed ? 'Пройдено' : 'Завершить'}</button>
                </div>
              ))}</div>
              <form className="quiz-card" onSubmit={submitQuiz}>
                <div className="quiz-card-heading"><div className="quiz-icon"><Icon name="check" size={18} /></div><div><h3>Проверка знаний</h3><p>Нужно набрать не менее {course.passingScore}%</p></div></div>
                {course.lessons.some((lesson) => !lesson.completed) && <div className="quiz-locked"><Icon name="lock" size={16} /> Сначала завершите все уроки, затем откроется тест.</div>}
                {course.questions.map((question, index) => (
                  <fieldset className="quiz-question" key={question.id} disabled={course.lessons.some((lesson) => !lesson.completed)}>
                    <legend>{String(index + 1).padStart(2, '0')} / {question.prompt}</legend>
                    {question.options.map((option, optionIndex) => <label className="quiz-choice" key={`${question.id}-${optionIndex}`}><input type="radio" name={question.id} checked={answers[question.id] === optionIndex} onChange={() => setAnswers((current) => ({ ...current, [question.id]: optionIndex }))} required /><span>{option}</span></label>)}
                  </fieldset>
                ))}
                {quizResult && <div className={quizResult.passed ? 'quiz-result passed' : 'quiz-result failed'}>{quizResult.passed ? 'Отлично! Тест пройден.' : 'Пока не получилось — попробуйте ещё раз.'}<b>{quizResult.score}%</b></div>}
                {error && <div className="inline-error" role="alert">{error}</div>}
                <button className="button button-primary" type="submit" disabled={course.lessons.some((lesson) => !lesson.completed)}>{quizResult?.passed ? 'Пройти тест ещё раз' : 'Проверить ответы'} <Icon name="arrow" size={16} /></button>
              </form>
            </>}
          </section>}
        </section>
        <aside className="skills-panel">
          <div className="section-heading"><div><div className="eyebrow">ВАШ РОСТ</div><h2>Мои навыки</h2></div><span className="skill-count">{(dashboard.skills || []).length}</span></div>
          {(dashboard.skills || []).length ? <div className="skill-list">{dashboard.skills.map((skill) => <div className="skill-card" key={skill.id}><div className="skill-symbol"><Icon name="spark" size={18} /></div><div><b>{skill.name}</b><p>Подтверждён · {formatDate(skill.confirmed_at)}</p><small>{skill.source}</small></div></div>)}</div> : <div className="skill-empty"><div className="skill-empty-icon"><Icon name="spark" size={20} /></div><b>Навыки появятся здесь</b><p>Завершите назначенный курс и успешно пройдите тест, чтобы подтвердить первый навык.</p></div>}
          <div className="skill-tip"><div className="tip-mark">✦</div><p><b>Маленький шаг — большой рост</b><br />Каждое обучение открывает новые возможности в команде.</p></div>
        </aside>
      </div>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [notice, setNotice] = useState('');
  const [dashboardError, setDashboardError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const data = await request('/dashboard');
      setDashboard(data);
      setDashboardError('');
    } catch (error) {
      setDashboardError(error.message);
      throw error;
    }
  }, []);

  useEffect(() => {
    request('/auth/session')
      .then(async (data) => {
        setUser(data.user);
        if (data.user) {
          const dashboardData = await request('/dashboard');
          setDashboard(dashboardData);
        }
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(''), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  async function login(email, password) {
    setLoginBusy(true);
    setLoginError('');
    try {
      const data = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setUser(data.user);
      setDashboard(await request('/dashboard'));
    } catch (error) {
      setLoginError(error.message);
    } finally {
      setLoginBusy(false);
    }
  }

  async function logout() {
    await request('/auth/logout', { method: 'POST' });
    setUser(null);
    setDashboard(null);
  }

  if (loading) return <div className="app-loading"><div className="loading-mark"><Icon name="layers" size={24} /></div><span>Подготавливаем рабочее пространство</span></div>;
  if (!user) return <Login onLogin={login} busy={loginBusy} error={loginError} />;
  if (!dashboard) return <div className="app-loading"><div className="loading-mark"><Icon name="layers" size={24} /></div><span>{dashboardError || 'Загружаем обучение…'}</span><button type="button" className="text-button" onClick={() => refresh()}>Повторить</button></div>;

  return <AppShell user={user} onLogout={logout}>
    {user.role === 'creator'
      ? <CreatorDashboard dashboard={dashboard} refresh={refresh} setNotice={setNotice} />
      : <EmployeeDashboard dashboard={dashboard} refresh={refresh} setNotice={setNotice} />}
    {notice && <div className="toast"><span className="toast-check"><Icon name="check" size={16} /></span>{notice}</div>}
  </AppShell>;
}

export default App;
