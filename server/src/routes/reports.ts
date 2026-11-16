import { Router } from "express";
import { z } from "zod";
import { ApiError, asyncHandler } from "../lib/http.js";
import { parseDateKey } from "../lib/dates.js";
import { buildAttendanceReport } from "../lib/attendance.js";
import { buildExamResults } from "../lib/results.js";
import { attendanceReportSchema } from "../schemas.js";

export const reportsRouter = Router();

reportsRouter.get(
  "/attendance",
  asyncHandler(async (req, res) => {
    const { classId, from, to } = attendanceReportSchema.parse(req.query);
    const fromDate = parseDateKey(from);
    const toDate = parseDateKey(to);
    if (!fromDate || !toDate) throw new ApiError(422, "The selected date range is invalid.");
    if (fromDate > toDate) throw new ApiError(422, "The start date must be before the end date.");

    const report = await buildAttendanceReport(classId, fromDate, toDate);
    if (!report) throw new ApiError(404, "Class not found.");
    res.json({ data: report });
  }),
);

const performanceQuerySchema = z.object({ examId: z.string().min(1) });

reportsRouter.get(
  "/performance",
  asyncHandler(async (req, res) => {
    const { examId } = performanceQuerySchema.parse(req.query);
    const results = await buildExamResults(examId);
    if (!results) throw new ApiError(404, "Exam not found.");
    res.json({ data: results });
  }),
);
