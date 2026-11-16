import { prisma } from "../db.js";
import { dateOnly, eachDateKey } from "./dates.js";
import { percentage } from "./grades.js";

export type AttendanceRow = {
  student: {
    id: string;
    firstName: string;
    lastName: string;
    admissionNo: string;
  };
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
  rate: number;
};

export async function buildAttendanceReport(classId: string, from: Date, to: Date) {
  const cls = await prisma.class.findUnique({
    where: { id: classId },
    select: { id: true, name: true, section: true, academicYear: true },
  });
  if (!cls) return null;

  const [students, records] = await Promise.all([
    prisma.student.findMany({
      where: { classId, status: "ACTIVE" },
      select: { id: true, firstName: true, lastName: true, admissionNo: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.attendance.findMany({
      where: {
        date: { gte: from, lte: to },
        student: { classId, status: "ACTIVE" },
      },
      select: { studentId: true, date: true, status: true },
    }),
  ]);

  const byStudent = new Map<string, typeof records>();
  for (const record of records) {
    const list = byStudent.get(record.studentId) ?? [];
    list.push(record);
    byStudent.set(record.studentId, list);
  }

  const rows: AttendanceRow[] = students.map((student) => {
    const own = byStudent.get(student.id) ?? [];
    const present = own.filter((record) => record.status === "PRESENT").length;
    const absent = own.filter((record) => record.status === "ABSENT").length;
    const late = own.filter((record) => record.status === "LATE").length;
    const excused = own.filter((record) => record.status === "EXCUSED").length;
    const total = own.length;
    return {
      student,
      present,
      absent,
      late,
      excused,
      total,
      rate: total ? percentage(present + late, total) : 0,
    };
  });

  const totals = rows.reduce(
    (acc, row) => ({
      present: acc.present + row.present,
      absent: acc.absent + row.absent,
      late: acc.late + row.late,
      excused: acc.excused + row.excused,
      marked: acc.marked + row.total,
    }),
    { present: 0, absent: 0, late: 0, excused: 0, marked: 0 },
  );

  const daily = eachDateKey(from, to).map((key) => {
    const dayRecords = records.filter((record) => dateOnly(record.date) === key);
    const present = dayRecords.filter((record) => record.status === "PRESENT").length;
    const late = dayRecords.filter((record) => record.status === "LATE").length;
    return {
      date: key,
      present,
      late,
      absent: dayRecords.filter((record) => record.status === "ABSENT").length,
      marked: dayRecords.length,
      rate: dayRecords.length ? percentage(present + late, dayRecords.length) : 0,
    };
  });

  return {
    class: cls,
    from: dateOnly(from),
    to: dateOnly(to),
    rows,
    totals: {
      ...totals,
      rate: totals.marked ? percentage(totals.present + totals.late, totals.marked) : 0,
      students: students.length,
    },
    daily,
  };
}
