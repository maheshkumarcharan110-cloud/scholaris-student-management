import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { prisma } from "../db.js";
import { ApiError, asyncHandler } from "../lib/http.js";
import { addDays, parseDateKey, startOfTodayUTC } from "../lib/dates.js";
import { gradeFor, percentage, round } from "../lib/grades.js";
import { paginationSchema, studentSchema, studentUpdateSchema } from "../schemas.js";
import { requireAdmin } from "../middleware/auth.js";

export const studentsRouter = Router();

studentsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const query = paginationSchema.parse(req.query);
    const since = addDays(startOfTodayUTC(), -30);

    const where: Prisma.StudentWhereInput = {
      ...(query.classId ? { classId: query.classId } : {}),
      ...(query.status && query.status !== "ALL" ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { firstName: { contains: query.search } },
              { lastName: { contains: query.search } },
              { admissionNo: { contains: query.search } },
              { guardianName: { contains: query.search } },
            ],
          }
        : {}),
    };

    const [total, students] = await Promise.all([
      prisma.student.count({ where }),
      prisma.student.findMany({
        where,
        include: {
          class: { select: { id: true, name: true, section: true } },
          attendance: {
            where: { date: { gte: since } },
            select: { status: true },
          },
        },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    res.json({
      data: students.map((student) => {
        const marked = student.attendance.length;
        const present = student.attendance.filter(
          (record) => record.status === "PRESENT" || record.status === "LATE",
        ).length;
        return {
          id: student.id,
          admissionNo: student.admissionNo,
          firstName: student.firstName,
          lastName: student.lastName,
          gender: student.gender,
          dateOfBirth: student.dateOfBirth,
          email: student.email,
          phone: student.phone,
          guardianName: student.guardianName,
          guardianPhone: student.guardianPhone,
          address: student.address,
          status: student.status,
          enrolledAt: student.enrolledAt,
          class: student.class,
          classId: student.class.id,
          attendanceRate: marked ? percentage(present, marked) : null,
          attendanceMarked: marked,
        };
      }),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
      },
    });
  }),
);

studentsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const student = await prisma.student.findUnique({
      where: { id: String(req.params.id) },
      include: {
        class: {
          include: {
            classTeacher: { include: { user: { select: { name: true, email: true } } } },
          },
        },
        attendance: { orderBy: { date: "desc" }, take: 120 },
        marks: {
          include: {
            subject: { select: { id: true, name: true, code: true } },
            exam: {
              include: {
                class: { select: { id: true, name: true, section: true } },
                subjects: { include: { subject: { select: { id: true, name: true, code: true } } } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!student) throw new ApiError(404, "Student not found.");

    const counts = await prisma.attendance.groupBy({
      by: ["status"],
      where: { studentId: student.id },
      _count: { _all: true },
    });
    const summary = { present: 0, absent: 0, late: 0, excused: 0 };
    for (const row of counts) {
      const key = row.status.toLowerCase() as keyof typeof summary;
      summary[key] = row._count._all;
    }
    const totalMarked = summary.present + summary.absent + summary.late + summary.excused;
    const attendance = {
      ...summary,
      total: totalMarked,
      rate: totalMarked ? percentage(summary.present + summary.late, totalMarked) : 0,
      records: student.attendance.map((record) => ({
        id: record.id,
        date: record.date,
        status: record.status,
        note: record.note,
      })),
    };

    const examsById = new Map<
      string,
      {
        id: string;
        name: string;
        term: string;
        status: string;
        startDate: Date;
        endDate: Date;
        class: { id: string; name: string; section: string };
        subjects: Array<{ id: string; name: string; code: string; maxMarks: number; marks: number | null }>;
      }
    >();

    for (const mark of student.marks) {
      const exam = mark.exam;
      if (!examsById.has(exam.id)) {
        examsById.set(exam.id, {
          id: exam.id,
          name: exam.name,
          term: exam.term,
          status: exam.status,
          startDate: exam.startDate,
          endDate: exam.endDate,
          class: exam.class,
          subjects: exam.subjects.map((examSubject) => ({
            id: examSubject.subject.id,
            name: examSubject.subject.name,
            code: examSubject.subject.code,
            maxMarks: examSubject.maxMarks,
            marks: null,
          })),
        });
      }
      const entry = examsById.get(exam.id)!;
      const subjectRow = entry.subjects.find((subject) => subject.id === mark.subjectId);
      if (subjectRow) subjectRow.marks = mark.marks;
    }

    const results = [...examsById.values()]
      .map((exam) => {
        const entered = exam.subjects.filter((subject) => subject.marks !== null);
        const total = entered.reduce((sum, subject) => sum + (subject.marks ?? 0), 0);
        const maxTotal = entered.reduce((sum, subject) => sum + subject.maxMarks, 0);
        const pct = percentage(total, maxTotal);
        return {
          ...exam,
          total: round(total),
          maxTotal,
          percentage: pct,
          grade: gradeFor(pct),
        };
      })
      .sort((a, b) => b.startDate.getTime() - a.startDate.getTime());

    res.json({
      data: {
        id: student.id,
        admissionNo: student.admissionNo,
        firstName: student.firstName,
        lastName: student.lastName,
        gender: student.gender,
        dateOfBirth: student.dateOfBirth,
        email: student.email,
        phone: student.phone,
        guardianName: student.guardianName,
        guardianPhone: student.guardianPhone,
        address: student.address,
        status: student.status,
        enrolledAt: student.enrolledAt,
        class: {
          id: student.class.id,
          name: student.class.name,
          section: student.class.section,
          academicYear: student.class.academicYear,
          classTeacherName: student.class.classTeacher?.user.name ?? null,
        },
        attendance,
        results,
      },
    });
  }),
);

function studentData(body: ReturnType<typeof studentSchema.parse>) {
  const birth = body.dateOfBirth ? parseDateKey(body.dateOfBirth) : null;
  const enrolled = body.enrolledAt ? parseDateKey(body.enrolledAt) : null;
  if (body.dateOfBirth && !birth) throw new ApiError(422, "Date of birth is not a valid date.");
  if (body.enrolledAt && !enrolled) throw new ApiError(422, "Enrolment date is not a valid date.");
  return { birth, enrolled };
}

studentsRouter.post(
  "/",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const body = studentSchema.parse(req.body);
    const cls = await prisma.class.findUnique({ where: { id: body.classId } });
    if (!cls) throw new ApiError(422, "The selected class does not exist.");
    const { birth, enrolled } = studentData(body);

    const student = await prisma.student.create({
      data: {
        admissionNo: body.admissionNo,
        firstName: body.firstName,
        lastName: body.lastName,
        gender: body.gender,
        dateOfBirth: birth,
        email: body.email ?? null,
        phone: body.phone ?? null,
        guardianName: body.guardianName,
        guardianPhone: body.guardianPhone,
        address: body.address ?? null,
        classId: body.classId,
        status: body.status ?? "ACTIVE",
        ...(enrolled ? { enrolledAt: enrolled } : {}),
      },
      include: { class: { select: { id: true, name: true, section: true } } },
    });

    res.status(201).json({ data: student, message: "Student registered successfully." });
  }),
);

studentsRouter.patch(
  "/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const body = studentUpdateSchema.parse(req.body);
    const existing = await prisma.student.findUnique({ where: { id: String(req.params.id) } });
    if (!existing) throw new ApiError(404, "Student not found.");

    if (body.classId) {
      const cls = await prisma.class.findUnique({ where: { id: body.classId } });
      if (!cls) throw new ApiError(422, "The selected class does not exist.");
    }

    const data: Prisma.StudentUncheckedUpdateInput = {};
    if (body.admissionNo !== undefined) data.admissionNo = body.admissionNo;
    if (body.firstName !== undefined) data.firstName = body.firstName;
    if (body.lastName !== undefined) data.lastName = body.lastName;
    if (body.gender !== undefined) data.gender = body.gender;
    if (body.email !== undefined) data.email = body.email;
    if (body.phone !== undefined) data.phone = body.phone;
    if (body.guardianName !== undefined) data.guardianName = body.guardianName;
    if (body.guardianPhone !== undefined) data.guardianPhone = body.guardianPhone;
    if (body.address !== undefined) data.address = body.address;
    if (body.classId !== undefined) data.classId = body.classId;
    if (body.status !== undefined) data.status = body.status;

    if (body.dateOfBirth !== undefined) {
      if (body.dateOfBirth === null) data.dateOfBirth = null;
      else {
        const parsed = parseDateKey(body.dateOfBirth);
        if (!parsed) throw new ApiError(422, "Date of birth is not a valid date.");
        data.dateOfBirth = parsed;
      }
    }
    if (body.enrolledAt) {
      const parsed = parseDateKey(body.enrolledAt);
      if (!parsed) throw new ApiError(422, "Enrolment date is not a valid date.");
      data.enrolledAt = parsed;
    }

    const student = await prisma.student.update({
      where: { id: existing.id },
      data,
      include: { class: { select: { id: true, name: true, section: true } } },
    });

    res.json({ data: student, message: "Student updated successfully." });
  }),
);

studentsRouter.delete(
  "/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const existing = await prisma.student.findUnique({ where: { id: String(req.params.id) } });
    if (!existing) throw new ApiError(404, "Student not found.");

    await prisma.student.update({
      where: { id: existing.id },
      data: { status: "INACTIVE" },
    });

    res.json({
      message: `${existing.firstName} ${existing.lastName} has been archived. Their records are preserved.`,
    });
  }),
);
