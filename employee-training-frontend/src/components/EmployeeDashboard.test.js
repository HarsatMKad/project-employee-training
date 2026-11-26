import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import EmployeeDashboard from './EmployeeDashboard';

test('overall progress counts completed courses, not saved quiz answers', () => {
  const dashboard = {
    courses: [
      {
        id: 'in-progress',
        title: 'Курс в процессе',
        enrollment_status: 'in_progress',
        question_count: 2,
        answered_count: 2,
      },
      {
        id: 'completed',
        title: 'Завершенный курс',
        enrollment_status: 'completed',
        question_count: 4,
        answered_count: 0,
      },
    ],
    skills: [],
  };
  const { container } = render(
    <EmployeeDashboard
      dashboard={dashboard}
      refresh={jest.fn()}
      setNotice={jest.fn()}
    />,
  );

  expect(screen.getByText('Общий прогресс по курсам')).toBeInTheDocument();
  expect(screen.getByText('50%')).toBeInTheDocument();
  expect(container.querySelector('.summary-progress .progress-track span').style.width)
    .toBe('50%');
});
