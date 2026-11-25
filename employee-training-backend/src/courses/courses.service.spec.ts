import { BadRequestException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { CoursesService } from './courses.service.js';
import type { AuthUser } from '../security/security.js';

describe('course learning workflow', () => {
  let database: DatabaseService;
  let courses: CoursesService;
  const creator: AuthUser = {
    id: 'demo-creator',
    email: 'hr@demo.local',
    name: 'Анна Смирнова',
    role: 'creator',
    organizationId: 'demo-organization',
  };
  const employee: AuthUser = {
    id: 'demo-employee',
    email: 'employee@demo.local',
    name: 'Иван Петров',
    role: 'employee',
    organizationId: 'demo-organization',
  };

  beforeEach(() => {
    database = new DatabaseService(':memory:');
    courses = new CoursesService(database);
  });

  afterEach(() => database.onModuleDestroy());

  it('allows at most forty questions in a course quiz', () => {
    const makeCourse = (questionCount: number) => ({
      title: 'Курс с большим тестом',
      description: '',
      skillIds: [],
      passingScore: 70,
      lessons: [{ title: 'Урок', content: 'Текст урока', videoUrl: null }],
      questions: Array.from({ length: questionCount }, (_, index) => ({
        prompt: `Вопрос ${index + 1}`,
        options: ['Да', 'Нет'],
        correctOptionIndex: 0,
      })),
    });

    expect(courses.createCourse(creator, makeCourse(40))).toMatchObject({
      status: 'draft',
    });
    expect(() => courses.createCourse(creator, makeCourse(41))).toThrow(
      BadRequestException,
    );
  });

  it('allows at most eight answer options per question', () => {
    const makeCourse = (optionCount: number) => ({
      title: 'Курс с вариантами ответа',
      description: '',
      skillIds: [],
      passingScore: 70,
      lessons: [{ title: 'Урок', content: 'Текст урока', videoUrl: null }],
      questions: [{
        prompt: 'Вопрос',
        options: Array.from({ length: optionCount }, (_, index) => `Вариант ${index + 1}`),
        correctOptionIndex: 0,
      }],
    });

    expect(courses.createCourse(creator, makeCourse(8))).toMatchObject({
      status: 'draft',
    });
    expect(() => courses.createCourse(creator, makeCourse(9))).toThrow(
      BadRequestException,
    );
  });

  it('tracks studied lessons separately and completes the course on a passing quiz', () => {
    const additionalSkill = courses.createSkill(creator, {
      name: 'Командная работа',
      description: 'Взаимодействие с командой.',
    });
    expect(() =>
      courses.createSkill(creator, { name: 'командная работа' }),
    ).toThrow(ConflictException);

    const created = courses.createCourse(creator, {
      title: 'Клиентский сервис',
      description: 'Базовые правила общения.',
      skillIds: ['demo-skill', additionalSkill.id],
      passingScore: 70,
      lessons: [
        {
          title: 'Первый контакт',
          content: 'Выслушайте клиента и уточните запрос.',
          videoUrl: null,
        },
      ],
      questions: [
        {
          prompt: 'С чего начать разговор?',
          options: ['С уточнения запроса', 'С продажи продукта'],
          correctOptionIndex: 0,
        },
      ],
    });

    courses.publishCourse(creator, created.id);
    courses.assignCourse(creator, created.id, employee.id);
    const course = courses.getCourse(employee, created.id);
    const lesson = (course.lessons as Array<{ id: string }>)[0];
    const question = (course.questions as Array<{ id: string }>)[0];

    expect(courses.dashboard(employee).skills).toEqual([]);

    expect(courses.setLessonStudied(employee, created.id, lesson.id, true)).toEqual({
      studied: true,
    });
    expect(
      (courses.getCourse(employee, created.id).lessons as Array<{ studied: boolean }>)[0]
        .studied,
    ).toBe(true);
    expect(
      (courses.dashboard(employee).courses as Array<Record<string, unknown>>)[0],
    ).toMatchObject({
      enrollment_status: 'in_progress',
      question_count: 1,
      answered_count: 0,
    });

    expect(courses.setLessonStudied(employee, created.id, lesson.id, false)).toEqual({
      studied: false,
    });
    expect(
      (courses.getCourse(employee, created.id).lessons as Array<{ studied: boolean }>)[0]
        .studied,
    ).toBe(false);

    expect(courses.saveQuizAnswer(employee, created.id, question.id, 1)).toEqual({
      answeredCount: 1,
      questionCount: 1,
    });
    const failedAttempt = courses.submitQuiz(employee, created.id, {
      [question.id]: 1,
    });
    expect(failedAttempt.passed).toBe(false);
    expect(failedAttempt.enrollmentStatus).toBe('in_progress');

    const passedAttempt = courses.submitQuiz(employee, created.id, {
      [question.id]: 0,
    });
    expect(passedAttempt).toMatchObject({
      score: 100,
      passed: true,
      enrollmentStatus: 'completed',
    });
    expect(
      (courses.dashboard(employee).courses as Array<Record<string, unknown>>)[0],
    ).toMatchObject({
      enrollment_status: 'completed',
      question_count: 1,
      answered_count: 1,
    });
    const confirmedSkills = courses.dashboard(employee).skills as unknown[];
    expect(confirmedSkills).toHaveLength(2);
    expect(confirmedSkills).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'demo-skill', name: 'Основы работы с клиентом' }),
      expect.objectContaining({ id: additionalSkill.id, name: 'Командная работа' }),
    ]));

    courses.deleteSkill(creator, additionalSkill.id);
    expect(courses.dashboard(employee).skills).toEqual([
      expect.objectContaining({ id: 'demo-skill', name: 'Основы работы с клиентом' }),
    ]);
    expect(
      (courses.dashboard(creator).courses as Array<{ skill_name: string }>)[0]
        .skill_name,
    ).toBe('Основы работы с клиентом');
  });

  it('does not expose a course to an employee before assignment', () => {
    const created = courses.createCourse(creator, {
      title: 'Без назначения',
      description: '',
      skillIds: [],
      passingScore: 70,
      lessons: [{ title: 'Урок', content: 'Текст урока', videoUrl: null }],
      questions: [
        { prompt: 'Вопрос', options: ['Да', 'Нет'], correctOptionIndex: 0 },
      ],
    });
    courses.publishCourse(creator, created.id);

    expect(() => courses.getCourse(employee, created.id)).toThrow(
      'Назначенный курс не найден',
    );
  });
});
