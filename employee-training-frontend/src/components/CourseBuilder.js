import { useState } from 'react';
import Icon from './Icon';
import { request } from '../utils/api';
import { MAX_ANSWER_OPTIONS, MAX_QUESTIONS } from '../utils/courseLimits';

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

export default CourseBuilder;
