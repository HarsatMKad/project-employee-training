import { Injectable, UnauthorizedException } from '@nestjs/common';
import { DatabaseService, DatabaseRow } from '../database/database.service.js';
import { AuthUser, UserRole, signSessionToken, verifyPassword } from '../security/security.js';

interface UserRecord extends DatabaseRow {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  role: UserRole;
  organization_id: string;
}

@Injectable()
export class AuthService {
  constructor(private readonly database: DatabaseService) {}

  login(email: string, password: string): { user: AuthUser; token: string } {
    const user = this.database.get<UserRecord>(
      `SELECT id, email, name, password_hash, role, organization_id
       FROM users WHERE email = ?`,
      [email.trim().toLowerCase()],
    );
    if (!user || !verifyPassword(password, user.password_hash)) {
      throw new UnauthorizedException('Неверная почта или пароль');
    }

    const sessionUser: AuthUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organization_id,
    };
    return { user: sessionUser, token: signSessionToken(sessionUser) };
  }
}
