# supabase\functions\semantic-search\pipeline\slots\extract-numeric.ts

- extractNumericConstraint · function · L6-L60 — function extractNumericConstraint( query: string, aliases: string[], ): { constraint: { op: string; value: number } | null; remaining: string }
- extractYearConstraint · function · L62-L91 — function extractYearConstraint(query: string): { constraint: { op: string; value: number } | null; remaining: string; }
- extractPriceConstraint · function · L93-L121 — function extractPriceConstraint(query: string): { constraint: { op: string; value: number } | null; remaining: string; }
