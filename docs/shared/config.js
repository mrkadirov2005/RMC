// Single source of truth for the live app's address, used by every page
// under docs/owner, docs/superuser, docs/teacher and docs/student.
//
// The app is a HashRouter, so a real, working link looks like
// "https://your-domain/#/teacher-tasks", not the bare "/teacher-tasks"
// route path written in the docs' source.
//
// To point every doc at a new domain, change ONLY the line below —
// nothing else in docs/ needs to be touched or regenerated.
window.RMC_DOCS_BASE_URL = 'https://temurbekschool.vercel.app';
