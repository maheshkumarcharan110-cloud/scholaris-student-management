import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { prisma } from "../db.js";
import { ApiError, asyncHandler } from "../lib/http.js";
import { parseDateKey } from "../lib/dates.js";
import { buildExamResults } from "../lib/results.js";
import { round } from "../lib/grades.js";
import { examCreateSchema, examUpdateSchema, marksBulkSchema } from "../schemas.js";
import { requireAdmin } from "../middleware/auth.js";
import { isAdminRole } from "../lib/roles.js";

export const examsRouter = Router();

const examInclude = {
  class: { select: { id: true, name: true, section: true, academicYear: true } },
  subjects: {
    include: {
      subject: {
        select: {
          id: true,
          name: true,
          code: true,
          teacherId: true,
          teacher: { include: { user: { select: { name: true } } } },
        },
      },
    },
    orderBy: { subject: { name: "asc" as const } },
  },
  _count: { select: { marks: true } },
} satisfies Prisma.ExamInclude;

function serializeExam(exam: Prisma.ExamGetPayload<{ include: typeof examInclude }>) {
  return {
    id: exam.id,
    name: exam.name,
    term: exam.term,
    class: exam.class,
    startDate: exam.startDate,
    endDate: exam.endDate,
    status: exam.status,
    subjectCount: exam.subjects.length,
    markCount: exam._count.marks,
    subjects: exam.subjects.map((item) => ({
      id: item.id,
      subjectId: item.subjectId,
      name: item.subject.name,
      code: item.subject.code,
      maxMarks: item.maxMarks,
      teacherName: item.subject.teacher?.user.name ?? null,
      teacherId: item.subject.teacherId,
    })),
  };
}

examsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const classId = req.query.classId ? String(req.query.classId) : undefined;
    const [exams, studentCounts] = await Promise.all([
      prisma.exam.findMany({
        where: classId ? { classId } : undefined,
        include: examInclude,
        orderBy: { startDate: "desc" },
      }),
      prisma.student.groupBy({
        by: ["classId"],
        where: { status: "ACTIVE" },
        _count: { _all: true },
      }),
    ]);

    const countByClass = new Map(studentCounts.map((row) => [row.classId, row._count._all]));

    res.json({
      data: exams.map((exam) => {
        const students = countByClass.get(exam.classId) ?? 0;
        const expected = students * exam.subjects.length;
        return {
          ...serializeExam(exam),
          studentCount: students,
          progress: expected ? round((exam._count.marks / expected) * 100) : 0,
        };
      }),
    });
  }),
);

examsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const exam = await prisma.exam.findUnique({
      where: { id: String(req.params.id) },
      include: examInclude,
    });
    if (!exam) throw new ApiError(404, "Exam not found.");

    const students = await prisma.student.findMany({
      where: { classId: exam.classId, status: "ACTIVE" },
      select: { id: true, firstName: true, lastName: true, admissionNo: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });

    const marks = await prisma.mark.findMany({ where: { examId: exam.id } });

    const canEdit =
      isAdminRole(req.user!.role) ||
      exam.subjects.some(
        (item) => item.subject.teacherId && item.subject.teacherId === req.user!.teacherId,
      );

    res.json({
      data: {
        ...serializeExam(exam),
        students,
        marks,
        canEdit,
        mySubjectIds:
          isAdminRole(req.user!.role)
            ? exam.subjects.map((item) => item.subjectId)
            : exam.subjects
                .filter((item) => item.subject.teacherId === req.user!.teacherId)
                .map((item) => item.subjectId),
      },
    });
  }),
);

examsRouter.post(
  "/",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const body = examCreateSchema.parse(req.body);
    const startDate = parseDateKey(body.startDate);
    const endDate = parseDateKey(body.endDate);
    if (!startDate || !endDate) throw new ApiError(422, "Enter valid exam dates.");
    if (endDate < startDate) throw new ApiError(422, "The end date must be after the start date.");

    const cls = await prisma.class.findUnique({
      where: { id: body.classId },
      include: { subjects: { select: { id: true, name: true } } },
    });
    if (!cls) throw new ApiError(422, "The selected class does not exist.");
    if (!cls.subjects.length) {
      throw new ApiError(422, "Add at least one subject to this class before creating an exam.");
    }

    let subjectsToCreate: Array<{ subjectId: string; maxMarks: number }>;
    if (body.subjects && body.subjects.length) {
      const classSubjectIds = new Set(cls.subjects.map((subject) => subject.id));
      const duplicate = new Set<string>();
      for (const item of body.subjects) {
        if (!classSubjectIds.has(item.subjectId)) {
          throw new ApiError(422, "One of the selected subjects does not belong to this class.");
        }
        if (duplicate.has(item.subjectId)) {
          throw new ApiError(422, "A subject was selected more than once.");
        }
        duplicate.add(item.subjectId);
      }
      subjectsToCreate = body.subjects;
    } else {
      subjectsToCreate = cls.subjects.map((subject) => ({ subjectId: subject.id, maxMarks: 100 }));
    }

    const created = await prisma.exam.create({
      data: {
        name: body.name,
        term: body.term,
        classId: body.classId,
        startDate,
        endDate,
        subjects: { create: subjectsToCreate },
      },
      include: examInclude,
    });

    res.status(201).json({
      data: { ...serializeExam(created), studentCount: 0, progress: 0 },
      message: "Exam created.",
    });
  }),
);

examsRouter.patch(
  "/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const body = examUpdateSchema.parse(req.body);
    const existing = await prisma.exam.findUnique({ where: { id: String(req.params.id) } });
    if (!existing) throw new ApiError(404, "Exam not found.");

    const startDate = body.startDate ? parseDateKey(body.startDate) : existing.startDate;
    const endDate = body.endDate ? parseDateKey(body.endDate) : existing.endDate;
    if (!startDate || !endDate) throw new ApiError(422, "Enter valid exam dates.");
    if (endDate < startDate) throw new ApiError(422, "The end date must be after the start date.");

    const data: Prisma.ExamUncheckedUpdateInput = { startDate, endDate };
    if (body.name !== undefined) data.name = body.name;
    if (body.term !== undefined) data.term = body.term;
    if (body.status !== undefined) data.status = body.status;

    const updated = await prisma.exam.update({
      where: { id: existing.id },
      data,
      include: examInclude,
    });

    res.json({
      data: serializeExam(updated),
      message:
        body.status === "PUBLISHED"
          ? "Results published. Marks are now locked."
          : body.status === "DRAFT"
            ? "Exam moved back to draft. Marks can be edited again."
            : "Exam updated.",
    });
  }),
);

examsRouter.delete(
  "/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const existing = await prisma.exam.findUnique({ where: { id: String(req.params.id) } });
    if (!existing) throw new ApiError(404, "Exam not found.");
    if (existing.status === "PUBLISHED") {
      throw new ApiError(409, "Unpublish this exam before deleting it.");
    }
    await prisma.exam.delete({ where: { id: existing.id } });
    res.json({ message: "Exam deleted." });
  }),
);

examsRouter.post(
  "/:id/marks",
  asyncHandler(async (req, res) => {
    const body = marksBulkSchema.parse(req.body);
    const exam = await prisma.exam.findUnique({
      where: { id: String(req.params.id) },
      include: { subjects: { include: { subject: { select: { teacherId: true } } } } },
    });
    if (!exam) throw new ApiError(404, "Exam not found.");
    if (exam.status === "PUBLISHED") {
      throw new ApiError(409, "Results are published and locked. Unpublish to edit marks.");
    }

    const examSubject = exam.subjects.find((item) => item.subjectId === body.subjectId);
    if (!examSubject) throw new ApiError(422, "This subject is not part of the selected exam.");

    if (req.user!.role === "TEACHER") {
      if (!req.user!.teacherId || examSubject.subject.teacherId !== req.user!.teacherId) {
        throw new ApiError(403, "You can only enter marks for subjects assigned to you.");
      }
    }

    const studentIds = body.marks.map((item) => item.studentId);
    if (new Set(studentIds).size !== studentIds.length) {
      throw new ApiError(422, "Each student can only appear once in a marks list.");
    }

    const students = await prisma.student.findMany({
      where: { id: { in: studentIds }, classId: exam.classId, status: "ACTIVE" },
      select: { id: true },
    });
    if (students.length !== studentIds.length) {
      throw new ApiError(422, "One or more students are not active members of this exam's class.");
    }

    for (const item of body.marks) {
      if (item.marks !== null && item.marks > examSubject.maxMarks) {
        throw new ApiError(
          422,
          `Marks cannot exceed the maximum of ${examSubject.maxMarks} for this subject.`,
        );
      }
    }

    await prisma.$transaction(
      body.marks.map((item) =>
        item.marks === null
          ? prisma.mark.deleteMany({
              where: { examId: exam.id, subjectId: body.subjectId, studentId: item.studentId },
            })
          : prisma.mark.upsert({
              where: {
                examId_subjectId_studentId: {
                  examId: exam.id,
                  subjectId: body.subjectId,
                  studentId: item.studentId,
                },
              },
              update: { marks: item.marks, recordedById: req.user!.teacherId },
              create: {
                examId: exam.id,
                subjectId: body.subjectId,
                studentId: item.studentId,
                marks: item.marks,
                recordedById: req.user!.teacherId,
              },
            }),
      ),
    );

    res.json({ message: "Marks saved successfully." });
  }),
);

examsRouter.get(
  "/:id/results",
  asyncHandler(async (req, res) => {
    const results = await buildExamResults(String(req.params.id));
    if (!results) throw new ApiError(404, "Exam not found.");
    res.json({ data: results });
  }),
);
