import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  DatabaseExecutor,
  DatabaseRow,
  DatabaseService,
} from '../database/database.service.js';
import { AuthUser } from '../security/security.js';

const MAX_QUESTIONS = 40;
const MAX_ANSWER_OPTIONS = 8;

interface CourseRecord extends DatabaseRow {
  id: string;
  organization_id: string;
  skill_id: string | null;
  title: string;
  description: string;
  passing_score: number;
  status: 'draft' | 'published';
  skill_name?: string | null;
  enrollment_id?: string | null;
  enrollment_status?: string | null;
  question_count?: number;
  answered_count?: number;
  latest_score?: number | null;
}

interface LessonRecord extends DatabaseRow {
  id: string;
  title: string;
  content: string;
  video_url: string | null;
  position: number;
  completed_at?: string | null;
}

interface QuestionRecord extends DatabaseRow {
  id: string;
  prompt: string;
  options_json: string;
  correct_option_index: number;
  position: number;
}

interface EnrollmentRecord extends DatabaseRow {
  id: string;
  status: string;
}

interface SkillRecord extends DatabaseRow {
  id: string;
  name: string;
  description: string;
}

interface EmployeeRecord {
  id: string;
  name: string;
  email: string;
  department: string;
  companyRole: string;
  skills: Array<{ id: string; name: string; confirmedAt: string }>;
}

interface EmployeeSkillRow extends DatabaseRow {
  id: string;
  name: string;
  email: string;
  department: string;
  company_role: string;
  skill_id: string | null;
  skill_name: string | null;
  confirmed_at: string | null;
}

interface LessonInput {
  title: string;
  content: string;
  videoUrl: string | null;
}

interface QuestionInput {
  prompt: string;
  options: string[];
  correctOptionIndex: number;
}

interface CourseInput {
  title: string;
  description: string;
  skillIds: string[];
  passingScore: number;
  lessons: LessonInput[];
  questions: QuestionInput[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseCourseInput(value: unknown): CourseInput {
  if (!isRecord(value))
    throw new BadRequestException('Некорректные данные курса');
  const { title, description, passingScore, lessons, questions } = value;
  const skillIdsValue = value.skillIds;
  const legacySkillId = value.skillId;
  if (typeof title !== 'string' || !title.trim()) {
    throw new BadRequestException('Укажите название курса');
  }
  if (typeof description !== 'string') {
    throw new BadRequestException('Описание курса должно быть текстом');
  }
  if (
    typeof passingScore !== 'number' ||
    !Number.isInteger(passingScore) ||
    passingScore < 0 ||
    passingScore > 100
  ) {
    throw new BadRequestException('Порог прохождения должен быть от 0 до 100');
  }
  if (
    skillIdsValue !== undefined &&
    (!Array.isArray(skillIdsValue) ||
      skillIdsValue.some((skillId) => typeof skillId !== 'string'))
  ) {
    throw new BadRequestException('Проверьте выбранные навыки курса');
  }
  if (
    skillIdsValue === undefined &&
    legacySkillId !== null &&
    legacySkillId !== undefined &&
    typeof legacySkillId !== 'string'
  ) {
    throw new BadRequestException('Проверьте выбранные навыки курса');
  }
  if (!Array.isArray(lessons) || lessons.length === 0) {
    throw new BadRequestException('Добавьте хотя бы один урок');
  }

  const parsedLessons = lessons.map((lesson): LessonInput => {
    if (
      !isRecord(lesson) ||
      typeof lesson.title !== 'string' ||
      !lesson.title.trim() ||
      typeof lesson.content !== 'string' ||
      !lesson.content.trim() ||
      (lesson.videoUrl !== undefined &&
        lesson.videoUrl !== null &&
        typeof lesson.videoUrl !== 'string')
    ) {
      throw new BadRequestException('Проверьте название и содержание уроков');
    }
    let videoUrl: string | null = null;
    if (typeof lesson.videoUrl === 'string' && lesson.videoUrl.trim()) {
      try {
        const parsedUrl = new URL(lesson.videoUrl);
        if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
          throw new Error('Unsupported protocol');
        }
        videoUrl = parsedUrl.toString();
      } catch {
        throw new BadRequestException(
          'Ссылка на видео должна начинаться с http:// или https://',
        );
      }
    }

    return {
      title: lesson.title.trim(),
      content: lesson.content,
      videoUrl,
    };
  });

  if (!Array.isArray(questions) || questions.length === 0) {
    throw new BadRequestException('Добавьте хотя бы один вопрос к тесту');
  }
  if (questions.length > MAX_QUESTIONS) {
    throw new BadRequestException(
      `В тесте может быть не больше ${MAX_QUESTIONS} вопросов`,
    );
  }
  const parsedQuestions = questions.map((question): QuestionInput => {
    if (
      !isRecord(question) ||
      typeof question.prompt !== 'string' ||
      !question.prompt.trim() ||
      !Array.isArray(question.options) ||
      question.options.length < 2 ||
      question.options.length > MAX_ANSWER_OPTIONS ||
      question.options.some(
        (option) => typeof option !== 'string' || !option.trim(),
      ) ||
      typeof question.correctOptionIndex !== 'number' ||
      !Number.isInteger(question.correctOptionIndex) ||
      question.correctOptionIndex < 0 ||
      question.correctOptionIndex >= question.options.length
    ) {
      throw new BadRequestException('Проверьте вопросы и варианты ответов');
    }
    return {
      prompt: question.prompt.trim(),
      options: question.options.map((option: string) => option.trim()),
      correctOptionIndex: question.correctOptionIndex,
    };
  });

  return {
    title: title.trim(),
    description: description.trim(),
    skillIds: [
      ...new Set(
        Array.isArray(skillIdsValue)
          ? (skillIdsValue as string[])
          : typeof legacySkillId === 'string'
            ? [legacySkillId]
            : [],
      ),
    ],
    passingScore,
    lessons: parsedLessons,
    questions: parsedQuestions,
  };
}

@Injectable()
export class CoursesService {
  constructor(private readonly database: DatabaseService) {}

  async listSkills(user: AuthUser): Promise<SkillRecord[]> {
    return this.database.all<SkillRecord>(
      `SELECT id, name, description FROM skills
       WHERE organization_id = ? ORDER BY name`,
      [user.organizationId],
    );
  }

  async createSkill(
    user: AuthUser,
    body: unknown,
  ): Promise<{ id: string; name: string; description: string }> {
    if (!isRecord(body) || typeof body.name !== 'string' || !body.name.trim()) {
      throw new BadRequestException('Укажите название навыка');
    }
    if (
      body.description !== undefined &&
      typeof body.description !== 'string'
    ) {
      throw new BadRequestException('Описание навыка должно быть текстом');
    }

    const name = body.name.trim();
    const description =
      typeof body.description === 'string' ? body.description.trim() : '';
    if (name.length > 100 || description.length > 500) {
      throw new BadRequestException(
        'Название или описание навыка слишком длинное',
      );
    }
    const normalizedName = name.toLocaleLowerCase('ru-RU');
    const existing = (
      await this.database.all<SkillRecord>(
        'SELECT id, name, description FROM skills WHERE organization_id = ?',
        [user.organizationId],
      )
    ).some((skill) => skill.name.toLocaleLowerCase('ru-RU') === normalizedName);
    if (existing)
      throw new ConflictException('Навык с таким названием уже есть');

    const id = randomUUID();
    await this.database.run(
      `INSERT INTO skills (id, organization_id, name, description)
       VALUES (?, ?, ?, ?)`,
      [id, user.organizationId, name, description],
    );
    return { id, name, description };
  }

  async deleteSkill(
    user: AuthUser,
    skillId: string,
  ): Promise<{ success: true }> {
    const skill = await this.database.get(
      'SELECT id FROM skills WHERE id = ? AND organization_id = ?',
      [skillId, user.organizationId],
    );
    if (!skill) throw new NotFoundException('Навык не найден');

    await this.database.transaction(async (transaction) => {
      await transaction.run(
        'UPDATE courses SET skill_id = NULL WHERE organization_id = ? AND skill_id = ?',
        [user.organizationId, skillId],
      );
      await transaction.run(
        'DELETE FROM user_skills WHERE organization_id = ? AND skill_id = ?',
        [user.organizationId, skillId],
      );
      await transaction.run(
        `DELETE FROM course_skills
         WHERE skill_id = ? AND course_id IN (
           SELECT id FROM courses WHERE organization_id = ?
         )`,
        [skillId, user.organizationId],
      );
      await transaction.run(
        'DELETE FROM skills WHERE id = ? AND organization_id = ?',
        [skillId, user.organizationId],
      );
    });
    return { success: true };
  }

  async listEmployees(user: AuthUser): Promise<EmployeeRecord[]> {
    const rows = await this.database.all<EmployeeSkillRow>(
      `SELECT u.id, u.name, u.email, u.department, u.company_role,
              s.id AS skill_id, s.name AS skill_name, us.confirmed_at
       FROM users u
       LEFT JOIN user_skills us
         ON us.user_id = u.id AND us.organization_id = u.organization_id
         AND us.status = 'confirmed'
       LEFT JOIN skills s ON s.id = us.skill_id
         AND s.organization_id = us.organization_id
       WHERE u.organization_id = ? AND u.role = 'employee'
       ORDER BY u.name, s.name`,
      [user.organizationId],
    );
    const employees = new Map<string, EmployeeRecord>();
    rows.forEach((row) => {
      let employee = employees.get(row.id);
      if (!employee) {
        employee = {
          id: row.id,
          name: row.name,
          email: row.email,
          department: row.department,
          companyRole: row.company_role,
          skills: [],
        };
        employees.set(row.id, employee);
      }
      if (row.skill_id && row.skill_name && row.confirmed_at) {
        employee.skills.push({
          id: row.skill_id,
          name: row.skill_name,
          confirmedAt: row.confirmed_at,
        });
      }
    });
    return [...employees.values()];
  }

  async listCourses(user: AuthUser): Promise<CourseRecord[]> {
    if (user.role === 'creator') {
      return this.database.all<CourseRecord>(
        `SELECT c.id, c.title, c.description, c.status, c.passing_score,
                (SELECT string_agg(s.name, ', ' ORDER BY s.name) FROM course_skills cs
                 JOIN skills s ON s.id = cs.skill_id
                 WHERE cs.course_id = c.id) AS skill_name,
                (SELECT COUNT(*)::integer FROM enrollments e WHERE e.course_id = c.id) AS enrollment_count
         FROM courses c
         WHERE c.organization_id = ?
         ORDER BY c.created_at DESC`,
        [user.organizationId],
      );
    }

    return this.database.all<CourseRecord>(
      `SELECT c.id, c.title, c.description, c.status, c.passing_score,
              (SELECT string_agg(s.name, ', ' ORDER BY s.name) FROM course_skills cs
               JOIN skills s ON s.id = cs.skill_id
               WHERE cs.course_id = c.id) AS skill_name,
              e.id AS enrollment_id, e.status AS enrollment_status,
              (SELECT COUNT(*)::integer FROM quiz_questions q
               WHERE q.course_id = c.id) AS question_count,
              CASE WHEN e.status = 'completed' THEN
                (SELECT COUNT(*)::integer FROM quiz_questions q
                 WHERE q.course_id = c.id)
              ELSE
                (SELECT COUNT(*)::integer FROM quiz_progress qp
                 WHERE qp.enrollment_id = e.id)
              END AS answered_count,
              (SELECT score FROM quiz_attempts qa
               WHERE qa.enrollment_id = e.id
               ORDER BY qa.submitted_at DESC, qa.attempt_order DESC LIMIT 1) AS latest_score
       FROM enrollments e
       JOIN courses c ON c.id = e.course_id
       WHERE e.user_id = ? AND c.organization_id = ? AND c.status = 'published'
       ORDER BY e.assigned_at DESC`,
      [user.id, user.organizationId],
    );
  }

  async createCourse(
    user: AuthUser,
    body: unknown,
  ): Promise<{ id: string; status: string }> {
    const input = parseCourseInput(body);
    if (input.skillIds.length) {
      const placeholders = input.skillIds.map(() => '?').join(', ');
      const skillCount = await this.database.get<DatabaseRow>(
        `SELECT COUNT(*) AS count FROM skills
         WHERE organization_id = ? AND id IN (${placeholders})`,
        [user.organizationId, ...input.skillIds],
      );
      if (Number(skillCount?.count ?? 0) !== input.skillIds.length) {
        throw new BadRequestException('Один или несколько навыков не найдены');
      }
    }

    const courseId = randomUUID();
    await this.database.transaction(async (transaction) => {
      await transaction.run(
        `INSERT INTO courses
         (id, organization_id, creator_id, skill_id, title, description, passing_score, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?)`,
        [
          courseId,
          user.organizationId,
          user.id,
          input.skillIds[0] ?? null,
          input.title,
          input.description,
          input.passingScore,
          new Date().toISOString(),
        ],
      );
      for (const skillId of input.skillIds) {
        await transaction.run(
          'INSERT INTO course_skills (course_id, skill_id) VALUES (?, ?)',
          [courseId, skillId],
        );
      }
      for (const [position, lesson] of input.lessons.entries()) {
        await transaction.run(
          `INSERT INTO lessons (id, course_id, title, content, video_url, position)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            randomUUID(),
            courseId,
            lesson.title,
            lesson.content,
            lesson.videoUrl,
            position,
          ],
        );
      }
      for (const [position, question] of input.questions.entries()) {
        await transaction.run(
          `INSERT INTO quiz_questions
           (id, course_id, prompt, options_json, correct_option_index, position)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            randomUUID(),
            courseId,
            question.prompt,
            JSON.stringify(question.options),
            question.correctOptionIndex,
            position,
          ],
        );
      }
    });

    return { id: courseId, status: 'draft' };
  }

  async publishCourse(
    user: AuthUser,
    courseId: string,
  ): Promise<{ id: string; status: string }> {
    const course = await this.getOrganizationCourse(user, courseId);
    if (course.status === 'draft') {
      await this.database.run(
        "UPDATE courses SET status = 'published' WHERE id = ?",
        [courseId],
      );
    }
    return { id: courseId, status: 'published' };
  }

  async assignCourse(
    user: AuthUser,
    courseId: string,
    employeeId: unknown,
  ): Promise<{ enrollmentId: string; status: string }> {
    if (typeof employeeId !== 'string' || !employeeId) {
      throw new BadRequestException('Выберите сотрудника');
    }
    const course = await this.getOrganizationCourse(user, courseId);
    if (course.status !== 'published') {
      throw new BadRequestException('Сначала опубликуйте курс');
    }
    const employee = await this.database.get(
      `SELECT id FROM users
       WHERE id = ? AND organization_id = ? AND role = 'employee'`,
      [employeeId, user.organizationId],
    );
    if (!employee) throw new NotFoundException('Сотрудник не найден');

    const existing = await this.database.get<EnrollmentRecord>(
      'SELECT id, status FROM enrollments WHERE course_id = ? AND user_id = ?',
      [courseId, employeeId],
    );
    if (existing) return { enrollmentId: existing.id, status: existing.status };

    const enrollmentId = randomUUID();
    await this.database.run(
      `INSERT INTO enrollments (id, course_id, user_id, assigned_by, assigned_at)
       VALUES (?, ?, ?, ?, ?)`,
      [enrollmentId, courseId, employeeId, user.id, new Date().toISOString()],
    );
    return { enrollmentId, status: 'in_progress' };
  }

  async getCourse(
    user: AuthUser,
    courseId: string,
  ): Promise<Record<string, unknown>> {
    const course = await this.getOrganizationCourse(user, courseId);
    let enrollment: EnrollmentRecord | undefined;
    if (user.role === 'employee') {
      enrollment = await this.database.get<EnrollmentRecord>(
        'SELECT id, status FROM enrollments WHERE course_id = ? AND user_id = ?',
        [courseId, user.id],
      );
      if (!enrollment || course.status !== 'published') {
        throw new NotFoundException('Назначенный курс не найден');
      }
    }

    const lessons = await this.database.all<LessonRecord>(
      `SELECT l.id, l.title, l.content, l.video_url, l.position,
              lp.completed_at
       FROM lessons l
       LEFT JOIN lesson_progress lp
         ON lp.lesson_id = l.id AND lp.enrollment_id = ?
       WHERE l.course_id = ? ORDER BY l.position`,
      [enrollment?.id ?? null, courseId],
    );
    const questions = await this.database.all<QuestionRecord>(
      `SELECT id, prompt, options_json, position
       FROM quiz_questions WHERE course_id = ? ORDER BY position`,
      [courseId],
    );
    const latestAttempt = enrollment
      ? await this.database.get<DatabaseRow>(
          `SELECT score, passed, submitted_at, answers_json FROM quiz_attempts
           WHERE enrollment_id = ? ORDER BY submitted_at DESC, attempt_order DESC LIMIT 1`,
          [enrollment.id],
        )
      : undefined;
    const savedAnswers = enrollment
      ? await this.database.all<DatabaseRow>(
          `SELECT question_id, selected_option_index FROM quiz_progress
           WHERE enrollment_id = ?`,
          [enrollment.id],
        )
      : [];
    const answers: Record<string, number> = {};
    if (latestAttempt?.answers_json) {
      const previousAnswers: unknown = JSON.parse(
        String(latestAttempt.answers_json),
      );
      if (isRecord(previousAnswers)) {
        Object.entries(previousAnswers).forEach(([questionId, optionIndex]) => {
          if (typeof optionIndex === 'number')
            answers[questionId] = optionIndex;
        });
      }
    }
    savedAnswers.forEach((answer) => {
      answers[String(answer.question_id)] = Number(
        answer.selected_option_index,
      );
    });

    return {
      id: course.id,
      title: course.title,
      description: course.description,
      status: course.status,
      passingScore: course.passing_score,
      skillId: course.skill_id,
      skillIds: (
        await this.database.all<DatabaseRow>(
          'SELECT skill_id FROM course_skills WHERE course_id = ?',
          [courseId],
        )
      ).map((row) => String(row.skill_id)),
      lessons: lessons.map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        content: lesson.content,
        videoUrl: lesson.video_url,
        studied: Boolean(lesson.completed_at),
      })),
      questions: questions.map((question) => ({
        id: question.id,
        prompt: question.prompt,
        options: JSON.parse(question.options_json) as string[],
      })),
      answers,
      enrollment: enrollment
        ? {
            id: enrollment.id,
            status: enrollment.status,
            latestAttempt: latestAttempt
              ? {
                  score: latestAttempt.score,
                  passed: Boolean(latestAttempt.passed),
                  submittedAt: latestAttempt.submitted_at,
                }
              : null,
          }
        : null,
    };
  }

  async setLessonStudied(
    user: AuthUser,
    courseId: string,
    lessonId: string,
    studied: unknown,
  ): Promise<{ studied: boolean }> {
    if (typeof studied !== 'boolean') {
      throw new BadRequestException(
        'Передайте отметку о прохождении материала',
      );
    }
    const enrollment = await this.getEnrollment(user, courseId);
    const lesson = await this.database.get(
      'SELECT id FROM lessons WHERE id = ? AND course_id = ?',
      [lessonId, courseId],
    );
    if (!lesson) throw new NotFoundException('Урок не найден');

    if (studied) {
      await this.database.run(
        `INSERT INTO lesson_progress (id, enrollment_id, lesson_id, completed_at)
         VALUES (?, ?, ?, ?) ON CONFLICT (enrollment_id, lesson_id) DO NOTHING`,
        [randomUUID(), enrollment.id, lessonId, new Date().toISOString()],
      );
    } else {
      await this.database.run(
        'DELETE FROM lesson_progress WHERE enrollment_id = ? AND lesson_id = ?',
        [enrollment.id, lessonId],
      );
    }
    return { studied };
  }

  async saveQuizAnswer(
    user: AuthUser,
    courseId: string,
    questionId: unknown,
    optionIndex: unknown,
  ): Promise<{ answeredCount: number; questionCount: number }> {
    const enrollment = await this.getEnrollment(user, courseId);
    if (
      typeof questionId !== 'string' ||
      typeof optionIndex !== 'number' ||
      !Number.isInteger(optionIndex)
    ) {
      throw new BadRequestException('Выберите вариант ответа');
    }
    const question = await this.database.get<QuestionRecord>(
      `SELECT id, options_json FROM quiz_questions
       WHERE id = ? AND course_id = ?`,
      [questionId, courseId],
    );
    if (!question) throw new NotFoundException('Вопрос не найден');
    const options = JSON.parse(question.options_json) as string[];
    if (optionIndex < 0 || optionIndex >= options.length) {
      throw new BadRequestException('Выберите допустимый вариант ответа');
    }

    await this.database.run(
      `INSERT INTO quiz_progress
       (enrollment_id, question_id, selected_option_index, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT (enrollment_id, question_id) DO UPDATE SET
         selected_option_index = excluded.selected_option_index,
         updated_at = excluded.updated_at`,
      [enrollment.id, questionId, optionIndex, new Date().toISOString()],
    );
    const progress = await this.database.get<DatabaseRow>(
      `SELECT
         (SELECT COUNT(*)::integer FROM quiz_questions WHERE course_id = ?) AS question_count,
         (SELECT COUNT(*)::integer FROM quiz_progress WHERE enrollment_id = ?) AS answered_count`,
      [courseId, enrollment.id],
    );
    return {
      answeredCount: Number(progress?.answered_count ?? 0),
      questionCount: Number(progress?.question_count ?? 0),
    };
  }

  async submitQuiz(
    user: AuthUser,
    courseId: string,
    answersValue: unknown,
  ): Promise<{
    score: number;
    passed: boolean;
    passingScore: number;
    enrollmentStatus: string;
  }> {
    const enrollment = await this.getEnrollment(user, courseId);
    if (!isRecord(answersValue)) {
      throw new BadRequestException('Передайте ответы на тест');
    }
    const questions = await this.database.all<QuestionRecord>(
      `SELECT id, options_json, correct_option_index FROM quiz_questions
       WHERE course_id = ? ORDER BY position`,
      [courseId],
    );
    if (questions.length === 0)
      throw new BadRequestException('В курсе нет вопросов');
    if (
      questions.some((question) => {
        const answer = answersValue[question.id];
        const options = JSON.parse(question.options_json) as string[];
        return (
          typeof answer !== 'number' ||
          !Number.isInteger(answer) ||
          answer < 0 ||
          answer >= options.length
        );
      })
    ) {
      throw new BadRequestException('Ответьте на все вопросы теста');
    }
    const correctCount = questions.reduce(
      (count, question) =>
        count +
        (answersValue[question.id] === question.correct_option_index ? 1 : 0),
      0,
    );
    const score = Math.round((correctCount / questions.length) * 100);
    const course = await this.getOrganizationCourse(user, courseId);
    const passed = score >= course.passing_score;
    let enrollmentStatus = enrollment.status;
    await this.database.transaction(async (transaction) => {
      for (const question of questions) {
        await transaction.run(
          `INSERT INTO quiz_progress
           (enrollment_id, question_id, selected_option_index, updated_at)
           VALUES (?, ?, ?, ?)
           ON CONFLICT (enrollment_id, question_id) DO UPDATE SET
             selected_option_index = excluded.selected_option_index,
             updated_at = excluded.updated_at`,
          [
            enrollment.id,
            question.id,
            answersValue[question.id] as number,
            new Date().toISOString(),
          ],
        );
      }
      await transaction.run(
        `INSERT INTO quiz_attempts (id, enrollment_id, score, passed, answers_json, submitted_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          randomUUID(),
          enrollment.id,
          score,
          passed ? 1 : 0,
          JSON.stringify(answersValue),
          new Date().toISOString(),
        ],
      );
      enrollmentStatus = await this.updateCompletion(
        user,
        enrollment.id,
        courseId,
        transaction,
      );
    });
    return {
      score,
      passed,
      passingScore: course.passing_score,
      enrollmentStatus,
    };
  }

  async dashboard(user: AuthUser): Promise<Record<string, unknown>> {
    if (user.role === 'employee') {
      const skills = await this.database.all<DatabaseRow>(
        `SELECT s.id, s.name, s.description, us.source, us.confirmed_at
         FROM user_skills us
         JOIN skills s ON s.id = us.skill_id
         WHERE us.user_id = ? AND us.organization_id = ?
         ORDER BY us.confirmed_at DESC`,
        [user.id, user.organizationId],
      );
      return { courses: await this.listCourses(user), skills };
    }

    const courses = await this.listCourses(user);
    const courseDetails: Array<Record<string, unknown>> = [];
    for (const course of courses) {
      const employees = await this.database.all<DatabaseRow>(
        `SELECT u.id, u.name, u.email, e.status,
                (SELECT COUNT(*)::integer FROM quiz_questions q
                 WHERE q.course_id = c.id) AS question_count,
                CASE WHEN e.status = 'completed' THEN
                  (SELECT COUNT(*)::integer FROM quiz_questions q
                   WHERE q.course_id = c.id)
                ELSE
                  (SELECT COUNT(*)::integer FROM quiz_progress qp
                   WHERE qp.enrollment_id = e.id)
                END AS answered_count,
                (SELECT score FROM quiz_attempts qa
                 WHERE qa.enrollment_id = e.id
                 ORDER BY qa.submitted_at DESC, qa.attempt_order DESC LIMIT 1) AS latest_score
         FROM enrollments e
         JOIN users u ON u.id = e.user_id
         JOIN courses c ON c.id = e.course_id
         WHERE e.course_id = ? AND c.organization_id = ?`,
        [course.id, user.organizationId],
      );
      courseDetails.push({ ...course, employees });
    }
    return {
      courses: courseDetails,
      employees: await this.listEmployees(user),
      skills: await this.listSkills(user),
    };
  }

  private async getOrganizationCourse(
    user: AuthUser,
    courseId: string,
    database: DatabaseExecutor = this.database,
  ): Promise<CourseRecord> {
    const course = await database.get<CourseRecord>(
      `SELECT id, organization_id, skill_id, title, description, passing_score, status
       FROM courses WHERE id = ? AND organization_id = ?`,
      [courseId, user.organizationId],
    );
    if (!course) throw new NotFoundException('Курс не найден');
    return course;
  }

  private async getEnrollment(
    user: AuthUser,
    courseId: string,
  ): Promise<EnrollmentRecord> {
    const enrollment = await this.database.get<EnrollmentRecord>(
      `SELECT e.id, e.status FROM enrollments e
       JOIN courses c ON c.id = e.course_id
       WHERE e.course_id = ? AND e.user_id = ? AND c.organization_id = ?
         AND c.status = 'published'`,
      [courseId, user.id, user.organizationId],
    );
    if (!enrollment) throw new NotFoundException('Назначенный курс не найден');
    return enrollment;
  }

  private async updateCompletion(
    user: AuthUser,
    enrollmentId: string,
    courseId: string,
    transaction: DatabaseExecutor,
  ): Promise<string> {
    const latestAttempt = await transaction.get<DatabaseRow>(
      `SELECT passed FROM quiz_attempts
       WHERE enrollment_id = ? ORDER BY submitted_at DESC, attempt_order DESC LIMIT 1`,
      [enrollmentId],
    );
    const course = await this.getOrganizationCourse(
      user,
      courseId,
      transaction,
    );
    const completed = Number(latestAttempt?.passed ?? 0) === 1;

    if (completed) {
      await transaction.run(
        "UPDATE enrollments SET status = 'completed' WHERE id = ?",
        [enrollmentId],
      );
      const linkedSkills = await transaction.all<SkillRecord>(
        `SELECT s.id, s.name, s.description FROM course_skills cs
         JOIN skills s ON s.id = cs.skill_id
         WHERE cs.course_id = ? AND s.organization_id = ?`,
        [courseId, user.organizationId],
      );
      for (const skill of linkedSkills) {
        await transaction.run(
          `INSERT INTO user_skills
           (id, organization_id, user_id, skill_id, status, source, confirmed_at)
           VALUES (?, ?, ?, ?, 'confirmed', ?, ?)
           ON CONFLICT (user_id, skill_id) DO NOTHING`,
          [
            randomUUID(),
            user.organizationId,
            user.id,
            skill.id,
            `Курс: ${course.title}`,
            new Date().toISOString(),
          ],
        );
      }
    }

    const enrollment = await transaction.get<EnrollmentRecord>(
      'SELECT id, status FROM enrollments WHERE id = ?',
      [enrollmentId],
    );
    return enrollment?.status ?? 'in_progress';
  }
}
