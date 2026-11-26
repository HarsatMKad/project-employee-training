import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { Pool, PoolClient, QueryResultRow } from 'pg';
import { hashPassword } from '../security/security.js';

type DatabaseValue = string | number | boolean | Uint8Array | null | undefined;

export interface DatabaseRow {
  [column: string]: DatabaseValue;
}

export interface DatabaseExecutor {
  get<T extends DatabaseRow>(
    sql: string,
    params?: DatabaseValue[],
  ): Promise<T | undefined>;
  all<T extends DatabaseRow>(
    sql: string,
    params?: DatabaseValue[],
  ): Promise<T[]>;
  run(sql: string, params?: DatabaseValue[]): Promise<void>;
}

function createExecutor(
  query: (
    sql: string,
    params: DatabaseValue[],
  ) => Promise<{ rows: QueryResultRow[] }>,
): DatabaseExecutor {
  const execute = (sql: string, params: DatabaseValue[] = []) => {
    let parameterIndex = 0;
    return query(
      sql.replace(/\?/g, () => `$${++parameterIndex}`),
      params,
    );
  };

  return {
    async get<T extends DatabaseRow>(
      sql: string,
      params: DatabaseValue[] = [],
    ) {
      const result = await execute(sql, params);
      return result.rows[0] as T | undefined;
    },
    async all<T extends DatabaseRow>(
      sql: string,
      params: DatabaseValue[] = [],
    ) {
      const result = await execute(sql, params);
      return result.rows as T[];
    },
    async run(sql: string, params: DatabaseValue[] = []) {
      await execute(sql, params);
    },
  };
}

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly pool: Pool;
  private readonly executor: DatabaseExecutor;

  constructor(pool?: Pool) {
    if (pool) {
      this.pool = pool;
    } else {
      const connectionString = process.env.DATABASE_URL;
      if (!connectionString) {
        throw new Error('DATABASE_URL must be set to connect to PostgreSQL');
      }
      this.pool = new Pool({ connectionString });
    }

    this.executor = createExecutor((sql, params) =>
      this.pool.query(sql, params as DatabaseValue[]),
    );
  }

  async initialize(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL REFERENCES organizations(id),
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('creator', 'employee')),
        department TEXT NOT NULL DEFAULT 'отдел1',
        company_role TEXT NOT NULL DEFAULT 'сотрудник'
      );
      CREATE TABLE IF NOT EXISTS skills (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL REFERENCES organizations(id),
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        UNIQUE (organization_id, name)
      );
      CREATE TABLE IF NOT EXISTS courses (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL REFERENCES organizations(id),
        creator_id TEXT NOT NULL REFERENCES users(id),
        skill_id TEXT REFERENCES skills(id),
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        passing_score INTEGER NOT NULL CHECK (passing_score BETWEEN 0 AND 100),
        status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS course_skills (
        course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
        PRIMARY KEY (course_id, skill_id)
      );
      CREATE TABLE IF NOT EXISTS lessons (
        id TEXT PRIMARY KEY,
        course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        video_url TEXT,
        position INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS quiz_questions (
        id TEXT PRIMARY KEY,
        course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        prompt TEXT NOT NULL,
        options_json TEXT NOT NULL,
        correct_option_index INTEGER NOT NULL,
        position INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS enrollments (
        id TEXT PRIMARY KEY,
        course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id),
        assigned_by TEXT NOT NULL REFERENCES users(id),
        status TEXT NOT NULL DEFAULT 'in_progress'
          CHECK (status IN ('in_progress', 'completed')),
        assigned_at TEXT NOT NULL,
        UNIQUE (course_id, user_id)
      );
      CREATE TABLE IF NOT EXISTS lesson_progress (
        id TEXT PRIMARY KEY,
        enrollment_id TEXT NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
        lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
        completed_at TEXT NOT NULL,
        UNIQUE (enrollment_id, lesson_id)
      );
      CREATE TABLE IF NOT EXISTS quiz_attempts (
        id TEXT PRIMARY KEY,
        attempt_order BIGINT GENERATED ALWAYS AS IDENTITY,
        enrollment_id TEXT NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
        score INTEGER NOT NULL,
        passed INTEGER NOT NULL,
        answers_json TEXT NOT NULL,
        submitted_at TEXT NOT NULL
      );
      ALTER TABLE quiz_attempts
        ADD COLUMN IF NOT EXISTS attempt_order BIGINT GENERATED ALWAYS AS IDENTITY;
      CREATE UNIQUE INDEX IF NOT EXISTS quiz_attempts_attempt_order_idx
        ON quiz_attempts (attempt_order);
      CREATE TABLE IF NOT EXISTS quiz_progress (
        enrollment_id TEXT NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
        question_id TEXT NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
        selected_option_index INTEGER NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (enrollment_id, question_id)
      );
      CREATE TABLE IF NOT EXISTS user_skills (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL REFERENCES organizations(id),
        user_id TEXT NOT NULL REFERENCES users(id),
        skill_id TEXT NOT NULL REFERENCES skills(id),
        status TEXT NOT NULL CHECK (status IN ('confirmed')),
        source TEXT NOT NULL,
        confirmed_at TEXT NOT NULL,
        UNIQUE (user_id, skill_id)
      );
      ALTER TABLE users ADD COLUMN IF NOT EXISTS department TEXT NOT NULL DEFAULT 'отдел1';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS company_role TEXT NOT NULL DEFAULT 'сотрудник';
      INSERT INTO course_skills (course_id, skill_id)
      SELECT id, skill_id FROM courses WHERE skill_id IS NOT NULL
      ON CONFLICT (course_id, skill_id) DO NOTHING;
    `);
    await this.seedDemoData();
  }

  get<T extends DatabaseRow>(
    sql: string,
    params: DatabaseValue[] = [],
  ): Promise<T | undefined> {
    return this.executor.get<T>(sql, params);
  }

  all<T extends DatabaseRow>(
    sql: string,
    params: DatabaseValue[] = [],
  ): Promise<T[]> {
    return this.executor.all<T>(sql, params);
  }

  run(sql: string, params: DatabaseValue[] = []): Promise<void> {
    return this.executor.run(sql, params);
  }

  async transaction<T>(
    callback: (transaction: DatabaseExecutor) => Promise<T>,
  ): Promise<T> {
    const client = await this.pool.connect();
    const transaction = this.createClientExecutor(client);
    try {
      await client.query('BEGIN');
      const result = await callback(transaction);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }

  private createClientExecutor(client: PoolClient): DatabaseExecutor {
    return createExecutor((sql, params) => client.query(sql, params));
  }

  private async seedDemoData(): Promise<void> {
    const organizationId = 'demo-organization';
    const users = [
      {
        id: 'demo-creator',
        email: 'hr@demo.local',
        name: 'Анна Смирнова',
        role: 'creator',
        password: 'Demo123!',
      },
      {
        id: 'demo-employee',
        email: 'employee@demo.local',
        name: 'Иван Петров',
        role: 'employee',
        password: 'Demo123!',
        department: 'отдел1',
        companyRole: 'сотрудник',
      },
      {
        id: 'demo-employee-2',
        email: 'maria.sokolova@demo.local',
        name: 'Мария Соколова',
        role: 'employee',
        department: 'отдел1',
        companyRole: 'тимлид',
      },
      {
        id: 'demo-employee-3',
        email: 'pavel.orlov@demo.local',
        name: 'Павел Орлов',
        role: 'employee',
        department: 'отдел2',
        companyRole: 'сотрудник',
      },
      {
        id: 'demo-employee-4',
        email: 'elena.lebedeva@demo.local',
        name: 'Елена Лебедева',
        role: 'employee',
        department: 'отдел2',
        companyRole: 'тимлид',
      },
      {
        id: 'demo-employee-5',
        email: 'artem.volkov@demo.local',
        name: 'Артём Волков',
        role: 'employee',
        department: 'отдел3',
        companyRole: 'сотрудник',
      },
      {
        id: 'demo-employee-6',
        email: 'olga.fedorova@demo.local',
        name: 'Ольга Фёдорова',
        role: 'employee',
        department: 'отдел3',
        companyRole: 'тимлид',
      },
      {
        id: 'demo-employee-7',
        email: 'nikita.morozov@demo.local',
        name: 'Никита Морозов',
        role: 'employee',
        department: 'отдел1',
        companyRole: 'сотрудник',
      },
    ] as const;

    await this.run(
      'INSERT INTO organizations (id, name) VALUES (?, ?) ON CONFLICT (id) DO NOTHING',
      [organizationId, 'Демо-компания'],
    );
    for (const user of users) {
      const exists = await this.get('SELECT id FROM users WHERE email = ?', [
        user.email,
      ]);
      if (!exists) {
        await this.run(
          `INSERT INTO users
           (id, organization_id, name, email, password_hash, role, department, company_role)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT (email) DO NOTHING`,
          [
            user.id,
            organizationId,
            user.name,
            user.email,
            hashPassword(
              'password' in user
                ? user.password
                : randomBytes(32).toString('hex'),
            ),
            user.role,
            'department' in user ? user.department : 'отдел1',
            'companyRole' in user ? user.companyRole : 'сотрудник',
          ],
        );
      }
    }
    await this.run(
      `UPDATE users SET department = ?, company_role = ?
       WHERE id = 'demo-employee' AND organization_id = ?`,
      ['отдел1', 'сотрудник', organizationId],
    );
    await this.run(
      `INSERT INTO skills (id, organization_id, name, description)
       VALUES (?, ?, ?, ?) ON CONFLICT (id) DO NOTHING`,
      [
        'demo-skill',
        organizationId,
        'Основы работы с клиентом',
        'Базовые принципы общения и обработки запросов клиентов.',
      ],
    );
  }
}
