import { Router } from "express";
import { prisma } from "../db.js";
import { asyncHandler } from "../lib/http.js";
import { addDays, dateOnly, startOfTodayUTC } from "../lib/dates.js";
import { gradeFor, percentage, round } from "../lib/grades.js";

export const dashboardRouter = Router();

dashboardRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const today = startOfTodayUTC();
    const trendStart = addDays(today, -13);
    const monthStart = addDays(today, -30);

    const [
      studentCount,
      teacherCount,
      classCount,
      subjectCount,
      todayRecords,
      trendRecords,
      classes,
      upcomingExams,
      publishedMarks,
      recentAttendance,
    ] = await Promise.all([
      prisma.student.count({ where: { status: "ACTIVE" } }),
      prisma.teacher.count({ where: { user: { active: true } } }),
      prisma.class.count(),
      prisma.subject.count(),
      prisma.attendance.findMany({
        where: { date: today, student: { status: "ACTIVE" } },
        select: { status: true },
      }),
      prisma.attendance.findMany({
        where: { date: { gte: trendStart }, student: { status: "ACTIVE" } },
        select: { date: true, status: true },
      }),
      prisma.class.findMany({
        include: { students: { where: { status: "ACTIVE" }, select: { id: true } } },
        orderBy: [{ name: "asc" }, { section: "asc" }],
      }),
      prisma.exam.findMany({
        where: { endDate: { gte: today } },
        include: {
          class: { select: { name: true, section: true } },
          subjects: { select: { subjectId: true } },
        },
        orderBy: { startDate: "asc" },
        take: 4,
      }),
      prisma.mark.findMany({
        where: { exam: { status: "PUBLISHED" } },
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              class: { select: { name: true, section: true } },
            },
          },
          exam: { select: { subjects: { select: { subjectId: true, maxMarks: true } } } },
        },
      }),
      prisma.attendance.findMany({
        where: { date: { gte: monthStart }, student: { status: "ACTIVE" } },
        select: {
          studentId: true,
          status: true,
          student: {
            select: {
              firstName: true,
              lastName: true,
              class: { select: { name: true, section: true } },
            },
          },
        },
      }),
    ]);

    const todayCounts = { present: 0, absent: 0, late: 0, excused: 0 };
    for (const record of todayRecords) {
      if (record.status === "PRESENT") todayCounts.present += 1;
      else if (record.status === "ABSENT") todayCounts.absent += 1;
      else if (record.status === "LATE") todayCounts.late += 1;
      else todayCounts.excused += 1;
    }
    const markedToday = todayRecords.length;

    const trendMap = new Map<string, { present: number; late: number; absent: number; marked: number }>();
    for (const record of trendRecords) {
      const key = dateOnly(record.date);
      const bucket = trendMap.get(key) ?? { present: 0, late: 0, absent: 0, marked: 0 };
      bucket.marked += 1;
      if (record.status === "PRESENT") bucket.present += 1;
      else if (record.status === "LATE") bucket.late += 1;
      else if (record.status === "ABSENT") bucket.absent += 1;
      trendMap.set(key, bucket);
    }
    const attendanceTrend = Array.from({ length: 14 }, (_, index) => {
      const key = dateOnly(addDays(trendStart, index));
      const bucket = trendMap.get(key) ?? { present: 0, late: 0, absent: 0, marked: 0 };
      return {
        date: key,
        present: bucket.present,
        late: bucket.late,
        absent: bucket.absent,
        marked: bucket.marked,
        rate: bucket.marked ? percentage(bucket.present + bucket.late, bucket.marked) : 0,
      };
    });

    const studentPerformance = new Map<
      string,
      { name: string; className: string; sum: number; count: number }
    >();

    const gradeCounts: Record<string, number> = { "A+": 0, A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
    for (const mark of publishedMarks) {
      const examSubject = mark.exam.subjects.find((item) => item.subjectId === mark.subjectId);
      const max = examSubject?.maxMarks ?? 100;
      const score = (mark.marks / max) * 100;
      const existing = studentPerformance.get(mark.student.id) ?? {
        name: `${mark.student.firstName} ${mark.student.lastName}`,
        className: `${mark.student.class.name} ${mark.student.class.section}`,
        sum: 0,
        count: 0,
      };
      existing.sum += score;
      existing.count += 1;
      studentPerformance.set(mark.student.id, existing);
    }

    const topStudents = [...studentPerformance.values()]
      .filter((entry) => entry.count >= 3)
      .map((entry) => ({
        name: entry.name,
        className: entry.className,
        average: round(entry.sum / entry.count),
      }))
      .sort((a, b) => b.average - a.average)
      .slice(0, 5);

    for (const entry of studentPerformance.values()) {
      if (entry.count < 1) continue;
      const grade = gradeFor(entry.sum / entry.count);
      gradeCounts[grade] = (gradeCounts[grade] ?? 0) + 1;
    }

    const studentAttendance = new Map<
      string,
      { name: string; className: string; present: number; total: number }
    >();
    for (const record of recentAttendance) {
      const existing = studentAttendance.get(record.studentId) ?? {
        name: `${record.student.firstName} ${record.student.lastName}`,
        className: `${record.student.class.name} ${record.student.class.section}`,
        present: 0,
        total: 0,
      };
      existing.total += 1;
      if (record.status === "PRESENT" || record.status === "LATE") existing.present += 1;
      studentAttendance.set(record.studentId, existing);
    }
    const lowAttendance = [...studentAttendance.values()]
      .filter((entry) => entry.total >= 3)
      .map((entry) => ({
        name: entry.name,
        className: entry.className,
        rate: percentage(entry.present, entry.total),
      }))
      .filter((entry) => entry.rate < 80)
      .sort((a, b) => a.rate - b.rate)
      .slice(0, 5);

    res.json({
      data: {
        totals: {
          students: studentCount,
          teachers: teacherCount,
          classes: classCount,
          subjects: subjectCount,
        },
        attendanceToday: {
          date: dateOnly(today),
          ...todayCounts,
          marked: markedToday,
          unmarked: Math.max(0, studentCount - markedToday),
          rate: markedToday ? percentage(todayCounts.present + todayCounts.late, markedToday) : 0,
        },
        attendanceTrend,
        classEnrollment: classes.map((cls) => ({
          id: cls.id,
          name: `${cls.name} ${cls.section}`,
          students: cls.students.length,
        })),
        upcomingExams: upcomingExams.map((exam) => ({
          id: exam.id,
          name: exam.name,
          term: exam.term,
          className: `${exam.class.name} ${exam.class.section}`,
          startDate: exam.startDate,
          endDate: exam.endDate,
          subjectCount: exam.subjects.length,
        })),
        topStudents,
        lowAttendance,
        gradeDistribution: Object.entries(gradeCounts).map(([grade, count]) => ({ grade, count })),
      },
    });
  }),
);
