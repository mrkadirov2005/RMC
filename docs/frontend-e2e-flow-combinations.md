# Playwright Workflows

Total: **29 workflows**

Each test opens a local browser, follows the steps from left to right, and stops at the final success state.

## Main workflows

1. **Admin login** — Open admin login → enter credentials → submit → show dashboard → stop.
2. **Owner login** — Open owner login → enter credentials → submit → select a center → show owner page → stop.
3. **Teacher or student login** — Open login → enter credentials → submit → show the correct portal → stop.
4. **Permission check** — Log in as a limited user → open a restricted page → show access denied → stop.
5. **Create center** — Log in as owner → open Centers → add center → fill form → save → show success → stop.
6. **Create teacher** — Log in as admin → open Teachers → add teacher → fill form → save → show success → stop.
7. **Create student** — Log in as admin → open Students → add student → fill form → save → show success → stop.
8. **Student lifecycle** — Log in as admin → open student → transfer, freeze, archive, or restore → show success → stop.
9. **Telegram registration** — Log in as admin → open Telegram Registrations → select lead → create student → show success → stop.
10. **Subject and assignment** — Log in as admin → create subject → create assignment → assign it → show success → stop.
11. **Room booking** — Log in as admin → create room → create time slot → book class → show success → stop.
12. **Create class** — Log in as admin → open Classes → add class → set teacher and schedule → save → show success → stop.
13. **Complete lesson** — Log in as teacher → open class session → enter attendance and scores → save → show success → stop.
14. **Calendar** — Log in → open Calendar → change date → open a lesson → show lesson details → stop.
15. **Student payment** — Log in as admin → open Payments → add payment → select student → enter amount → save → show success → stop.
16. **Teacher payment access** — Log in as teacher → open Payments → unlock with payment password → show payments → stop.
17. **Finance report** — Log in as admin → open Finance → apply filters → show correct totals → stop.
18. **Online test** — Create test → assign student → log in as student → answer and submit → grade test → show result → stop.
19. **Teacher portal** — Log in as teacher → open portal tabs → view classes and students → show correct data → stop.
20. **Student portal** — Log in as student → open portal tabs → view schedule, grades, and payments → show correct data → stop.
21. **Owner reports** — Log in as owner → select center → open Reports → apply filters → show correct report → stop.
22. **Settings and system tools** — Log in as owner → open Settings, Logs, or Engineering → perform one action → show success → stop.
23. **Search and filters** — Log in → open a list page → search, filter, or paginate → show correct rows → stop.
24. **Service recovery** — Log in → open a page → simulate service failure → restore service → show recovered page → stop.

## Cross-feature workflows

25. **Center to lesson** — Create center → create teacher → create class → create student → complete lesson → show success → stop.
26. **Student to payment** — Create student → add discount → create payment → verify balance → show success → stop.
27. **Student transfer** — Create student → assign class → transfer class → verify new teacher and class → show success → stop.
28. **Full online test** — Create test → assign student → student submits → teacher grades → student views result → stop.
29. **Classroom schedule** — Create room → create class → generate sessions → try conflicting booking → show conflict message → stop.

## Local visible run

Run one workflow in a visible browser:

```bash
cd ui
npx playwright test e2e/people/student-create.spec.ts --headed --project=chromium
```

Use `--debug` instead of `--headed` when you want Playwright to pause and let you move through each action manually.
