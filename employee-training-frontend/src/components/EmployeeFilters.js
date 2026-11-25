function EmployeeFilters({
  department,
  companyRole,
  onDepartmentChange,
  onCompanyRoleChange,
}) {
  return (
    <div className="employee-filters">
      <label className="filter-field">
        <span>Отдел</span>
        <select value={department} onChange={(event) => onDepartmentChange(event.target.value)}>
          <option value="all">Все отделы</option>
          <option value="отдел1">отдел1</option>
          <option value="отдел2">отдел2</option>
          <option value="отдел3">отдел3</option>
        </select>
      </label>
      <label className="filter-field">
        <span>Роль в компании</span>
        <select value={companyRole} onChange={(event) => onCompanyRoleChange(event.target.value)}>
          <option value="all">Все должности</option>
          <option value="сотрудник">Сотрудник</option>
          <option value="тимлид">Тимлид</option>
        </select>
      </label>
    </div>
  );
}

export default EmployeeFilters;
