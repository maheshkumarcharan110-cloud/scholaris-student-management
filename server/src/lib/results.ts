import type { Prisma } from "@prisma/client";
import { gradeFor, percentage, round } from "../lib/grades.js";
import { prisma } from "../db.js";

export async function buildExamResults(examId: string) {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      class: { select: { id: true, name: true, section: true, academicYear: true } },
      subjects: { include: { subject: { select: { id: true, name: true, code: true } } } },
      marks: true,
    },
  });

  if (!exam) return null;

  const students = await prisma.student.findMany({
    where: { classId: exam.classId, status: "ACTIVE" },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: { id: true, firstName: true, lastName: true, admissionNo: true },
  });

  const maxTotal = exam.subjects.reduce((sum, subject) => sum + subject.maxMarks, 0);

  const rows = students.map((student) => {
    const subjectMarks = exam.subjects.map((examSubject) => {
      const mark = exam.marks.find(
        (item) => item.studentId === student.id && item.subjectId === examSubject.subjectId,
      );
      return {
        subjectId: examSubject.subjectId,
        name: examSubject.subject.name,
        code: examSubject.subject.code,
        maxMarks: examSubject.maxMarks,
        marks: mark ? mark.marks : null,
      };
    });

    const entered = subjectMarks.filter((item) => item.marks !== null);
    const total = entered.reduce((sum, item) => sum + (item.marks ?? 0), 0);
    const enteredMax = entered.reduce((sum, item) => sum + item.maxMarks, 0);
    const pct = percentage(total, enteredMax);

    return {
      student,
      subjects: subjectMarks,
      total: round(total),
      enteredSubjects: entered.length,
      totalSubjects: subjectMarks.length,
      percentage: pct,
      grade: gradeFor(pct),
    };
  });

  const ranked = [...rows]
    .filter((row) => row.enteredSubjects > 0)
    .sort((a, b) => b.percentage - a.percentage || a.student.lastName.localeCompare(b.student.lastName));

  const rankMap = new Map<string, number>();
  ranked.forEach((row, index) => rankMap.set(row.student.id, index + 1));

  const withRanks = rows.map((row) => ({
    ...row,
    rank: row.enteredSubjects > 0 ? (rankMap.get(row.student.id) ?? null) : null,
  }));

  const graded = withRanks.filter((row) => row.enteredSubjects > 0);
  const classAverage = graded.length
    ? round(graded.reduce((sum, row) => sum + row.percentage, 0) / graded.length)
    : 0;
  const highest = graded.length ? Math.max(...graded.map((row) => row.percentage)) : 0;
  const passed = graded.filter((row) => row.percentage >= 40).length;
  const passRate = graded.length ? percentage(passed, graded.length) : 0;

  const distribution: Record<string, number> = { "A+": 0, A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
  for (const row of graded) distribution[row.grade] = (distribution[row.grade] ?? 0) + 1;

  const subjectAverages = exam.subjects.map((examSubject) => {
    const values = exam.marks
      .filter((mark) => mark.subjectId === examSubject.subjectId)
      .map((mark) => (mark.marks / examSubject.maxMarks) * 100);
    return {
      subjectId: examSubject.subjectId,
      name: examSubject.subject.name,
      code: examSubject.subject.code,
      average: values.length ? round(values.reduce((a, b) => a + b, 0) / values.length) : 0,
      entered: values.length,
    };
  });

  return {
    exam: {
      id: exam.id,
      name: exam.name,
      term: exam.term,
      status: exam.status,
      startDate: exam.startDate,
      endDate: exam.endDate,
      class: exam.class,
      subjects: exam.subjects.map((item) => ({
        id: item.subject.id,
        name: item.subject.name,
        code: item.subject.code,
        maxMarks: item.maxMarks,
      })),
    },
    rows: withRanks,
    stats: {
      classAverage,
      highest,
      passRate,
      maxTotal,
      studentCount: students.length,
      enteredCount: graded.length,
      distribution,
    },
    subjectAverages,
  };
}

export type StudentListFilters = Prisma.StudentWhereInput;
