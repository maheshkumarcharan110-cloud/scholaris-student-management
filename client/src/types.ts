export type Role = "SUPER_ADMIN" | "ADMIN" | "TEACHER" | "STUDENT";
export type AccountStatus = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: Role;
  status?: AccountStatus;
  emailVerified?: boolean;
  emailVerifiedAt?: string | null;
  requestedRole?: Role | null;
  pendingEmail?: string | null;
  lastLoginAt?: string | null;
  teacherId: string | null;
}

export interface ClassOption {
  id: string;
  name: string;
  section: string;
  academicYear?: string;
}

export interface ClassSummary {
  id: string;
  name: string;
  section: string;
  academicYear: string;
  room: string | null;
  classTeacher: { id: string; name: string; email: string } | null;
  studentCount: number;
  totalStudents: number;
  subjectCount: number;
  subjects: Array<{ id: string; name: string; code: string; teacherName: string | null }>;
  examCount: number;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  class: ClassOption;
  teacher: { id: string; name: string; email: string } | null;
  markCount?: number;
  examCount?: number;
}

export interface Teacher {
  id: string;
  employeeNo: string;
  phone: string | null;
  qualification: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string; role: Role; active: boolean };
  classCount: number;
  subjectCount: number;
}

export type StudentStatus = "ACTIVE" | "INACTIVE" | "GRADUATED";

export interface StudentListItem {
  id: string;
  admissionNo: string;
  firstName: string;
  lastName: string;
  gender: string;
  dateOfBirth: string | null;
  email: string | null;
  phone: string | null;
  guardianName: string;
  guardianPhone: string;
  address: string | null;
  status: StudentStatus;
  enrolledAt: string;
  class: ClassOption;
  classId: string;
  attendanceRate: number | null;
  attendanceMarked: number;
}

export interface Paginated<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

export interface AttendanceRoster {
  class: ClassOption & { academicYear: string };
  date: string;
  students: Array<{
    id: string;
    firstName: string;
    lastName: string;
    admissionNo: string;
    status: AttendanceStatus | null;
    note: string | null;
  }>;
  summary: {
    present: number;
    absent: number;
    late: number;
    excused: number;
    unmarked: number;
  };
}

export interface AttendanceReport {
  class: ClassOption & { academicYear: string };
  from: string;
  to: string;
  rows: Array<{
    student: { id: string; firstName: string; lastName: string; admissionNo: string };
    present: number;
    absent: number;
    late: number;
    excused: number;
    total: number;
    rate: number;
  }>;
  totals: {
    present: number;
    absent: number;
    late: number;
    excused: number;
    marked: number;
    rate: number;
    students: number;
  };
  daily: Array<{
    date: string;
    present: number;
    late: number;
    absent: number;
    marked: number;
    rate: number;
  }>;
}

export interface StudentDetail {
  id: string;
  admissionNo: string;
  firstName: string;
  lastName: string;
  gender: string;
  dateOfBirth: string | null;
  email: string | null;
  phone: string | null;
  guardianName: string;
  guardianPhone: string;
  address: string | null;
  status: StudentStatus;
  enrolledAt: string;
  class: ClassOption & { academicYear: string; classTeacherName: string | null };
  attendance: {
    present: number;
    absent: number;
    late: number;
    excused: number;
    total: number;
    rate: number;
    records: Array<{
      id: string;
      date: string;
      status: AttendanceStatus;
      note: string | null;
    }>;
  };
  results: Array<{
    id: string;
    name: string;
    term: string;
    status: "DRAFT" | "PUBLISHED";
    startDate: string;
    endDate: string;
    class: ClassOption;
    subjects: Array<{
      id: string;
      name: string;
      code: string;
      maxMarks: number;
      marks: number | null;
    }>;
    total: number;
    maxTotal: number;
    percentage: number;
    grade: string;
  }>;
}

export interface ExamSummary {
  id: string;
  name: string;
  term: string;
  class: ClassOption & { academicYear: string };
  startDate: string;
  endDate: string;
  status: "DRAFT" | "PUBLISHED";
  subjectCount: number;
  markCount: number;
  studentCount: number;
  progress: number;
  subjects: Array<{
    id: string;
    subjectId: string;
    name: string;
    code: string;
    maxMarks: number;
    teacherName: string | null;
    teacherId: string | null;
  }>;
}

export interface ExamDetail extends ExamSummary {
  students: Array<{ id: string; firstName: string; lastName: string; admissionNo: string }>;
  marks: Array<{
    id: string;
    examId: string;
    subjectId: string;
    studentId: string;
    marks: number;
  }>;
  canEdit: boolean;
  mySubjectIds: string[];
}

export interface ExamResults {
  exam: {
    id: string;
    name: string;
    term: string;
    status: "DRAFT" | "PUBLISHED";
    startDate: string;
    endDate: string;
    class: ClassOption & { academicYear: string };
    subjects: Array<{ id: string; name: string; code: string; maxMarks: number }>;
  };
  rows: Array<{
    student: { id: string; firstName: string; lastName: string; admissionNo: string };
    subjects: Array<{
      subjectId: string;
      name: string;
      code: string;
      maxMarks: number;
      marks: number | null;
    }>;
    total: number;
    enteredSubjects: number;
    totalSubjects: number;
    percentage: number;
    grade: string;
    rank: number | null;
  }>;
  stats: {
    classAverage: number;
    highest: number;
    passRate: number;
    maxTotal: number;
    studentCount: number;
    enteredCount: number;
    distribution: Record<string, number>;
  };
  subjectAverages: Array<{
    subjectId: string;
    name: string;
    code: string;
    average: number;
    entered: number;
  }>;
}

export interface DashboardData {
  totals: { students: number; teachers: number; classes: number; subjects: number };
  attendanceToday: {
    date: string;
    present: number;
    absent: number;
    late: number;
    excused: number;
    marked: number;
    unmarked: number;
    rate: number;
  };
  attendanceTrend: Array<{
    date: string;
    present: number;
    late: number;
    absent: number;
    marked: number;
    rate: number;
  }>;
  classEnrollment: Array<{ id: string; name: string; students: number }>;
  upcomingExams: Array<{
    id: string;
    name: string;
    term: string;
    className: string;
    startDate: string;
    endDate: string;
    subjectCount: number;
  }>;
  topStudents: Array<{ name: string; className: string; average: number }>;
  lowAttendance: Array<{ name: string; className: string; rate: number }>;
  gradeDistribution: Array<{ grade: string; count: number }>;
}
