import { useState } from 'react';
import Icon from './Icon';
import CreatorCourseList from './CreatorCourseList';
import CourseBuilder from './CourseBuilder';
import SkillManager from './SkillManager';
import StatCard from './StatCard';

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
        <button className={tab === 'overview' ? 'tab active' : 'tab'} onClick={() => setTab('overview')} type="button">Список курсов <span className="tab-count">{courses.length}</span></button>
        <button className={tab === 'create' ? 'tab active' : 'tab'} onClick={() => setTab('create')} type="button">Конструктор курса</button>
        <button className={tab === 'skills' ? 'tab active' : 'tab'} onClick={() => setTab('skills')} type="button">Навыки <span className="tab-count">{dashboard.skills?.length || 0}</span></button>
      </div>

      {tab === 'create' ? (
        <CourseBuilder dashboard={dashboard} onComplete={async () => { await refresh(); setTab('overview'); setNotice('Курс опубликован'); }} />
      ) : tab === 'skills' ? (
        <SkillManager dashboard={dashboard} refresh={refresh} setNotice={setNotice} />
      ) : (
        <CreatorCourseList
          courses={courses}
          employees={dashboard.employees || []}
          onAssigned={async () => { await refresh(); setNotice('Курс назначен сотруднику'); }}
        />
      )}
    </div>
  );
}

export default CreatorDashboard;
