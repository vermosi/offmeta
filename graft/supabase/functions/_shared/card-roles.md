# supabase\functions\_shared\card-roles.ts

- CardForRoles · interface · L43-L50 — interface CardForRoles
- CardRoleProfile · interface · L52-L59 — interface CardRoleProfile
- extractRoles · function · L65-L80 — function extractRoles(oracleText: string | null): string[]
- extractTypeCategory · function · L85-L94 — function extractTypeCategory(typeLine: string | null): string
- buildRoleProfile · function · L99-L108 — function buildRoleProfile(card: CardForRoles): CardRoleProfile
- computeRoleSimilarity · function · L116-L139 — function computeRoleSimilarity(a: CardRoleProfile, b: CardRoleProfile): number
- findSimilarRolePairs · function · L146-L206 — function findSimilarRolePairs( profiles: CardRoleProfile[], minWeight = 0.3, maxPairsPerCard = 10, ): Array<{ cardA: string; cardB: string; weight: number; sharedRoles: string[] }>
