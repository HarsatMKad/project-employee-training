import { useState } from 'react';
import { formatDate } from '../utils/formatDate';
import EmployeeFilters from './EmployeeFilters';
import Icon from './Icon';

function EmployeeDirectory({ employees }) {
  const [department, setDepartment] = useState('all');
  const [companyRole, setCompanyRole] = useState('all');
  const filteredEmployees = employees.filter((employee) => (
    (department === 'all' || employee.department === department)
    && (companyRole === 'all' || employee.companyRole === companyRole)
  ));

  return (
    <div className="page-content">
      <div className="welcome-row">
        <div>
          <div className="eyebrow">КОМАНДА ДЕМО-КОМПАНИИ</div>
          <h1>Сотрудники</h1>
          <p>Просматривайте отделы, должности и подтвержденные навыки команды.</p>
        </div>
      </div>

      <EmployeeFilters
        department={department}
        companyRole={companyRole}
        onDepartmentChange={setDepartment}
        onCompanyRoleChange={setCompanyRole}
      />

      {filteredEmployees.length ? (
        <div className="employee-directory-list">
          {filteredEmployees.map((employee) => (
            <article className="employee-directory-card" key={employee.id}>
              <div className="employee-directory-heading">
                <span className="employee-directory-avatar">
                  {employee.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}
                </span>
                <div className="employee-directory-person">
                  <h2>{employee.name}</h2>
                  <span>{employee.email}</span>
                </div>
                <div className="employee-directory-tags">
                  <span className="department-tag">{employee.department}</span>
                  <span className={`company-role-tag ${employee.companyRole === 'тимлид' ? 'team-lead' : ''}`}>
                    {employee.companyRole}
                  </span>
                </div>
              </div>
              <div className="employee-directory-skills">
                <h3><Icon name="spark" size={15} /> Подтвержденные навыки</h3>
                {employee.skills?.length ? (
                  <div className="employee-confirmed-skills">
                    {employee.skills.map((skill) => (
                      <span className="employee-confirmed-skill" key={skill.id}>
                        <b>{skill.name}</b>
                        <small>Подтвержден · {formatDate(skill.confirmedAt)}</small>
                      </span>
                    ))}
                  </div>
                ) : <p className="employee-no-skills">Пока нет подтвержденных навыков</p>}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-card employee-directory-empty">
          <div className="empty-illustration"><Icon name="users" size={27} /></div>
          <h3>Сотрудники не найдены</h3>
          <p>Измените фильтры, чтобы увидеть сотрудников.</p>
        </div>
      )}
    </div>
  );
}

export default EmployeeDirectory;
