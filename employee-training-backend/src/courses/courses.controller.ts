import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  AuthGuard,
  CurrentUser,
  Roles,
  RolesGuard,
} from '../auth/auth.guard.js';
import { CoursesService } from './courses.service.js';
import type { AuthUser } from '../security/security.js';

@Controller()
@UseGuards(AuthGuard, RolesGuard)
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get('dashboard')
  dashboard(@CurrentUser() user: AuthUser): Promise<Record<string, unknown>> {
    return this.coursesService.dashboard(user);
  }

  @Get('skills')
  skills(@CurrentUser() user: AuthUser): Promise<unknown[]> {
    return this.coursesService.listSkills(user);
  }

  @Post('skills')
  @Roles('creator')
  createSkill(
    @CurrentUser() user: AuthUser,
    @Body() body: unknown,
  ): Promise<{ id: string; name: string; description: string }> {
    return this.coursesService.createSkill(user, body);
  }

  @Delete('skills/:skillId')
  @Roles('creator')
  deleteSkill(
    @CurrentUser() user: AuthUser,
    @Param('skillId') skillId: string,
  ): Promise<{ success: true }> {
    return this.coursesService.deleteSkill(user, skillId);
  }

  @Get('employees')
  @Roles('creator')
  employees(@CurrentUser() user: AuthUser): Promise<unknown[]> {
    return this.coursesService.listEmployees(user);
  }

  @Get('courses')
  courses(@CurrentUser() user: AuthUser): Promise<unknown[]> {
    return this.coursesService.listCourses(user);
  }

  @Post('courses')
  @Roles('creator')
  createCourse(
    @CurrentUser() user: AuthUser,
    @Body() body: unknown,
  ): Promise<{ id: string; status: string }> {
    return this.coursesService.createCourse(user, body);
  }

  @Post('courses/:courseId/publish')
  @Roles('creator')
  publishCourse(
    @CurrentUser() user: AuthUser,
    @Param('courseId') courseId: string,
  ): Promise<{ id: string; status: string }> {
    return this.coursesService.publishCourse(user, courseId);
  }

  @Post('courses/:courseId/assign')
  @Roles('creator')
  assignCourse(
    @CurrentUser() user: AuthUser,
    @Param('courseId') courseId: string,
    @Body() body: { employeeId?: unknown },
  ): Promise<{ enrollmentId: string; status: string }> {
    return this.coursesService.assignCourse(user, courseId, body?.employeeId);
  }

  @Get('courses/:courseId')
  course(
    @CurrentUser() user: AuthUser,
    @Param('courseId') courseId: string,
  ): Promise<Record<string, unknown>> {
    return this.coursesService.getCourse(user, courseId);
  }

  @Post('courses/:courseId/lessons/:lessonId/study')
  @Roles('employee')
  setLessonStudied(
    @CurrentUser() user: AuthUser,
    @Param('courseId') courseId: string,
    @Param('lessonId') lessonId: string,
    @Body() body: { studied?: unknown },
  ): Promise<{ studied: boolean }> {
    return this.coursesService.setLessonStudied(
      user,
      courseId,
      lessonId,
      body?.studied,
    );
  }

  @Post('courses/:courseId/answers')
  @Roles('employee')
  saveQuizAnswer(
    @CurrentUser() user: AuthUser,
    @Param('courseId') courseId: string,
    @Body() body: { questionId?: unknown; optionIndex?: unknown },
  ): Promise<{ answeredCount: number; questionCount: number }> {
    return this.coursesService.saveQuizAnswer(
      user,
      courseId,
      body?.questionId,
      body?.optionIndex,
    );
  }

  @Post('courses/:courseId/submit')
  @Roles('employee')
  submitQuiz(
    @CurrentUser() user: AuthUser,
    @Param('courseId') courseId: string,
    @Body() body: { answers?: unknown },
  ): Promise<{
    score: number;
    passed: boolean;
    passingScore: number;
    enrollmentStatus: string;
  }> {
    return this.coursesService.submitQuiz(user, courseId, body?.answers);
  }
}
