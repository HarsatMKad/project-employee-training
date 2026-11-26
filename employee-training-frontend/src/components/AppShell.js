import Icon from './Icon';

function AppShell({ user, activeWorkspace, onWorkspaceChange, onLogout, children }) {
  const isCreator = user.role === 'creator';
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark"><Icon name="layers" size={22} /></div><span>Рост<span className="brand-dot">.</span></span></div>
        <div className="workspace-switch"><span className="workspace-avatar">ДК</span><span><b>Демо-компания</b><small>Рабочее пространство</small></span><span className="switch-chevron">⌄</span></div>
        <div className="side-label">РАБОЧЕЕ МЕСТО</div>
        {isCreator ? <>
          <button
            type="button"
            className={`side-nav-item ${activeWorkspace === 'overview' ? 'active' : ''}`}
            onClick={() => onWorkspaceChange('overview')}
            aria-current={activeWorkspace === 'overview' ? 'page' : undefined}
            aria-label="Обзор обучения"
            title="Обзор обучения"
          ><Icon name="chart" size={18} /><span>Обзор обучения</span></button>
          <button
            type="button"
            className={`side-nav-item ${activeWorkspace === 'employees' ? 'active' : ''}`}
            onClick={() => onWorkspaceChange('employees')}
            aria-current={activeWorkspace === 'employees' ? 'page' : undefined}
            aria-label="Сотрудники"
            title="Сотрудники"
          ><Icon name="users" size={18} /><span>Сотрудники</span></button>
        </> : <div className="side-nav-item active"><Icon name="book" size={18} /><span>Моё обучение</span></div>}
        <div className="sidebar-bottom">
          <div className="sidebar-note"><div className="note-icon"><Icon name="spark" size={17} /></div><b>Растём вместе</b><p>Изучайте материалы в своём темпе, а тест покажет результат.</p></div>
          <button type="button" className="user-menu" onClick={onLogout}>
            <span className="user-avatar">{user.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span>
            <span className="user-copy"><b>{user.name}</b><small>{isCreator ? 'Создатель курсов' : 'Сотрудник'}</small></span>
            <span className="logout-icon"><Icon name="logout" size={17} /></span>
          </button>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb">Платформа <span>/</span> <b>{isCreator ? activeWorkspace === 'employees' ? 'Сотрудники' : 'Обзор' : 'Моё обучение'}</b></div>
          <div className="topbar-right"><span className="status-dot" /> Демо-режим <span className="topbar-divider" /><span className="topbar-date">{new Intl.DateTimeFormat('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date())}</span></div>
        </header>
        {children}
      </main>
    </div>
  );
}

export default AppShell;
