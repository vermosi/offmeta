# src\pages\AdminCuratedSearches.tsx

- CuratedSearch · interface · L50-L63 — interface CuratedSearch
- FormData · type · L65-L65 — type FormData = Omit<CuratedSearch, 'id' | 'created_at' | 'updated_at'>;
- slugify · function · L89-L97 — function slugify(text: string): string
- AdminCuratedSearches · function · L99-L720 — function AdminCuratedSearches()
- toggleActive · function · L166-L187 — toggleActive = async (id: string, current: boolean)
- openCreate · function · L190-L194 — openCreate = ()
- openEdit · function · L196-L210 — openEdit = (s: CuratedSearch)
- updateNaturalQuery · function · L213-L226 — updateNaturalQuery = (val: string)
- handleSave · function · L229-L273 — handleSave = async ()
- handleDelete · function · L276-L289 — handleDelete = async ()
