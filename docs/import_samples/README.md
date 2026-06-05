# CSV Import Samples

These files match the `/data/import/:entity` headers.

Recommended import order for a fresh test center:

1. `teachers_sample.csv`
2. `classes_sample.csv`
3. `subjects_sample.csv`
4. `students_sample.csv`
5. `rooms_sample.csv`
6. `assignments_sample.csv`
7. `payments_sample.csv`

Notes:

- Leave ID columns blank when creating new records.
- For payments and student-specific assignments, update `student_id` after students exist, or export students first and copy the generated IDs.
- For global superuser imports, use the active center in the UI; the backend will scope rows to that center.
