import { useQuery } from "@tanstack/react-query";
import { api } from "./api";
import type { ClassSummary, ExamSummary, Subject, Teacher } from "@/types";

export function useClasses() {
  return useQuery({
    queryKey: ["classes"],
    queryFn: () => api.get<{ data: ClassSummary[] }>("/classes").then((response) => response.data),
    staleTime: 60 * 1000,
  });
}

export function useTeachers(enabled = true) {
  return useQuery({
    queryKey: ["teachers"],
    queryFn: () => api.get<{ data: Teacher[] }>("/teachers").then((response) => response.data),
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useSubjects(classId?: string) {
  return useQuery({
    queryKey: ["subjects", classId ?? "all"],
    queryFn: () =>
      api
        .get<{ data: Subject[] }>(`/subjects${classId ? `?classId=${encodeURIComponent(classId)}` : ""}`)
        .then((response) => response.data),
    staleTime: 60 * 1000,
  });
}

export function useExams(classId?: string) {
  return useQuery({
    queryKey: ["exams", classId ?? "all"],
    queryFn: () =>
      api
        .get<{ data: ExamSummary[] }>(`/exams${classId ? `?classId=${encodeURIComponent(classId)}` : ""}`)
        .then((response) => response.data),
    staleTime: 30 * 1000,
  });
}
