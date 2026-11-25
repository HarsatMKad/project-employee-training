import { useCallback, useEffect, useState } from 'react';
import AppShell from './components/AppShell';
import CreatorDashboard from './components/CreatorDashboard';
import EmployeeDashboard from './components/EmployeeDashboard';
import Icon from './components/Icon';
import Login from './components/Login';
import { request } from './utils/api';

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
