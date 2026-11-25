import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync, SQLInputValue } from 'node:sqlite';
import { hashPassword } from './security.js';

export interface DatabaseRow {
  [column: string]: string | number | bigint | Uint8Array | null | undefined;
}

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly database: DatabaseSync;

  constructor(databasePath?: string) {
    const path = databasePath ?? process.env.DB_PATH ?? resolve('data', 'training.sqlite');
    if (path !== ':memory:') mkdirSync(dirname(resolve(path)), { recursive: true });

    this.database = new DatabaseSync(path);
    this.database.exec('PRAGMA foreign_keys = ON');
    this.createSchema();
    this.seedDemoData();
  }

  get<T extends DatabaseRow>(sql: string, params: SQLInputValue[] = []): T | undefined {
    return this.database.prepare(sql).get(...params) as T | undefined;
  }

  all<T extends DatabaseRow>(sql: string, params: SQLInputValue[] = []): T[] {
    return this.database.prepare(sql).all(...params) as T[];
  }

  run(sql: string, params: SQLInputValue[] = []): void {
    this.database.prepare(sql).run(...params);
  }

  transaction<T>(callback: () => T): T {
    this.database.exec('BEGIN IMMEDIATE');
    try {
      const result = callback();
      this.database.exec('COMMIT');
      return result;
    } catch (error) {
      this.database.exec('ROLLBACK');
      throw error;
    }
  }

  onModuleDestroy(): void {
    this.database.close();
  }

  private createSchema(): void {
    this.database.exec(`
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
        role TEXT NOT NULL CHECK (role IN ('creator', 'employee'))
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
        enrollment_id TEXT NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
        score INTEGER NOT NULL,
        passed INTEGER NOT NULL,
        answers_json TEXT NOT NULL,
        submitted_at TEXT NOT NULL
      );
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
    `);
    this.database.exec(`
      INSERT OR IGNORE INTO course_skills (course_id, skill_id)
      SELECT id, skill_id FROM courses WHERE skill_id IS NOT NULL;
    `);
  }

  private seedDemoData(): void {
    const organizationId = 'demo-organization';
    const existingOrganization = this.get(
      'SELECT id FROM organizations WHERE id = ?',
      [organizationId],
    );
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
      },
    ] as const;

    this.run(
      'INSERT OR IGNORE INTO organizations (id, name) VALUES (?, ?)',
      [organizationId, 'Демо-компания'],
    );
    for (const user of users) {
      const exists = this.get('SELECT id FROM users WHERE email = ?', [user.email]);
      if (!exists) {
        this.run(
          `INSERT INTO users (id, organization_id, name, email, password_hash, role)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            user.id,
            organizationId,
            user.name,
            user.email,
            hashPassword(user.password),
            user.role,
          ],
        );
      }
    }
    if (!existingOrganization) {
      this.run(
        `INSERT OR IGNORE INTO skills (id, organization_id, name, description)
         VALUES (?, ?, ?, ?)`,
        [
          'demo-skill',
          organizationId,
          'Основы работы с клиентом',
          'Базовые принципы общения и обработки запросов клиентов.',
        ],
      );
    }
  }
}
