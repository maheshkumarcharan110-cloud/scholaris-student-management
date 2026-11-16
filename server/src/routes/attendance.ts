import { Router } from "express";
import { prisma } from "../db.js";
import { ApiError, asyncHandler } from "../lib/http.js";
import { parseDateKey } from "../lib/dates.js";
import { buildAttendanceReport } from "../lib/attendance.js";
import {
  attendanceBulkSchema,
  attendanceQuerySchema,
  attendanceReportSchema,
} from "../schemas.js";

export const attendanceRouter = Router();

attendanceRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { classId, date } = attendanceQuerySchema.parse(req.query);
    const parsedDate = parseDateKey(date);
    if (!parsedDate) throw new ApiError(422, "The selected date is invalid.");

    const cls = await prisma.class.findUnique({
      where: { id: classId },
      select: { id: true, name: true, section: true, academicYear: true },
    });
    if (!cls) throw new ApiError(404, "Class not found.");

    const [students, records] = await Promise.all([
      prisma.student.findMany({
        where: { classId, status: "ACTIVE" },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        select: { id: true, firstName: true, lastName: true, admissionNo: true },
      }),
      prisma.attendance.findMany({
        where: { date: parsedDate, student: { classId } },
        select: { studentId: true, status: true, note: true },
      }),
    ]);

    const byStudent = new Map(records.map((record) => [record.studentId, record]));
    const summary = { present: 0, absent: 0, late: 0, excused: 0, unmarked: 0 };
    const roster = students.map((student) => {
      const record = byStudent.get(student.id);
      if (!record) summary.unmarked += 1;
      else if (record.status === "PRESENT") summary.present += 1;
      else if (record.status === "ABSENT") summary.absent += 1;
      else if (record.status === "LATE") summary.late += 1;
      else summary.excused += 1;

      return {
        ...student,
        status: record?.status ?? null,
        note: record?.note ?? null,
      };
    });

    res.json({ data: { class: cls, date, students: roster, summary } });
  }),
);

attendanceRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = attendanceBulkSchema.parse(req.body);
    const parsedDate = parseDateKey(body.date);
    if (!parsedDate) throw new ApiError(422, "The selected date is invalid.");

    const studentIds = body.records.map((record) => record.studentId);
    if (new Set(studentIds).size !== studentIds.length) {
      throw new ApiError(422, "Each student can only appear once in an attendance list.");
    }

    const students = await prisma.student.findMany({
      where: { id: { in: studentIds } },
      select: { id: true, status: true, firstName: true, lastName: true },
    });
    if (students.length !== studentIds.length) {
      throw new ApiError(422, "One or more students in this list no longer exist.");
    }
    const inactive = students.filter((student) => student.status !== "ACTIVE");
    if (inactive.length) {
      throw new ApiError(422, "Attendance cannot be recorded for archived or graduated students.");
    }

    await prisma.$transaction(
      body.records.map((record) =>
        prisma.attendance.upsert({
          where: { studentId_date: { studentId: record.studentId, date: parsedDate } },
          update: {
            status: record.status,
            note: record.note ?? null,
            recordedById: req.user!.id,
          },
          create: {
            studentId: record.studentId,
            date: parsedDate,
            status: record.status,
            note: record.note ?? null,
            recordedById: req.user!.id,
          },
        }),
      ),
    );

    const summary = {
      present: body.records.filter((record) => record.status === "PRESENT").length,
      absent: body.records.filter((record) => record.status === "ABSENT").length,
      late: body.records.filter((record) => record.status === "LATE").length,
      excused: body.records.filter((record) => record.status === "EXCUSED").length,
    };

    res.json({
      message: `Attendance saved for ${body.records.length} student${body.records.length === 1 ? "" : "s"}.`,
      data: { date: body.date, summary },
    });
  }),
);

attendanceRouter.get(
  "/report",
  asyncHandler(async (req, res) => {
    const { classId, from, to } = attendanceReportSchema.parse(req.query);
    const fromDate = parseDateKey(from);
    const toDate = parseDateKey(to);
    if (!fromDate || !toDate) throw new ApiError(422, "The selected date range is invalid.");
    if (fromDate > toDate) throw new ApiError(422, "The start date must be before the end date.");
    if (toDate.getTime() - fromDate.getTime() > 366 * 24 * 60 * 60 * 1000) {
      throw new ApiError(422, "Please choose a date range of one year or less.");
    }

    const report = await buildAttendanceReport(classId, fromDate, toDate);
    if (!report) throw new ApiError(404, "Class not found.");
    res.json({ data: report });
  }),
);
