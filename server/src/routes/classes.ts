import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { prisma } from "../db.js";
import { ApiError, asyncHandler } from "../lib/http.js";
import {
  classCreateSchema,
  classUpdateSchema,
  subjectCreateSchema,
  subjectUpdateSchema,
} from "../schemas.js";
import { requireRole } from "../middleware/auth.js";

export const classesRouter = Router();

const classInclude = {
  classTeacher: {
    include: { user: { select: { id: true, name: true, email: true } } },
  },
  students: { select: { status: true } },
  subjects: {
    select: {
      id: true,
      name: true,
      code: true,
      teacher: { include: { user: { select: { name: true } } } },
    },
    orderBy: { name: "asc" as const },
  },
  _count: { select: { exams: true } },
} satisfies Prisma.ClassInclude;

type ClassWithRelations = Prisma.ClassGetPayload<{ include: typeof classInclude }>;

function serializeClass(item: ClassWithRelations) {
  return {
    id: item.id,
    name: item.name,
    section: item.section,
    academicYear: item.academicYear,
    room: item.room,
    classTeacher: item.classTeacher
      ? {
          id: item.classTeacher.id,
          name: item.classTeacher.user.name,
          email: item.classTeacher.user.email,
        }
      : null,
    studentCount: item.students.filter((student) => student.status === "ACTIVE").length,
    totalStudents: item.students.length,
    subjectCount: item.subjects.length,
    subjects: item.subjects.map((subject) => ({
      id: subject.id,
      name: subject.name,
      code: subject.code,
      teacherName: subject.teacher?.user.name ?? null,
    })),
    examCount: item._count.exams,
  };
}

classesRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const classes = await prisma.class.findMany({
      include: classInclude,
      orderBy: [{ name: "asc" }, { section: "asc" }],
    });
    res.json({ data: classes.map(serializeClass) });
  }),
);

classesRouter.post(
  "/",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const body = classCreateSchema.parse(req.body);
    if (body.classTeacherId) {
      const teacher = await prisma.teacher.findUnique({ where: { id: body.classTeacherId } });
      if (!teacher) throw new ApiError(422, "The selected class teacher does not exist.");
    }

    const created = await prisma.class.create({
      data: {
        name: body.name,
        section: body.section,
        academicYear: body.academicYear,
        room: body.room ?? null,
        classTeacherId: body.classTeacherId ?? null,
      },
      include: classInclude,
    });
    res.status(201).json({ data: serializeClass(created) });
  }),
);

classesRouter.patch(
  "/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const body = classUpdateSchema.parse(req.body);
    const existing = await prisma.class.findUnique({ where: { id: String(req.params.id) } });
    if (!existing) throw new ApiError(404, "Class not found.");

    if (body.classTeacherId) {
      const teacher = await prisma.teacher.findUnique({ where: { id: body.classTeacherId } });
      if (!teacher) throw new ApiError(422, "The selected class teacher does not exist.");
    }

    const data: Prisma.ClassUncheckedUpdateInput = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.section !== undefined) data.section = body.section;
    if (body.academicYear !== undefined) data.academicYear = body.academicYear;
    if (body.room !== undefined) data.room = body.room;
    if (body.classTeacherId !== undefined) data.classTeacherId = body.classTeacherId;

    const updated = await prisma.class.update({
      where: { id: existing.id },
      data,
      include: classInclude,
    });
    res.json({ data: serializeClass(updated) });
  }),
);

classesRouter.delete(
  "/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const existing = await prisma.class.findUnique({
      where: { id: String(req.params.id) },
      include: { _count: { select: { students: true } } },
    });
    if (!existing) throw new ApiError(404, "Class not found.");
    if (existing._count.students > 0) {
      throw new ApiError(
        409,
        "This class still has students. Move or archive them before deleting the class.",
      );
    }

    await prisma.class.delete({ where: { id: existing.id } });
    res.json({ message: "Class deleted." });
  }),
);

/* ----------------------------- Subjects ----------------------------- */

export const subjectsRouter = Router();

subjectsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const classId = req.query.classId ? String(req.query.classId) : undefined;
    const subjects = await prisma.subject.findMany({
      where: classId ? { classId } : undefined,
      include: {
        class: { select: { id: true, name: true, section: true } },
        teacher: { include: { user: { select: { id: true, name: true, email: true } } } },
        _count: { select: { marks: true, examSubjects: true } },
      },
      orderBy: [{ class: { name: "asc" } }, { name: "asc" }],
    });

    res.json({
      data: subjects.map((subject) => ({
        id: subject.id,
        name: subject.name,
        code: subject.code,
        class: subject.class,
        teacher: subject.teacher
          ? { id: subject.teacher.id, name: subject.teacher.user.name, email: subject.teacher.user.email }
          : null,
        markCount: subject._count.marks,
        examCount: subject._count.examSubjects,
      })),
    });
  }),
);

subjectsRouter.post(
  "/",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const body = subjectCreateSchema.parse(req.body);
    const cls = await prisma.class.findUnique({ where: { id: body.classId } });
    if (!cls) throw new ApiError(422, "The selected class does not exist.");
    if (body.teacherId) {
      const teacher = await prisma.teacher.findUnique({ where: { id: body.teacherId } });
      if (!teacher) throw new ApiError(422, "The selected teacher does not exist.");
    }

    const created = await prisma.subject.create({
      data: {
        name: body.name,
        code: body.code,
        classId: body.classId,
        teacherId: body.teacherId ?? null,
      },
      include: {
        class: { select: { id: true, name: true, section: true } },
        teacher: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
    });

    res.status(201).json({
      data: {
        id: created.id,
        name: created.name,
        code: created.code,
        class: created.class,
        teacher: created.teacher
          ? { id: created.teacher.id, name: created.teacher.user.name, email: created.teacher.user.email }
          : null,
        markCount: 0,
        examCount: 0,
      },
    });
  }),
);

subjectsRouter.patch(
  "/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const body = subjectUpdateSchema.parse(req.body);
    const existing = await prisma.subject.findUnique({ where: { id: String(req.params.id) } });
    if (!existing) throw new ApiError(404, "Subject not found.");

    if (body.classId) {
      const cls = await prisma.class.findUnique({ where: { id: body.classId } });
      if (!cls) throw new ApiError(422, "The selected class does not exist.");
    }
    if (body.teacherId) {
      const teacher = await prisma.teacher.findUnique({ where: { id: body.teacherId } });
      if (!teacher) throw new ApiError(422, "The selected teacher does not exist.");
    }

    const data: Prisma.SubjectUncheckedUpdateInput = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.code !== undefined) data.code = body.code;
    if (body.classId !== undefined) data.classId = body.classId;
    if (body.teacherId !== undefined) data.teacherId = body.teacherId;

    const updated = await prisma.subject.update({
      where: { id: existing.id },
      data,
      include: {
        class: { select: { id: true, name: true, section: true } },
        teacher: { include: { user: { select: { id: true, name: true, email: true } } } },
        _count: { select: { marks: true, examSubjects: true } },
      },
    });

    res.json({
      data: {
        id: updated.id,
        name: updated.name,
        code: updated.code,
        class: updated.class,
        teacher: updated.teacher
          ? { id: updated.teacher.id, name: updated.teacher.user.name, email: updated.teacher.user.email }
          : null,
        markCount: updated._count.marks,
        examCount: updated._count.examSubjects,
      },
    });
  }),
);

subjectsRouter.delete(
  "/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const existing = await prisma.subject.findUnique({
      where: { id: String(req.params.id) },
      include: { _count: { select: { marks: true, examSubjects: true } } },
    });
    if (!existing) throw new ApiError(404, "Subject not found.");
    if (existing._count.marks > 0 || existing._count.examSubjects > 0) {
      throw new ApiError(
        409,
        "This subject is used by exams or marks and cannot be deleted. Remove the related exam records first.",
      );
    }

    await prisma.subject.delete({ where: { id: existing.id } });
    res.json({ message: "Subject deleted." });
  }),
);
