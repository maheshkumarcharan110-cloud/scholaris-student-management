import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

let seedState = 987654321;
function random() {
  seedState = (seedState * 1664525 + 1013904223) >>> 0;
  return seedState / 4294967296;
}
function pick<T>(items: T[]): T {
  return items[Math.floor(random() * items.length)];
}
function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
function utcDay(offset: number) {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + offset));
}
function isWeekend(date: Date) {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

const ACADEMIC_YEAR = "2026/2027";

async function main() {
  console.log("Seeding Scholaris demo data...");

  await prisma.mark.deleteMany();
  await prisma.examSubject.deleteMany();
  await prisma.exam.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.student.deleteMany();
  await prisma.class.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.user.deleteMany();

  const adminPassword = await bcrypt.hash("Admin@12345", 12);
  await prisma.user.create({
    data: {
      name: "Ananya Rao",
      email: "admin@scholaris.edu",
      passwordHash: adminPassword,
      role: "ADMIN",
    },
  });

  const teacherSeed = [
    { name: "Priya Sharma", email: "priya.sharma@scholaris.edu", employeeNo: "EMP-001", phone: "+91 98200 11001", qualification: "M.Sc. Mathematics, B.Ed." },
    { name: "Daniel Okafor", email: "daniel.okafor@scholaris.edu", employeeNo: "EMP-002", phone: "+91 98200 11002", qualification: "M.A. English Literature" },
    { name: "Meera Krishnan", email: "meera.krishnan@scholaris.edu", employeeNo: "EMP-003", phone: "+91 98200 11003", qualification: "M.Sc. Physics, B.Ed." },
    { name: "James Whitfield", email: "james.whitfield@scholaris.edu", employeeNo: "EMP-004", phone: "+91 98200 11004", qualification: "M.A. History" },
    { name: "Sofia Alvarez", email: "sofia.alvarez@scholaris.edu", employeeNo: "EMP-005", phone: "+91 98200 11005", qualification: "MCA, Computer Science" },
  ];

  const teacherPassword = await bcrypt.hash("Teacher@12345", 12);
  const teacherIds: string[] = [];
  const teacherUserIds: string[] = [];
  for (const teacher of teacherSeed) {
    const user = await prisma.user.create({
      data: {
        name: teacher.name,
        email: teacher.email,
        passwordHash: teacherPassword,
        role: "TEACHER",
        teacher: {
          create: {
            employeeNo: teacher.employeeNo,
            phone: teacher.phone,
            qualification: teacher.qualification,
          },
        },
      },
      include: { teacher: true },
    });
    teacherIds.push(user.teacher!.id);
    teacherUserIds.push(user.id);
  }

  const classSeed = [
    { name: "Grade 9", section: "A", room: "Block A · Room 201" },
    { name: "Grade 9", section: "B", room: "Block A · Room 202" },
    { name: "Grade 10", section: "A", room: "Block B · Room 301" },
    { name: "Grade 10", section: "B", room: "Block B · Room 302" },
  ];

  const classes = [];
  for (let index = 0; index < classSeed.length; index++) {
    const item = classSeed[index];
    const cls = await prisma.class.create({
      data: {
        name: item.name,
        section: item.section,
        academicYear: ACADEMIC_YEAR,
        room: item.room,
        classTeacherId: teacherIds[index % teacherIds.length],
      },
    });
    classes.push(cls);
  }

  const subjectSeed = [
    { name: "Mathematics", code: "MATH" },
    { name: "English", code: "ENG" },
    { name: "Science", code: "SCI" },
    { name: "Social Studies", code: "SOC" },
    { name: "Computer Science", code: "CS" },
  ];

  const subjectsByClass = new Map<string, Array<{ id: string; teacherId: string | null }>>();
  for (let classIndex = 0; classIndex < classes.length; classIndex++) {
    const cls = classes[classIndex];
    const subjects = [];
    for (let subjectIndex = 0; subjectIndex < subjectSeed.length; subjectIndex++) {
      const item = subjectSeed[subjectIndex];
      const teacherId = teacherIds[(classIndex + subjectIndex) % teacherIds.length];
      const subject = await prisma.subject.create({
        data: {
          name: item.name,
          code: `${item.code}-${cls.name.replace("Grade ", "")}${cls.section}`,
          classId: cls.id,
          teacherId,
        },
      });
      subjects.push({ id: subject.id, teacherId });
    }
    subjectsByClass.set(cls.id, subjects);
  }

  const firstNames = [
    "Aarav", "Ishita", "Rohan", "Meera", "Kabir", "Anaya", "Vivaan", "Saanvi", "Arjun", "Diya",
    "Aditya", "Kiara", "Neel", "Tara", "Reyansh", "Aisha", "Dev", "Myra", "Kunal", "Zara",
    "Rahul", "Nisha", "Omar", "Leila", "Sam", "Elena", "Noah", "Maya", "Liam", "Sofia",
    "Ethan", "Amara", "Lucas", "Nadia", "Owen", "Priya", "Jonah", "Lina", "Marcus", "Chloe",
    "Imran", "Hana", "Theo", "Ruby", "Yusuf", "Eva", "Dylan", "Sana", "Ayaan", "Grace",
  ];
  const lastNames = [
    "Sharma", "Patel", "Khan", "Reddy", "Nair", "Iyer", "Gupta", "Mehta", "Singh", "Kapoor",
    "Verma", "Das", "Kumar", "Joshi", "Bose", "Rao", "Chowdhury", "Menon", "Shah", "Pillai",
  ];
  const parentFirst = ["Rakesh", "Sunita", "Amit", "Kavita", "Rajesh", "Deepa", "Vikram", "Lakshmi"];

  let admissionCounter = 0;
  for (let classIndex = 0; classIndex < classes.length; classIndex++) {
    const cls = classes[classIndex];
    const count = classIndex === classes.length - 1 ? 13 : 12;
    const students = [];
    for (let index = 0; index < count; index++) {
      const globalIndex = admissionCounter;
      const firstName = firstNames[globalIndex % firstNames.length];
      const lastName = lastNames[(globalIndex * 3) % lastNames.length];
      const isLastArchived = classIndex === classes.length - 1 && index === count - 1;
      const gradeDigits = cls.name.includes("10") ? 2009 : 2010;
      students.push({
        admissionNo: `ADM-2026-${String(admissionCounter + 1).padStart(3, "0")}`,
        firstName,
        lastName,
        gender: index % 2 === 0 ? "Female" : "Male",
        dateOfBirth: new Date(Date.UTC(gradeDigits, (globalIndex % 12), ((globalIndex * 3) % 27) + 1)),
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${admissionCounter + 1}@student.scholaris.edu`,
        phone: `+91 98${String(76500000 + admissionCounter * 137).padStart(8, "0")}`,
        guardianName: `${parentFirst[globalIndex % parentFirst.length]} ${lastName}`,
        guardianPhone: `+91 90${String(43210000 + admissionCounter * 211).padStart(8, "0")}`,
        address: `${100 + globalIndex} ${pick(["Maple", "Cedar", "Lakeside", "Rosewood", "Hillcrest"])} ${pick(["Street", "Avenue", "Lane", "Road"])}, Bengaluru`,
        status: isLastArchived ? ("INACTIVE" as const) : ("ACTIVE" as const),
        classId: cls.id,
      });
      admissionCounter += 1;
    }
    await prisma.student.createMany({ data: students });
  }

  const allStudents = await prisma.student.findMany({ include: { class: true } });

  // Attendance for the last three school weeks, including today.
  const attendanceRows: Array<{
    studentId: string;
    date: Date;
    status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
    recordedById: string;
    note: string | null;
  }> = [];

  const attendanceDates: Date[] = [];
  for (let offset = -20; offset <= 0; offset++) {
    const day = utcDay(offset);
    if (!isWeekend(day)) attendanceDates.push(day);
  }

  for (let index = 0; index < allStudents.length; index++) {
    const student = allStudents[index];
    if (student.status !== "ACTIVE") continue;
    // A few students deliberately have lower attendance so reports show useful signals.
    const attendanceFactor = 0.7 + (index % 12) * 0.026;
    for (const date of attendanceDates) {
      const roll = random();
      let status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
      if (roll < attendanceFactor) status = "PRESENT";
      else if (roll < attendanceFactor + 0.05) status = "LATE";
      else if (roll < attendanceFactor + 0.11) status = "ABSENT";
      else status = "EXCUSED";

      // Make today's snapshot mostly present for a healthy dashboard.
      if (date.getTime() === utcDay(0).getTime() && random() < 0.88) status = "PRESENT";

      attendanceRows.push({
        studentId: student.id,
        date,
        status,
        recordedById: teacherUserIds[index % teacherUserIds.length],
        note: status === "EXCUSED" ? "Excused absence — guardian informed" : null,
      });
    }
  }
  await prisma.attendance.createMany({ data: attendanceRows });

  // Published mid-term exam per class, plus an upcoming draft exam.
  for (let classIndex = 0; classIndex < classes.length; classIndex++) {
    const cls = classes[classIndex];
    const subjects = subjectsByClass.get(cls.id)!;
    const classStudents = allStudents.filter(
      (student) => student.classId === cls.id && student.status === "ACTIVE",
    );

    const midTerm = await prisma.exam.create({
      data: {
        name: "Mid-Term Assessment",
        term: "Term 1",
        classId: cls.id,
        startDate: utcDay(-26),
        endDate: utcDay(-21),
        status: "PUBLISHED",
        subjects: {
          create: subjects.map((subject) => ({ subjectId: subject.id, maxMarks: 100 })),
        },
      },
    });

    const markRows: Array<{
      examId: string;
      subjectId: string;
      studentId: string;
      marks: number;
      recordedById: string;
    }> = [];

    for (let studentIndex = 0; studentIndex < classStudents.length; studentIndex++) {
      const student = classStudents[studentIndex];
      const ability = 0.52 + ((studentIndex * 7 + classIndex * 3) % 44) / 100;
      for (let subjectIndex = 0; subjectIndex < subjects.length; subjectIndex++) {
        // Leave a handful of blanks so progress indicators are meaningful.
        if (random() < 0.035) continue;
        const subject = subjects[subjectIndex];
        const noise = (random() - 0.5) * 10;
        const score = clamp(Math.round(ability * 100 + noise - subjectIndex * 1.2), 28, 99);
        markRows.push({
          examId: midTerm.id,
          subjectId: subject.id,
          studentId: student.id,
          marks: score,
          recordedById: subject.teacherId!,
        });
      }
    }
    await prisma.mark.createMany({ data: markRows });

    await prisma.exam.create({
      data: {
        name: "Final Examination",
        term: "Term 2",
        classId: cls.id,
        startDate: utcDay(14 + classIndex),
        endDate: utcDay(19 + classIndex),
        status: "DRAFT",
        subjects: {
          create: subjects.map((subject) => ({ subjectId: subject.id, maxMarks: 100 })),
        },
      },
    });
  }

  console.log("Seed complete:");
  console.log(`  ${classes.length} classes · ${allStudents.length} students · ${teacherSeed.length} teachers`);
  console.log(`  ${attendanceRows.length} attendance records · 4 published exams with marks`);
  console.log("\nSign in with:");
  console.log("  Administrator  admin@scholaris.edu      / Admin@12345");
  console.log("  Teacher        priya.sharma@scholaris.edu / Teacher@12345");
  console.log("  Teacher        sofia.alvarez@scholaris.edu / Teacher@12345\n");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
