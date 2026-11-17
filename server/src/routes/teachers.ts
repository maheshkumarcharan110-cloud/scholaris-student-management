import { Router } from "express";
import { prisma } from "../db.js";
import { hashPassword } from "../lib/auth.js";
import { ApiError, asyncHandler } from "../lib/http.js";
import { teacherCreateSchema, teacherUpdateSchema } from "../schemas.js";
import { requireAdmin } from "../middleware/auth.js";

export const teachersRouter = Router();

teachersRouter.use(requireAdmin);

teachersRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const search = String(req.query.search ?? "").trim();
    const teachers = await prisma.teacher.findMany({
      where: search
        ? {
            OR: [
              { employeeNo: { contains: search } },
              { user: { name: { contains: search } } },
              { user: { email: { contains: search } } },
            ],
          }
        : undefined,
      include: {
        user: { select: { id: true, name: true, email: true, role: true, active: true } },
        _count: { select: { classes: true, subjects: true } },
      },
      orderBy: { user: { name: "asc" } },
    });

    res.json({
      data: teachers.map((teacher) => ({
        id: teacher.id,
        employeeNo: teacher.employeeNo,
        phone: teacher.phone,
        qualification: teacher.qualification,
        createdAt: teacher.createdAt,
        user: teacher.user,
        classCount: teacher._count.classes,
        subjectCount: teacher._count.subjects,
      })),
    });
  }),
);

teachersRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = teacherCreateSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) throw new ApiError(409, "An account with this email already exists.");

    const teacher = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        passwordHash: await hashPassword(body.password),
        role: "TEACHER",
        teacher: {
          create: {
            employeeNo: body.employeeNo,
            phone: body.phone,
            qualification: body.qualification,
          },
        },
      },
      include: {
        teacher: { include: { _count: { select: { classes: true, subjects: true } } } },
      },
    });

    res.status(201).json({
      data: {
        id: teacher.teacher!.id,
        employeeNo: teacher.teacher!.employeeNo,
        phone: teacher.teacher!.phone,
        qualification: teacher.teacher!.qualification,
        createdAt: teacher.teacher!.createdAt,
        user: {
          id: teacher.id,
          name: teacher.name,
          email: teacher.email,
          role: teacher.role,
          active: teacher.active,
        },
        classCount: 0,
        subjectCount: 0,
      },
    });
  }),
);

teachersRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const body = teacherUpdateSchema.parse(req.body);
    const teacher = await prisma.teacher.findUnique({ where: { id: String(req.params.id) }, include: { user: true } });
    if (!teacher) throw new ApiError(404, "Teacher not found.");

    if (body.email && body.email !== teacher.user.email) {
      const existing = await prisma.user.findUnique({ where: { email: body.email } });
      if (existing) throw new ApiError(409, "An account with this email already exists.");
    }

    const updated = await prisma.user.update({
      where: { id: teacher.userId },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.email !== undefined ? { email: body.email } : {}),
        ...(body.active !== undefined ? { active: body.active } : {}),
        ...(body.password ? { passwordHash: await hashPassword(body.password) } : {}),
        teacher: {
          update: {
            ...(body.phone !== undefined ? { phone: body.phone } : {}),
            ...(body.qualification !== undefined ? { qualification: body.qualification } : {}),
          },
        },
      },
      include: {
        teacher: { include: { _count: { select: { classes: true, subjects: true } } } },
      },
    });

    res.json({
      data: {
        id: updated.teacher!.id,
        employeeNo: updated.teacher!.employeeNo,
        phone: updated.teacher!.phone,
        qualification: updated.teacher!.qualification,
        createdAt: updated.teacher!.createdAt,
        user: {
          id: updated.id,
          name: updated.name,
          email: updated.email,
          role: updated.role,
          active: updated.active,
        },
        classCount: updated.teacher!._count.classes,
        subjectCount: updated.teacher!._count.subjects,
      },
    });
  }),
);

teachersRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const teacher = await prisma.teacher.findUnique({ where: { id: String(req.params.id) } });
    if (!teacher) throw new ApiError(404, "Teacher not found.");

    await prisma.$transaction([
      prisma.class.updateMany({
        where: { classTeacherId: teacher.id },
        data: { classTeacherId: null },
      }),
      prisma.subject.updateMany({
        where: { teacherId: teacher.id },
        data: { teacherId: null },
      }),
      prisma.user.update({ where: { id: teacher.userId }, data: { active: false } }),
    ]);

    res.json({ message: "Teacher account deactivated." });
  }),
);
