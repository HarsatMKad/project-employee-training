import { useState } from 'react';
import Icon from './Icon';

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

export default Login;
