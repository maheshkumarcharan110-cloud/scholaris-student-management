import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../src/app.js";
import { prisma } from "../src/db.js";

type Agent = ReturnType<typeof request.agent>;

const ADMIN = { email: "admin@scholaris.edu", password: "Admin@12345" };
const TEACHER = { email: "priya.sharma@scholaris.edu", password: "Teacher@12345" };

const today = () => new Date().toISOString().slice(0, 10);

function dateOffset(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

let admin: Agent;
let teacher: Agent;

let classId = "";
let subjectIds: string[] = [];
let teacherOwnSubjectId = "";

beforeAll(async () => {
  admin = request.agent(app);
  teacher = request.agent(app);

  const adminLogin = await admin.post("/api/auth/login").send(ADMIN);
  expect(adminLogin.status).toBe(200);
  expect(adminLogin.body.user.role).toBe("ADMIN");

  const teacherLogin = await teacher.post("/api/auth/login").send(TEACHER);
  expect(teacherLogin.status).toBe(200);
  expect(teacherLogin.body.user.role).toBe("TEACHER");

  const classesResponse = await admin.get("/api/classes");
  expect(classesResponse.status).toBe(200);
  classId = classesResponse.body.data[0].id;

  const subjectsResponse = await admin.get(`/api/subjects?classId=${classId}`);
  expect(subjectsResponse.status).toBe(200);
  subjectIds = subjectsResponse.body.data.map((subject: { id: string }) => subject.id);
  teacherOwnSubjectId =
    subjectsResponse.body.data.find(
      (subject: { teacher: { id: string } | null }) => subject.teacher?.id === teacherLogin.body.user.teacherId,
    )?.id ?? "";
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("health and authentication", () => {
  it("exposes a public health endpoint", async () => {
    const response = await request(app).get("/api/health");
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: "ok", service: "scholaris-api" });
  });

  it("rejects unauthenticated API requests", async () => {
    const response = await request(app).get("/api/dashboard");
    expect(response.status).toBe(401);
    expect(response.body.message).toMatch(/sign in/i);
  });

  it("rejects an incorrect password without leaking account state", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: ADMIN.email, password: "WrongPassword1" });
    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Incorrect email or password.");
  });

  it("returns the signed-in user", async () => {
    const response = await admin.get("/api/auth/me");
    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({ email: ADMIN.email, role: "ADMIN" });
  });

  it("validates the change-password payload and current password", async () => {
    const invalid = await admin
      .patch("/api/auth/password")
      .send({ currentPassword: ADMIN.password, newPassword: "short" });
    expect(invalid.status).toBe(422);

    const wrong = await admin
      .patch("/api/auth/password")
      .send({ currentPassword: "NotMyPassword1", newPassword: "NewPassword1" });
    expect(wrong.status).toBe(400);
    expect(wrong.body.message).toMatch(/current password/i);
  });
});

describe("role-based access control", () => {
  it("allows teachers to read shared academic data", async () => {
    const [students, classes, attendance] = await Promise.all([
      teacher.get("/api/students"),
      teacher.get("/api/classes"),
      teacher.get(`/api/attendance?classId=${classId}&date=${today()}`),
    ]);
    expect(students.status).toBe(200);
    expect(classes.status).toBe(200);
    expect(attendance.status).toBe(200);
  });

  it("blocks teachers from administrator-only resources", async () => {
    const [teachers, createStudent, createClass] = await Promise.all([
      teacher.get("/api/teachers"),
      teacher.post("/api/students").send({}),
      teacher.post("/api/classes").send({}),
    ]);
    expect(teachers.status).toBe(403);
    expect(createStudent.status).toBe(403);
    expect(createClass.status).toBe(403);
  });
});

describe("dashboard and reports", () => {
  it("returns aggregated dashboard metrics", async () => {
    const response = await admin.get("/api/dashboard");
    expect(response.status).toBe(200);
    expect(response.body.data.totals).toMatchObject({
      students: expect.any(Number),
      teachers: expect.any(Number),
      classes: 4,
      subjects: 20,
    });
    expect(response.body.data.attendanceTrend).toHaveLength(14);
    expect(response.body.data.gradeDistribution.length).toBeGreaterThan(0);
  });

  it("returns an attendance report for a class", async () => {
    const response = await admin
      .get("/api/reports/attendance")
      .query({ classId, from: dateOffset(-35), to: today() });
    expect(response.status).toBe(200);
    expect(response.body.data.rows.length).toBeGreaterThan(0);
    expect(response.body.data.totals.students).toBeGreaterThan(0);
    expect(response.body.data.daily.length).toBeGreaterThan(0);
  });

  it("returns performance results for a published exam", async () => {
    const exams = await admin.get("/api/exams");
    const published = exams.body.data.find((exam: { status: string }) => exam.status === "PUBLISHED");
    expect(published).toBeTruthy();

    const response = await admin
      .get("/api/reports/performance")
      .query({ examId: published.id });
    expect(response.status).toBe(200);
    expect(response.body.data.rows.length).toBeGreaterThan(0);
    expect(response.body.data.stats.studentCount).toBeGreaterThan(0);
    expect(response.body.data.subjectAverages.length).toBeGreaterThan(0);
  });
});

describe("student lifecycle", () => {
  const admissionNo = `ADM-TEST-${Date.now()}`;
  let studentId = "";

  it("validates student input", async () => {
    const response = await admin.post("/api/students").send({
      admissionNo: "X",
      firstName: "A",
      lastName: "B",
      gender: "Unknown",
      guardianName: "G",
      guardianPhone: "1",
      classId,
      email: "not-an-email",
    });
    expect(response.status).toBe(422);
    expect(response.body.details).toBeTruthy();
  });

  it("creates a student with a guardian and class", async () => {
    const response = await admin.post("/api/students").send({
      admissionNo,
      firstName: "Test",
      lastName: "Pupil",
      gender: "Female",
      dateOfBirth: "2011-04-12",
      email: "test.pupil@student.scholaris.edu",
      phone: "+91 98765 43210",
      guardianName: "Guardian Pupil",
      guardianPhone: "+91 91234 56789",
      address: "12 Test Lane, Bengaluru",
      classId,
      status: "ACTIVE",
      enrolledAt: today(),
    });
    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({ admissionNo, firstName: "Test", status: "ACTIVE" });
    studentId = response.body.data.id;
  });

  it("rejects a duplicate admission number", async () => {
    const response = await admin.post("/api/students").send({
      admissionNo,
      firstName: "Duplicate",
      lastName: "Pupil",
      gender: "Male",
      guardianName: "Guardian",
      guardianPhone: "+91 90000 00000",
      classId,
    });
    expect(response.status).toBe(409);
  });

  it("returns the full student profile", async () => {
    const response = await admin.get(`/api/students/${studentId}`);
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      id: studentId,
      guardianName: "Guardian Pupil",
      class: { id: classId },
    });
    expect(response.body.data.attendance.total).toBe(0);
    expect(Array.isArray(response.body.data.results)).toBe(true);
  });

  it("updates a student", async () => {
    const response = await admin
      .patch(`/api/students/${studentId}`)
      .send({ firstName: "Updated", phone: null });
    expect(response.status).toBe(200);
    expect(response.body.data.firstName).toBe("Updated");
    expect(response.body.data.phone).toBeNull();
  });

  it("finds students through search and pagination", async () => {
    const response = await admin
      .get("/api/students")
      .query({ search: admissionNo, page: 1, pageSize: 5 });
    expect(response.status).toBe(200);
    expect(response.body.meta.total).toBe(1);
    expect(response.body.data[0].id).toBe(studentId);
  });

  it("archives rather than deletes a student", async () => {
    const response = await admin.delete(`/api/students/${studentId}`);
    expect(response.status).toBe(200);

    const detail = await admin.get(`/api/students/${studentId}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.status).toBe("INACTIVE");
  });
});

describe("attendance", () => {
  it("loads the daily roster and saves attendance", async () => {
    const date = today();
    const roster = await admin.get("/api/attendance").query({ classId, date });
    expect(roster.status).toBe(200);
    expect(roster.body.data.students.length).toBeGreaterThan(0);

    const selected = roster.body.data.students.slice(0, 2);
    const save = await teacher.post("/api/attendance").send({
      date,
      records: selected.map((student: { id: string }, index: number) => ({
        studentId: student.id,
        status: index === 0 ? "PRESENT" : "LATE",
        note: index === 0 ? "On time" : null,
      })),
    });
    expect(save.status).toBe(200);
    expect(save.body.data.summary).toMatchObject({ present: 1, late: 1 });

    const refreshed = await admin.get("/api/attendance").query({ classId, date });
    const first = refreshed.body.data.students.find(
      (student: { id: string }) => student.id === selected[0].id,
    );
    const second = refreshed.body.data.students.find(
      (student: { id: string }) => student.id === selected[1].id,
    );
    expect(first.status).toBe("PRESENT");
    expect(first.note).toBe("On time");
    expect(second.status).toBe("LATE");
  });

  it("rejects attendance for students outside the active class list", async () => {
    const response = await teacher.post("/api/attendance").send({
      date: today(),
      records: [{ studentId: "not-a-real-student", status: "PRESENT" }],
    });
    expect(response.status).toBe(422);
  });
});

describe("exams, marks, and publishing", () => {
  let examId = "";

  it("creates a draft exam for the class", async () => {
    const response = await admin.post("/api/exams").send({
      name: `Unit Test ${Date.now()}`,
      term: "Term 1",
      classId,
      startDate: dateOffset(-2),
      endDate: dateOffset(2),
      subjects: subjectIds.slice(0, 2).map((subjectId) => ({ subjectId, maxMarks: 100 })),
    });
    expect(response.status).toBe(201);
    expect(response.body.data.subjectCount).toBe(2);
    expect(response.body.data.status).toBe("DRAFT");
    examId = response.body.data.id;
  });

  it("saves marks and computes results with ranks", async () => {
    const detail = await admin.get(`/api/exams/${examId}`);
    expect(detail.status).toBe(200);
    const [first, second] = detail.body.data.students;

    const save = await admin.post(`/api/exams/${examId}/marks`).send({
      subjectId: subjectIds[0],
      marks: [
        { studentId: first.id, marks: 92 },
        { studentId: second.id, marks: 71 },
      ],
    });
    expect(save.status).toBe(200);

    const results = await admin.get(`/api/exams/${examId}/results`);
    expect(results.status).toBe(200);
    expect(results.body.data.rows.length).toBe(detail.body.data.students.length);
    expect(results.body.data.rows[0].rank).toBe(1);
    expect(results.body.data.stats.enteredCount).toBe(2);
    expect(results.body.data.stats.highest).toBe(92);
    const subjectAverage = results.body.data.subjectAverages.find(
      (item: { subjectId: string }) => item.subjectId === subjectIds[0],
    );
    expect(subjectAverage.entered).toBe(2);
  });

  it("rejects marks above the subject maximum", async () => {
    const detail = await admin.get(`/api/exams/${examId}`);
    const studentId = detail.body.data.students[0].id;
    const response = await admin.post(`/api/exams/${examId}/marks`).send({
      subjectId: subjectIds[0],
      marks: [{ studentId, marks: 101 }],
    });
    expect(response.status).toBe(422);
  });

  it("restricts teachers to their own subjects", async () => {
    const detail = await teacher.get(`/api/exams/${examId}`);
    expect(detail.status).toBe(200);
    const studentId = detail.body.data.students[0].id;
    const otherSubject = subjectIds.find((id) => id !== teacherOwnSubjectId);
    expect(otherSubject).toBeTruthy();

    const response = await teacher.post(`/api/exams/${examId}/marks`).send({
      subjectId: otherSubject,
      marks: [{ studentId, marks: 80 }],
    });
    expect(response.status).toBe(403);
  });

  it("locks marks once results are published and unlocks when reverted", async () => {
    const publish = await admin.patch(`/api/exams/${examId}`).send({ status: "PUBLISHED" });
    expect(publish.status).toBe(200);

    const detail = await admin.get(`/api/exams/${examId}`);
    const studentId = detail.body.data.students[0].id;

    const locked = await admin.post(`/api/exams/${examId}/marks`).send({
      subjectId: subjectIds[0],
      marks: [{ studentId, marks: 88 }],
    });
    expect(locked.status).toBe(409);

    const deletePublished = await admin.delete(`/api/exams/${examId}`);
    expect(deletePublished.status).toBe(409);

    const unpublish = await admin.patch(`/api/exams/${examId}`).send({ status: "DRAFT" });
    expect(unpublish.status).toBe(200);

    const remove = await admin.delete(`/api/exams/${examId}`);
    expect(remove.status).toBe(200);
  });
});

describe("session logout", () => {
  it("clears the session cookie", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send(ADMIN).expect(200);
    await agent.get("/api/auth/me").expect(200);
    await agent.post("/api/auth/logout").expect(200);
    const response = await agent.get("/api/auth/me");
    expect(response.status).toBe(401);
  });
});
