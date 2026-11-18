import { z } from "zod";

const dateKey = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date (YYYY-MM-DD)");

const optionalString = (max = 200) =>
  z
    .union([z.string().trim().max(max), z.null()])
    .optional()
    .transform((value) => (value === "" ? null : value));

const optionalEmail = z
  .union([z.string().trim().email("Enter a valid email address"), z.literal(""), z.null()])
  .optional()
  .transform((value) => (value === "" ? null : value));

const optionalDateKey = z
  .union([dateKey, z.literal(""), z.null()])
  .optional()
  .transform((value) => (value === "" ? null : value));

const password = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .max(72, "Password is too long")
  .regex(/[A-Za-z]/, "Password must contain a letter")
  .regex(/[0-9]/, "Password must contain a number");

const email = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address")
  .max(200, "Email address is too long");

const phone = z
  .union([z.string().trim().max(30, "Phone number is too long"), z.literal(""), z.null()])
  .optional()
  .transform((value) => (value === "" || value === null ? null : value));

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: password,
});

export const studentSchema = z.object({
  admissionNo: z
    .string()
    .trim()
    .min(2, "Admission number is too short")
    .max(24, "Admission number is too long"),
  firstName: z.string().trim().min(2, "First name is too short").max(60),
  lastName: z.string().trim().min(2, "Last name is too short").max(60),
  gender: z.enum(["Male", "Female", "Other"]),
  dateOfBirth: optionalDateKey,
  email: optionalEmail,
  phone: optionalString(30),
  guardianName: z.string().trim().min(2, "Guardian name is required").max(120),
  guardianPhone: z.string().trim().min(5, "Guardian phone is required").max(30),
  address: optionalString(300),
  classId: z.string().min(1, "Select a class"),
  status: z.enum(["ACTIVE", "INACTIVE", "GRADUATED"]).optional(),
  enrolledAt: optionalDateKey,
});

export const studentUpdateSchema = studentSchema.partial();

export const teacherCreateSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password,
  employeeNo: z.string().trim().min(2, "Employee number is required").max(24),
  phone: optionalString(30),
  qualification: optionalString(120),
});

export const teacherUpdateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  email: z.string().trim().toLowerCase().email().optional(),
  phone: optionalString(30),
  qualification: optionalString(120),
  active: z.boolean().optional(),
  password: password.optional(),
});

export const classCreateSchema = z.object({
  name: z.string().trim().min(1, "Class name is required").max(60),
  section: z.string().trim().min(1, "Section is required").max(10),
  academicYear: z
    .string()
    .trim()
    .regex(/^\d{4}\/\d{4}$/, "Use the format 2026/2027"),
  room: optionalString(40),
  classTeacherId: z
    .union([z.string(), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v === "" ? null : v)),
});

export const classUpdateSchema = classCreateSchema.partial();

export const subjectCreateSchema = z.object({
  name: z.string().trim().min(2, "Subject name is required").max(80),
  code: z.string().trim().min(2, "Subject code is required").max(12).toUpperCase(),
  classId: z.string().min(1, "Select a class"),
  teacherId: z
    .union([z.string(), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v === "" ? null : v)),
});

export const subjectUpdateSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  code: z.string().trim().min(2).max(12).toUpperCase().optional(),
  classId: z.string().min(1).optional(),
  teacherId: z
    .union([z.string(), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v === "" ? null : v)),
});

export const attendanceQuerySchema = z.object({
  classId: z.string().min(1, "Select a class"),
  date: dateKey,
});

export const attendanceBulkSchema = z.object({
  date: dateKey,
  records: z
    .array(
      z.object({
        studentId: z.string().min(1),
        status: z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]),
        note: optionalString(200),
      }),
    )
    .min(1, "No attendance records were provided")
    .max(500),
});

export const attendanceReportSchema = z.object({
  classId: z.string().min(1, "Select a class"),
  from: dateKey,
  to: dateKey,
});

export const examCreateSchema = z.object({
  name: z.string().trim().min(2, "Exam name is required").max(120),
  term: z.string().trim().min(1, "Term is required").max(60),
  classId: z.string().min(1, "Select a class"),
  startDate: dateKey,
  endDate: dateKey,
  subjects: z
    .array(
      z.object({
        subjectId: z.string().min(1),
        maxMarks: z.coerce.number().int().min(1).max(1000).default(100),
      }),
    )
    .optional(),
});

export const examUpdateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  term: z.string().trim().min(1).max(60).optional(),
  startDate: dateKey.optional(),
  endDate: dateKey.optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
});

export const marksBulkSchema = z.object({
  subjectId: z.string().min(1, "Select a subject"),
  marks: z
    .array(
      z.object({
        studentId: z.string().min(1),
        marks: z.number().min(0, "Marks cannot be negative").max(1000).nullable(),
      }),
    )
    .min(1)
    .max(500),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(10),
  search: z.string().trim().optional(),
  classId: z.string().trim().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "GRADUATED", "ALL"]).optional(),
});

/* ------------------------------ Account auth ------------------------------ */

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Enter your full name").max(120, "Name is too long"),
    email,
    phone,
    password,
    confirmPassword: z.string().min(1, "Confirm your password"),
    requestedRole: z.enum(["TEACHER", "STUDENT"]),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const verifyEmailSchema = z.object({
  token: z.string().min(20, "This verification link is invalid").max(200),
});

export const resendVerificationSchema = z.object({ email });

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({
    token: z.string().min(20, "This reset link is invalid").max(200),
    password,
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(120, "Name is too long"),
  phone,
});

export const emailChangeSchema = z.object({
  newEmail: email,
  currentPassword: z.string().min(1, "Enter your current password"),
});

/* ----------------------------- Administrator ----------------------------- */

const accountStatus = z.enum(["PENDING", "APPROVED", "REJECTED", "SUSPENDED", "ALL"]);
const appRole = z.enum(["SUPER_ADMIN", "ADMIN", "TEACHER", "STUDENT"]);

export const adminUserQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(120).optional(),
  status: accountStatus.default("ALL"),
  role: z.union([appRole, z.literal("ALL")]).default("ALL"),
});

export const adminApproveSchema = z.object({
  role: appRole.optional(),
  note: optionalString(300),
});

export const adminRejectSchema = z.object({
  reason: optionalString(300),
});

export const adminSuspendSchema = z.object({
  reason: optionalString(300),
});

export const adminRoleSchema = z.object({
  role: appRole,
});

export const adminActivityQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(30),
  action: z.string().trim().max(60).optional(),
});
