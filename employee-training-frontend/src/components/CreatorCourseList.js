import Icon from './Icon';

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
                <span className="result-person"><b>{employee.name}</b><small>{employee.answered_count || 0}/{employee.question_count || 0} ответов · тест {employee.latest_score == null ? '—' : `${employee.latest_score}%`}</small></span>
                <span className={`result-state ${employee.status === 'completed' ? 'done' : ''}`}>{employee.status === 'completed' ? 'Готово' : 'В процессе'}</span>
              </div>
            )) : <div className="not-assigned">Курс ещё не назначен</div>}
          </div>
        </article>
      ))}
    </div>
  );
}

export default CreatorCourseList;
