import { useState } from 'react';
import Icon from './Icon';
import EmployeeFilters from './EmployeeFilters';
import { request } from '../utils/api';

function CreatorCourseList({ courses, employees, onAssigned }) {
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [department, setDepartment] = useState('all');
  const [companyRole, setCompanyRole] = useState('all');
  const [assignmentBusy, setAssignmentBusy] = useState(false);
  const [assignmentError, setAssignmentError] = useState('');
  const filteredEmployees = employees.filter((employee) => (
    (department === 'all' || employee.department === department)
    && (companyRole === 'all' || employee.companyRole === companyRole)
  ));

  function openAssignment(course) {
    setSelectedCourse(course);
    setSelectedEmployeeId('');
    setDepartment('all');
    setCompanyRole('all');
    setAssignmentError('');
  }

  async function assignCourse() {
    if (!selectedCourse || !selectedEmployeeId) return;
    setAssignmentBusy(true);
    setAssignmentError('');
    try {
      await request(`/courses/${selectedCourse.id}/assign`, {
        method: 'POST',
        body: JSON.stringify({ employeeId: selectedEmployeeId }),
      });
      await onAssigned();
      setSelectedCourse(null);
    } catch (error) {
      setAssignmentError(error.message);
    } finally {
      setAssignmentBusy(false);
    }
  }

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
            <div className="course-actions">
              {course.status === 'published'
                ? <button type="button" className="button button-quiet assign-course-button" onClick={() => openAssignment(course)}><Icon name="plus" size={15} /> Назначить сотрудника</button>
                : <span className="course-not-published">Опубликуйте курс, чтобы назначить</span>}
            </div>
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
      {selectedCourse && <div className="dialog-backdrop" onMouseDown={(event) => {
        if (event.target === event.currentTarget && !assignmentBusy) setSelectedCourse(null);
      }}>
        <section className="assignment-dialog" role="dialog" aria-modal="true" aria-labelledby="assignment-dialog-title">
          <div className="assignment-dialog-heading">
            <div><div className="eyebrow">НАЗНАЧЕНИЕ ОБУЧЕНИЯ</div><h2 id="assignment-dialog-title">{selectedCourse.title}</h2></div>
            <button type="button" className="icon-button" onClick={() => setSelectedCourse(null)} disabled={assignmentBusy} aria-label="Закрыть">×</button>
          </div>
          <p className="assignment-dialog-copy">Выберите сотрудника, которому назначить курс.</p>
          <EmployeeFilters
            department={department}
            companyRole={companyRole}
            onDepartmentChange={setDepartment}
            onCompanyRoleChange={setCompanyRole}
          />
          <div className="assignment-employee-list">
            {filteredEmployees.length ? filteredEmployees.map((employee) => (
              <label className={`assignment-employee-option ${selectedEmployeeId === employee.id ? 'selected' : ''}`} key={employee.id}>
                <input
                  type="radio"
                  name="course-employee"
                  checked={selectedEmployeeId === employee.id}
                  onChange={() => setSelectedEmployeeId(employee.id)}
                />
                <span className="assignment-employee-copy"><b>{employee.name}</b><small>{employee.department} · {employee.companyRole}</small></span>
              </label>
            )) : <p className="assignment-empty">По выбранным фильтрам сотрудников нет.</p>}
          </div>
          {assignmentError && <div className="inline-error" role="alert">{assignmentError}</div>}
          <div className="assignment-dialog-footer">
            <button type="button" className="button button-quiet" onClick={() => setSelectedCourse(null)} disabled={assignmentBusy}>Отмена</button>
            <button type="button" className="button button-primary" onClick={assignCourse} disabled={assignmentBusy || !selectedEmployeeId}>
              {assignmentBusy ? 'Назначаем…' : 'Назначить курс'} <Icon name="arrow" size={16} />
            </button>
          </div>
        </section>
      </div>}
    </div>
  );
}

export default CreatorCourseList;
