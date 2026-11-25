import { useCallback, useRef, useState } from 'react';
import Icon from './Icon';
import { request } from '../utils/api';
import { formatDate } from '../utils/formatDate';

function EmployeeDashboard({ dashboard, refresh, setNotice }) {
  const [selectedId, setSelectedId] = useState('');
  const [course, setCourse] = useState(null);
  const [loadingCourse, setLoadingCourse] = useState(false);
  const [answers, setAnswers] = useState({});
  const [savingAnswers, setSavingAnswers] = useState(0);
  const [quizResult, setQuizResult] = useState(null);
  const [error, setError] = useState('');
  const answerSaveQueue = useRef(Promise.resolve());
  const courses = dashboard.courses || [];
  const completed = courses.filter((item) => item.enrollment_status === 'completed').length;
  const totalQuestions = courses.reduce((sum, item) => sum + Number(item.question_count || 0), 0);
  const answeredQuestions = courses.reduce((sum, item) => sum + Number(item.answered_count || 0), 0);

  const openCourse = useCallback(async (id) => {
    setSelectedId(id);
    setLoadingCourse(true);
    setError('');
    setQuizResult(null);
    setAnswers({});
    try {
      const loadedCourse = await request(`/courses/${id}`);
      setCourse(loadedCourse);
      setAnswers(loadedCourse.answers || {});
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoadingCourse(false);
    }
  }, []);

  async function setLessonStudied(lessonId, studied) {
    try {
      await request(`/courses/${course.id}/lessons/${lessonId}/study`, {
        method: 'POST',
        body: JSON.stringify({ studied }),
      });
      setCourse((current) => current && ({
        ...current,
        lessons: current.lessons.map((lesson) => lesson.id === lessonId
          ? { ...lesson, studied }
          : lesson),
      }));
      setNotice(studied ? 'Материал отмечен как изученный' : 'Отметка о материале снята');
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function saveQuizAnswer(questionId, optionIndex) {
    setAnswers((current) => ({ ...current, [questionId]: optionIndex }));
    setQuizResult(null);
    setError('');
    setSavingAnswers((count) => count + 1);
    answerSaveQueue.current = answerSaveQueue.current.then(async () => {
      try {
        await request(`/courses/${course.id}/answers`, {
          method: 'POST',
          body: JSON.stringify({ questionId, optionIndex }),
        });
        await refresh();
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setSavingAnswers((count) => Math.max(0, count - 1));
      }
    });
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

  const progress = (item) => item.question_count
    ? Math.round((Number(item.answered_count || 0) / item.question_count) * 100)
    : 0;
  const answeredInQuiz = course
    ? course.questions.filter((question) => answers[question.id] !== undefined).length
    : 0;
  const quizProgress = course?.questions.length
    ? Math.round((answeredInQuiz / course.questions.length) * 100)
    : 0;

  return (
    <div className="page-content employee-page">
      <div className="welcome-row employee-welcome">
        <div>
          <div className="eyebrow">ВАШ ПУТЬ РАЗВИТИЯ</div>
          <h1>Добрый день, Иван <span className="wave">✦</span></h1>
          <p>Изучайте материалы в своём темпе и проходите итоговые тесты.</p>
        </div>
        <div className="learning-streak"><span className="streak-icon">✳</span><span><b>Ваш прогресс</b><small>{answeredQuestions} из {totalQuestions} ответов в тестах</small></span></div>
      </div>

      <div className="employee-summary">
        <div className="summary-main"><div className="summary-icon"><Icon name="book" size={20} /></div><div><span>МОЁ ОБУЧЕНИЕ</span><b>{completed} <small>из</small> {courses.length} <small>курсов завершено</small></b></div></div>
        <div className="summary-progress"><div className="progress-caption"><span>Общий прогресс по тестам</span><b>{totalQuestions ? Math.round((answeredQuestions / totalQuestions) * 100) : 0}%</b></div><div className="progress-track"><span style={{ width: `${totalQuestions ? (answeredQuestions / totalQuestions) * 100 : 0}%` }} /></div></div>
        <div className="summary-decoration"><Icon name="spark" size={32} /></div>
      </div>

      <div className="employee-content-grid">
        <section className="learning-section">
          <div className="section-heading"><div><div className="eyebrow">ВАША ПРОГРАММА</div><h2>Назначенные курсы</h2></div><span className="muted-count">{courses.length} курса</span></div>
          {courses.length ? <div className="learner-course-list">{courses.map((item, index) => (
            <button className={`learner-course-card ${selectedId === item.id ? 'selected' : ''}`} type="button" onClick={() => openCourse(item.id)} key={item.id}>
              <div className={`learner-cover learner-cover-${index % 4}`}><Icon name="book" size={22} /></div>
              <div className="learner-course-info"><div className="course-title-line"><h3>{item.title}</h3>{item.enrollment_status === 'completed' && <span className="completed-check"><Icon name="check" size={14} /></span>}</div><p>{item.skill_name || 'Обучение для вашей команды'}</p><div className="learner-progress-line"><div className="progress-track"><span style={{ width: `${progress(item)}%` }} /></div><small>{item.answered_count || 0}/{item.question_count || 0} ответов</small></div></div>
              <span className="course-open"><Icon name="arrow" size={18} /></span>
            </button>
          ))}</div> : <div className="empty-card learner-empty"><div className="empty-illustration"><Icon name="book" size={28} /></div><h3>Пока нет назначенных курсов</h3><p>Когда создатель назначит вам обучение, оно появится здесь.</p></div>}

          {selectedId && <section className="course-detail-card">
            {loadingCourse ? <div className="loading-inline">Загружаем курс…</div> : course && <>
              <div className="detail-heading"><div><div className="eyebrow">ВАШ УЧЕБНЫЙ МАРШРУТ</div><h2>{course.title}</h2><p>{course.description}</p></div><button className="icon-button" type="button" onClick={() => { setSelectedId(''); setCourse(null); }} aria-label="Закрыть курс">×</button></div>
              <div className="detail-lessons">{course.lessons.map((lesson, index) => (
                <div className={`lesson-row ${lesson.studied ? 'lesson-done' : ''}`} key={lesson.id}>
                  <span className="lesson-number">{lesson.studied ? <Icon name="check" size={16} /> : String(index + 1).padStart(2, '0')}</span>
                  <div className="lesson-copy"><b>{lesson.title}</b><p>{lesson.content}</p>{lesson.videoUrl && <a href={lesson.videoUrl} target="_blank" rel="noreferrer" className="video-link"><Icon name="play" size={14} /> Смотреть видео</a>}</div>
                  <label className="lesson-checkbox"><input type="checkbox" checked={Boolean(lesson.studied)} onChange={(event) => setLessonStudied(lesson.id, event.target.checked)} /><span>Изучено</span></label>
                </div>
              ))}</div>
              <form className="quiz-card" onSubmit={submitQuiz}>
                <div className="quiz-card-heading"><div className="quiz-icon"><Icon name="check" size={18} /></div><div><h3>Проверка знаний</h3><p>Нужно набрать не менее {course.passingScore}%</p></div></div>
                <div className="quiz-progress"><div className="progress-caption"><span>Прогресс теста</span><b>{answeredInQuiz} из {course.questions.length} · {quizProgress}%</b></div><div className="progress-track"><span style={{ width: `${quizProgress}%` }} /></div></div>
                {course.questions.map((question, index) => (
                  <fieldset className="quiz-question" key={question.id}>
                    <legend>{String(index + 1).padStart(2, '0')} / {question.prompt}</legend>
                    {question.options.map((option, optionIndex) => <label className="quiz-choice" key={`${question.id}-${optionIndex}`}><input type="radio" name={question.id} checked={answers[question.id] === optionIndex} onChange={() => saveQuizAnswer(question.id, optionIndex)} required /><span>{option}</span></label>)}
                  </fieldset>
                ))}
                {quizResult && <div className={quizResult.passed ? 'quiz-result passed' : 'quiz-result failed'}>{quizResult.passed ? 'Отлично! Тест пройден.' : 'Пока не получилось — попробуйте ещё раз.'}<b>{quizResult.score}%</b></div>}
                {error && <div className="inline-error" role="alert">{error}</div>}
                <button className="button button-primary" type="submit" disabled={savingAnswers > 0}>{savingAnswers ? 'Сохраняем ответы…' : quizResult?.passed ? 'Пройти тест ещё раз' : 'Проверить ответы'} <Icon name="arrow" size={16} /></button>
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

export default EmployeeDashboard;
