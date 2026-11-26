import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { PGlite } from '@electric-sql/pglite';
import { createPgConfig } from '@electric-sql/pglite/node-postgres';
import { Pool } from 'pg';
import { AuthService } from '../auth/auth.service.js';
import { DatabaseService } from '../database/database.service.js';
import { CoursesService } from './courses.service.js';
import type { AuthUser } from '../security/security.js';

describe('course learning workflow', () => {
  let database: DatabaseService;
  let courses: CoursesService;
  let postgres: PGlite;
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

  beforeEach(async () => {
    postgres = new PGlite();
    database = new DatabaseService(new Pool(createPgConfig(postgres)));
    await database.initialize();
    courses = new CoursesService(database);
  });

  afterEach(async () => {
    await database.onModuleDestroy();
    await postgres.close();
  });

  it('initializes the PostgreSQL schema and demo data idempotently', async () => {
    await database.initialize();

    expect(
      await database.get('SELECT COUNT(*)::integer AS count FROM users'),
    ).toMatchObject({ count: 8 });
    expect(await courses.listSkills(creator)).toEqual([
      expect.objectContaining({ id: 'demo-skill' }),
    ]);
  });

  it('authenticates seeded demo users asynchronously', async () => {
    const auth = new AuthService(database);

    await expect(
      auth.login('hr@demo.local', 'Demo123!'),
    ).resolves.toMatchObject({
      user: { id: 'demo-creator', role: 'creator' },
      token: expect.any(String),
    });
    await expect(
      auth.login('hr@demo.local', 'wrong-password'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('seeds six employees across the three departments without exposing their skills prematurely', async () => {
    const employees = await courses.listEmployees(creator);
    const seededEmployees = employees.filter((item) => item.id !== employee.id);

    expect(seededEmployees).toHaveLength(6);
    expect(seededEmployees.map((item) => item.department).sort()).toEqual([
      'отдел1',
      'отдел1',
      'отдел2',
      'отдел2',
      'отдел3',
      'отдел3',
    ]);
    expect(seededEmployees.map((item) => item.companyRole).sort()).toEqual([
      'сотрудник',
      'сотрудник',
      'сотрудник',
      'тимлид',
      'тимлид',
      'тимлид',
    ]);
    expect(seededEmployees.every((item) => item.skills.length === 0)).toBe(
      true,
    );

    const course = await courses.createCourse(creator, {
      title: 'Вводный курс',
      description: '',
      skillIds: [],
      passingScore: 70,
      lessons: [{ title: 'Урок', content: 'Материал', videoUrl: null }],
      questions: [
        { prompt: 'Вопрос', options: ['Да', 'Нет'], correctOptionIndex: 0 },
      ],
    });
    await courses.publishCourse(creator, course.id);
    const teamLead = seededEmployees.find(
      (item) => item.companyRole === 'тимлид',
    );
    expect(teamLead).toBeDefined();
    await expect(
      courses.assignCourse(creator, course.id, teamLead?.id),
    ).resolves.toMatchObject({
      status: 'in_progress',
    });
  });

  it('allows at most forty questions in a course quiz', async () => {
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

    await expect(
      courses.createCourse(creator, makeCourse(40)),
    ).resolves.toMatchObject({
      status: 'draft',
    });
    await expect(
      courses.createCourse(creator, makeCourse(41)),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows at most eight answer options per question', async () => {
    const makeCourse = (optionCount: number) => ({
      title: 'Курс с вариантами ответа',
      description: '',
      skillIds: [],
      passingScore: 70,
      lessons: [{ title: 'Урок', content: 'Текст урока', videoUrl: null }],
      questions: [
        {
          prompt: 'Вопрос',
          options: Array.from(
            { length: optionCount },
            (_, index) => `Вариант ${index + 1}`,
          ),
          correctOptionIndex: 0,
        },
      ],
    });

    await expect(
      courses.createCourse(creator, makeCourse(8)),
    ).resolves.toMatchObject({
      status: 'draft',
    });
    await expect(
      courses.createCourse(creator, makeCourse(9)),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('tracks studied lessons separately and completes the course on a passing quiz', async () => {
    const additionalSkill = await courses.createSkill(creator, {
      name: 'Командная работа',
      description: 'Взаимодействие с командой.',
    });
    await expect(
      courses.createSkill(creator, { name: 'командная работа' }),
    ).rejects.toBeInstanceOf(ConflictException);

    const created = await courses.createCourse(creator, {
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

    await courses.publishCourse(creator, created.id);
    await courses.assignCourse(creator, created.id, employee.id);
    const course = await courses.getCourse(employee, created.id);
    const lesson = (course.lessons as Array<{ id: string }>)[0];
    const question = (course.questions as Array<{ id: string }>)[0];

    expect((await courses.dashboard(employee)).skills).toEqual([]);

    await expect(
      courses.setLessonStudied(employee, created.id, lesson.id, true),
    ).resolves.toEqual({
      studied: true,
    });
    expect(
      (
        (await courses.getCourse(employee, created.id)).lessons as Array<{
          studied: boolean;
        }>
      )[0].studied,
    ).toBe(true);
    expect(
      (
        (await courses.dashboard(employee)).courses as Array<
          Record<string, unknown>
        >
      )[0],
    ).toMatchObject({
      enrollment_status: 'in_progress',
      question_count: 1,
      answered_count: 0,
    });

    await expect(
      courses.setLessonStudied(employee, created.id, lesson.id, false),
    ).resolves.toEqual({
      studied: false,
    });
    expect(
      (
        (await courses.getCourse(employee, created.id)).lessons as Array<{
          studied: boolean;
        }>
      )[0].studied,
    ).toBe(false);

    await expect(
      courses.saveQuizAnswer(employee, created.id, question.id, 1),
    ).resolves.toEqual({
      answeredCount: 1,
      questionCount: 1,
    });
    const failedAttempt = await courses.submitQuiz(employee, created.id, {
      [question.id]: 1,
    });
    expect(failedAttempt.passed).toBe(false);
    expect(failedAttempt.enrollmentStatus).toBe('in_progress');

    const passedAttempt = await courses.submitQuiz(employee, created.id, {
      [question.id]: 0,
    });
    expect(passedAttempt).toMatchObject({
      score: 100,
      passed: true,
      enrollmentStatus: 'completed',
    });
    expect(
      (
        (await courses.dashboard(employee)).courses as Array<
          Record<string, unknown>
        >
      )[0],
    ).toMatchObject({
      enrollment_status: 'completed',
      question_count: 1,
      answered_count: 1,
    });
    const confirmedSkills = (await courses.dashboard(employee))
      .skills as unknown[];
    expect(confirmedSkills).toHaveLength(2);
    expect(confirmedSkills).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'demo-skill',
          name: 'Основы работы с клиентом',
        }),
        expect.objectContaining({
          id: additionalSkill.id,
          name: 'Командная работа',
        }),
      ]),
    );
    expect(
      (await courses.listEmployees(creator)).find(
        (item) => item.id === employee.id,
      ),
    ).toMatchObject({
      department: 'отдел1',
      companyRole: 'сотрудник',
      skills: expect.arrayContaining([
        expect.objectContaining({ id: 'demo-skill' }),
        expect.objectContaining({ id: additionalSkill.id }),
      ]),
    });

    await courses.deleteSkill(creator, additionalSkill.id);
    expect((await courses.dashboard(employee)).skills).toEqual([
      expect.objectContaining({
        id: 'demo-skill',
        name: 'Основы работы с клиентом',
      }),
    ]);
    expect(
      (
        (await courses.dashboard(creator)).courses as Array<{
          skill_name: string;
        }>
      )[0].skill_name,
    ).toBe('Основы работы с клиентом');
  });

  it('does not expose a course to an employee before assignment', async () => {
    const created = await courses.createCourse(creator, {
      title: 'Без назначения',
      description: '',
      skillIds: [],
      passingScore: 70,
      lessons: [{ title: 'Урок', content: 'Текст урока', videoUrl: null }],
      questions: [
        { prompt: 'Вопрос', options: ['Да', 'Нет'], correctOptionIndex: 0 },
      ],
    });
    await courses.publishCourse(creator, created.id);

    await expect(courses.getCourse(employee, created.id)).rejects.toThrow(
      'Назначенный курс не найден',
    );
  });
});
