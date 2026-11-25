import { useState } from 'react';
import Icon from './Icon';
import { request } from '../utils/api';

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

export default SkillManager;
