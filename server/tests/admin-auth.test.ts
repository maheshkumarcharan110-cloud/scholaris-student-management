import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../src/app.js";
import { prisma } from "../src/db.js";

type Agent = ReturnType<typeof request.agent>;

if (!process.env.ADMIN_PASSWORD) {
  throw new Error("ADMIN_PASSWORD is missing. Add it to server/.env before running the API suite.");
}

const ADMIN = {
  email: process.env.ADMIN_EMAIL ?? "admin@scholaris.edu",
  password: process.env.ADMIN_PASSWORD,
};
const PASSWORD = "Scholaris@2026";

function tokenFromUrl(url: string) {
  const parsed = new URL(url);
  return parsed.searchParams.get("token") ?? "";
}

const stamp = Date.now();
const teacherEmail = `workflow.teacher.${stamp}@scholaris.test`;
const studentEmail = `workflow.student.${stamp}@scholaris.test`;
const rejectedEmail = `workflow.rejected.${stamp}@scholaris.test`;
const suspendedEmail = `workflow.suspended.${stamp}@scholaris.test`;

let admin: Agent;
let approvedTeacher: Agent;

let teacherId = "";
let studentId = "";
let rejectedId = "";
let suspendedId = "";

beforeAll(async () => {
  admin = request.agent(app);
  const login = await admin.post("/api/auth/login").send(ADMIN);
  expect(login.status).toBe(200);
  expect(login.body.user.role).toBe("SUPER_ADMIN");
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("public registration workflow", () => {
  it("validates password strength and role requests", async () => {
    const weak = await request(app).post("/api/auth/register").send({
      name: "Weak Password",
      email: `weak.${stamp}@scholaris.test`,
      password: "short",
      confirmPassword: "short",
      requestedRole: "TEACHER",
    });
    expect(weak.status).toBe(422);

    const privileged = await request(app).post("/api/auth/register").send({
      name: "Privilege Attempt",
      email: `privilege.${stamp}@scholaris.test`,
      password: PASSWORD,
      confirmPassword: PASSWORD,
      requestedRole: "SUPER_ADMIN",
    });
    expect(privileged.status).toBe(422);
  });

  it("registers a teacher as PENDING without granting access", async () => {
    const response = await request(app).post("/api/auth/register").send({
      name: "Workflow Teacher",
      email: teacherEmail,
      phone: "+91 90000 11111",
      password: PASSWORD,
      confirmPassword: PASSWORD,
      requestedRole: "TEACHER",
    });

    expect(response.status).toBe(201);
    expect(response.body.message).toBe(
      "Your account has been created successfully. Your registration is awaiting approval from the administrator. You will be able to access Scholaris once your account has been approved.",
    );
    expect(response.body.status).toBe("PENDING");

    const stored = await prisma.user.findUnique({ where: { email: teacherEmail } });
    expect(stored?.status).toBe("PENDING");
    expect(stored?.active).toBe(false);
    expect(stored?.passwordHash).not.toBe(PASSWORD);
    expect(stored?.passwordHash.startsWith("$2")).toBe(true);
    teacherId = stored!.id;

    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: teacherEmail, password: PASSWORD });
    expect(login.status).toBe(403);
    expect(login.body.code).toBe("PENDING");
    expect(login.body.message).toMatch(/awaiting administrator approval/i);
  });

  it("rejects duplicate email addresses", async () => {
    const response = await request(app).post("/api/auth/register").send({
      name: "Workflow Teacher",
      email: teacherEmail,
      password: PASSWORD,
      confirmPassword: PASSWORD,
      requestedRole: "TEACHER",
    });
    expect(response.status).toBe(409);
    expect(response.body.code).toBe("EMAIL_TAKEN");
  });

  it("verifies the registered email through a one-time link", async () => {
    const resend = await request(app)
      .post("/api/auth/resend-verification")
      .send({ email: teacherEmail });
    expect(resend.status).toBe(200);
    expect(typeof resend.body.verificationUrl).toBe("string");

    const verify = await request(app)
      .post("/api/auth/verify-email")
      .send({ token: tokenFromUrl(resend.body.verificationUrl) });
    expect(verify.status).toBe(200);

    const stored = await prisma.user.findUnique({ where: { id: teacherId } });
    expect(stored?.emailVerifiedAt).toBeTruthy();
  });
});

describe("administrator approval", () => {
  it("lists pending registrations with approval metadata", async () => {
    const response = await admin.get("/api/admin/users").query({ status: "PENDING", search: teacherEmail });
    expect(response.status).toBe(200);
    const row = response.body.data.find((user: { id: string }) => user.id === teacherId);
    expect(row).toMatchObject({
      status: "PENDING",
      requestedRole: "TEACHER",
      emailVerified: true,
    });
  });

  it("approves the registration and records who approved it", async () => {
    const response = await admin.post(`/api/admin/users/${teacherId}/approve`).send({ role: "TEACHER" });
    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({ status: "APPROVED", active: true, role: "TEACHER" });
    expect(response.body.user.approvedAt).toBeTruthy();
    expect(response.body.user.approvedBy?.name).toBe(process.env.ADMIN_NAME ?? "Mahesh Kumar");

    const audit = await prisma.auditLog.findFirst({
      where: { targetUserId: teacherId, action: "ACCOUNT_APPROVED" },
    });
    expect(audit).toBeTruthy();
  });

  it("allows the approved user to sign in and use their workspace", async () => {
    approvedTeacher = request.agent(app);
    const login = await approvedTeacher.post("/api/auth/login").send({ email: teacherEmail, password: PASSWORD });
    expect(login.status).toBe(200);
    expect(login.body.user.role).toBe("TEACHER");

    const dashboard = await approvedTeacher.get("/api/dashboard");
    expect(dashboard.status).toBe(200);
  });

  it("blocks the approved teacher from administrator APIs and pages", async () => {
    const users = await approvedTeacher.get("/api/admin/users");
    expect(users.status).toBe(403);

    const activity = await approvedTeacher.get("/api/admin/activity");
    expect(activity.status).toBe(403);

    const roleChange = await approvedTeacher.patch(`/api/admin/users/${teacherId}/role`).send({ role: "STUDENT" });
    expect(roleChange.status).toBe(403);
  });
});

describe("status enforcement", () => {
  it("denies an incorrect password with a generic message", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: teacherEmail, password: "WrongPassword@2026" });
    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Incorrect email or password.");
  });

  it("rejects an account and denies login", async () => {
    await request(app).post("/api/auth/register").send({
      name: "Rejected Applicant",
      email: rejectedEmail,
      password: PASSWORD,
      confirmPassword: PASSWORD,
      requestedRole: "STUDENT",
    });
    const stored = await prisma.user.findUniqueOrThrow({ where: { email: rejectedEmail } });
    rejectedId = stored.id;

    const rejected = await admin
      .post(`/api/admin/users/${rejectedId}/reject`)
      .send({ reason: "Could not verify school affiliation" });
    expect(rejected.status).toBe(200);
    expect(rejected.body.user.status).toBe("REJECTED");

    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: rejectedEmail, password: PASSWORD });
    expect(login.status).toBe(403);
    expect(login.body.code).toBe("REJECTED");
  });

  it("suspends an approved account and revokes its existing session", async () => {
    await request(app).post("/api/auth/register").send({
      name: "Suspended Applicant",
      email: suspendedEmail,
      password: PASSWORD,
      confirmPassword: PASSWORD,
      requestedRole: "STUDENT",
    });
    const stored = await prisma.user.findUniqueOrThrow({ where: { email: suspendedEmail } });
    suspendedId = stored.id;

    await admin.post(`/api/admin/users/${suspendedId}/approve`).send({ role: "STUDENT" });

    const agent = request.agent(app);
    const login = await agent.post("/api/auth/login").send({ email: suspendedEmail, password: PASSWORD });
    expect(login.status).toBe(200);

    const suspend = await admin
      .post(`/api/admin/users/${suspendedId}/suspend`)
      .send({ reason: "Policy review" });
    expect(suspend.status).toBe(200);
    expect(suspend.body.user.status).toBe("SUSPENDED");

    const existingSession = await agent.get("/api/auth/me");
    expect([401, 403]).toContain(existingSession.status);

    const relogin = await request(app)
      .post("/api/auth/login")
      .send({ email: suspendedEmail, password: PASSWORD });
    expect(relogin.status).toBe(403);
    expect(relogin.body.code).toBe("SUSPENDED");

    const reactivate = await admin.post(`/api/admin/users/${suspendedId}/reactivate`).send({});
    expect(reactivate.status).toBe(200);
    expect(reactivate.body.user.status).toBe("APPROVED");
  });

  it("limits students to their own account APIs", async () => {
    await request(app).post("/api/auth/register").send({
      name: "Workflow Student",
      email: studentEmail,
      password: PASSWORD,
      confirmPassword: PASSWORD,
      requestedRole: "STUDENT",
    });
    const stored = await prisma.user.findUniqueOrThrow({ where: { email: studentEmail } });
    studentId = stored.id;

    await admin.post(`/api/admin/users/${studentId}/approve`).send({ role: "STUDENT" });

    const student = request.agent(app);
    const login = await student.post("/api/auth/login").send({ email: studentEmail, password: PASSWORD });
    expect(login.status).toBe(200);
    expect(login.body.user.role).toBe("STUDENT");

    expect((await student.get("/api/auth/me")).status).toBe(200);
    expect((await student.get("/api/dashboard")).status).toBe(403);
    expect((await student.get("/api/students")).status).toBe(403);
    expect((await student.get("/api/admin/users")).status).toBe(403);
  });
});

describe("account security", () => {
  it("requires the current password and blocks privilege escalation", async () => {
    const wrong = await approvedTeacher
      .patch("/api/auth/password")
      .send({ currentPassword: "NotMyPassword@2026", newPassword: "AnotherPass@2026" });
    expect(wrong.status).toBe(400);

    const escalate = await approvedTeacher
      .patch(`/api/admin/users/${teacherId}/role`)
      .send({ role: "SUPER_ADMIN" });
    expect(escalate.status).toBe(403);
  });

  it("changes a password and invalidates the old credentials", async () => {
    const changed = await approvedTeacher
      .patch("/api/auth/password")
      .send({ currentPassword: PASSWORD, newPassword: "TeacherNew@2026" });
    expect(changed.status).toBe(200);

    const oldLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: teacherEmail, password: PASSWORD });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: teacherEmail, password: "TeacherNew@2026" });
    expect(newLogin.status).toBe(200);
  });

  it("requires verification before a new email becomes active", async () => {
    const nextEmail = `workflow.teacher.updated.${stamp}@scholaris.test`;
    const requested = await approvedTeacher
      .post("/api/auth/email-change")
      .send({ newEmail: nextEmail, currentPassword: "TeacherNew@2026" });
    expect(requested.status).toBe(200);
    expect(typeof requested.body.verificationUrl).toBe("string");

    // The old address still works until the new one is confirmed.
    const beforeVerification = await request(app)
      .post("/api/auth/login")
      .send({ email: teacherEmail, password: "TeacherNew@2026" });
    expect(beforeVerification.status).toBe(200);

    const verified = await request(app)
      .post("/api/auth/verify-email-change")
      .send({ token: tokenFromUrl(requested.body.verificationUrl) });
    expect(verified.status).toBe(200);

    const oldAddress = await request(app)
      .post("/api/auth/login")
      .send({ email: teacherEmail, password: "TeacherNew@2026" });
    expect(oldAddress.status).toBe(401);

    const newAddress = await request(app)
      .post("/api/auth/login")
      .send({ email: nextEmail, password: "TeacherNew@2026" });
    expect(newAddress.status).toBe(200);
  });

  it("allows the Super Administrator to change and restore their password", async () => {
    const temporary = "MaheshTemp@2026";
    const changed = await admin
      .patch("/api/auth/password")
      .send({ currentPassword: ADMIN.password, newPassword: temporary });
    expect(changed.status).toBe(200);

    const restored = await admin
      .patch("/api/auth/password")
      .send({ currentPassword: temporary, newPassword: ADMIN.password });
    expect(restored.status).toBe(200);

    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: ADMIN.email, password: ADMIN.password });
    expect(login.status).toBe(200);
    expect(login.body.user.role).toBe("SUPER_ADMIN");
  });

  it("changes and restores the Super Administrator email through verification", async () => {
    const temporaryEmail = `admin.workflow.${stamp}@scholaris.test`;

    const requested = await admin
      .post("/api/auth/email-change")
      .send({ newEmail: temporaryEmail, currentPassword: ADMIN.password });
    expect(requested.status).toBe(200);

    const verified = await request(app)
      .post("/api/auth/verify-email-change")
      .send({ token: tokenFromUrl(requested.body.verificationUrl) });
    expect(verified.status).toBe(200);

    const newSession = request.agent(app);
    const newLogin = await newSession
      .post("/api/auth/login")
      .send({ email: temporaryEmail, password: ADMIN.password });
    expect(newLogin.status).toBe(200);

    const restored = await newSession
      .post("/api/auth/email-change")
      .send({ newEmail: ADMIN.email, currentPassword: ADMIN.password });
    expect(restored.status).toBe(200);

    const finalVerify = await request(app)
      .post("/api/auth/verify-email-change")
      .send({ token: tokenFromUrl(restored.body.verificationUrl) });
    expect(finalVerify.status).toBe(200);

    const finalLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: ADMIN.email, password: ADMIN.password });
    expect(finalLogin.status).toBe(200);
  });

  it("blocks state-changing requests from untrusted origins", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .set("Origin", "https://evil.example")
      .send(ADMIN);
    expect(response.status).toBe(403);
  });
});
