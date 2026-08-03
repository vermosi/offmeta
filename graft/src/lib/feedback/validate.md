# src\lib\feedback\validate.ts

- ValidationResult · type · L5-L7 — type ValidationResult = | { success: true; data: { issueDescription: string } } | { success: false; message: string };
- validateIssue · function · L9-L22 — function validateIssue(issueDescription: string): ValidationResult
- extractErrorDetail · function · L24-L29 — function extractErrorDetail(error: unknown): string
