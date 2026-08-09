# Playwright Workflow Inventory

Total: **320 workflows**

Each line is one visible local-browser test. The browser stops after the final result.

## Authentication

1. Admin valid login → show dashboard → stop.
2. Admin invalid login → show error → stop.
3. Admin empty login form → show validation → stop.
4. Admin login without Remember me → store session → stop.
5. Admin login with Remember me → restore session after reload → stop.
6. Owner valid login → show owner panel → stop.
7. Teacher valid login → show teacher portal → stop.
8. Student valid login → show student portal → stop.
9. Inactive user login → show blocked-account error → stop.
10. Logged-in user logout → return to login → stop.

## Routes and permissions

11. Logged-out user → open protected page → redirect to login → stop.
12. Admin → open owner page → show access denied → stop.
13. Owner → open admin dashboard → redirect safely → stop.
14. Teacher → open Students → show access denied → stop.
15. Student → open Teachers → show access denied → stop.
16. Limited admin → open allowed page → show page → stop.
17. Limited admin → open forbidden page → show access denied → stop.
18. User → open unknown URL → redirect to correct home → stop.
19. User session expires → make request → redirect to login → stop.
20. User → reload protected page → restore correct page → stop.

## Owner accounts

21. Open owner registration → fill valid data → register → show owner panel → stop.
22. Owner registration → leave required field empty → show validation → stop.
23. Owner registration → use duplicate username → show error → stop.
24. Owner → open owner list → show accounts → stop.
25. Owner → search owner list → show matching owner → stop.
26. Owner → add owner account → save → show success → stop.
27. Owner → edit owner account → save → show success → stop.
28. Owner → deactivate owner account → confirm → show success → stop.
29. Owner → cancel destructive action → keep data unchanged → stop.
30. Owner → switch active center → refresh scoped data → stop.

## Centers

31. Owner → open Centers → show center list → stop.
32. Owner → add center → fill valid data → save → show success → stop.
33. Owner → add center with missing data → show validation → stop.
34. Owner → add duplicate center → show error → stop.
35. Owner → search centers → show matching center → stop.
36. Owner → open center details → show saved data → stop.
37. Owner → edit center → save → show success → stop.
38. Owner → deactivate center → confirm → show success → stop.
39. Owner → delete disposable center → confirm → remove it → stop.
40. Admin → open Centers directly → show access denied → stop.

## Students

41. Admin → open Students → show student list → stop.
42. Admin → add student → fill valid data → save → show success → stop.
43. Admin → add student with empty required fields → show validation → stop.
44. Admin → add student with duplicate username → show error → stop.
45. Admin → add student with invalid class and teacher pair → show error → stop.
46. Admin → search students by name → show matching rows → stop.
47. Admin → filter students by status → show correct rows → stop.
48. Admin → open student profile → show saved data → stop.
49. Admin → edit student → save → show success → stop.
50. Admin → reload edited student → show persisted changes → stop.

## Student lifecycle

51. Admin → transfer student to another class → confirm → show success → stop.
52. Admin → transfer student to same class → show validation → stop.
53. Admin → freeze active student → confirm → show frozen state → stop.
54. Admin → unfreeze student → confirm → show active state → stop.
55. Admin → archive student → confirm → remove from active list → stop.
56. Admin → open Archive → restore student → show success → stop.
57. Owner → purge archived student → confirm → remove permanently → stop.
58. Admin → cancel student archive → keep student active → stop.
59. Admin → change student discount → save → show new discount → stop.
60. Admin → log in with newly created student → show matching profile → stop.

## Teachers

61. Admin → open Teachers → show teacher list → stop.
62. Admin → add teacher → fill valid data → save → show success → stop.
63. Admin → add teacher with missing fields → show validation → stop.
64. Admin → add teacher with duplicate username → show error → stop.
65. Admin → search teachers → show matching teacher → stop.
66. Admin → filter teachers by status → show correct rows → stop.
67. Admin → open teacher profile → show saved data → stop.
68. Admin → edit teacher → save → show success → stop.
69. Admin → assign teacher to class → save → show assignment → stop.
70. Admin → delete teacher with dependencies → show blocked message → stop.

## Classes

71. Admin → open Classes → show class list → stop.
72. Admin → add class → fill valid data → save → show success → stop.
73. Admin → add class with missing fields → show validation → stop.
74. Admin → add duplicate class code → show error → stop.
75. Admin → search classes → show matching class → stop.
76. Admin → open class details → show teacher, room, and students → stop.
77. Admin → edit class → save → show success → stop.
78. Admin → enroll student in class → save → show student → stop.
79. Admin → remove student from class → confirm → update class → stop.
80. Admin → archive class → confirm → remove from active list → stop.

## Lessons and attendance

81. Teacher → open class session → show student roster → stop.
82. Teacher → mark all students present → save → show success → stop.
83. Teacher → mark one student absent → save → show success → stop.
84. Teacher → enter homework scores → save → show success → stop.
85. Teacher → enter activity scores → save → show success → stop.
86. Teacher → award student coins → save → show new balance → stop.
87. Teacher → select stellar student → save → show success → stop.
88. Teacher → submit incomplete lesson → show validation → stop.
89. Teacher → edit completed lesson → save correction → show success → stop.
90. Unassigned teacher → open class session → show access denied → stop.

## Rooms and calendar

91. Admin → open Rooms → show room list → stop.
92. Admin → add room → fill valid data → save → show success → stop.
93. Admin → add room with invalid capacity → show validation → stop.
94. Admin → add duplicate room → show error → stop.
95. Admin → create room slots → save → show slots → stop.
96. Admin → book available slot → save → show booking → stop.
97. Admin → book occupied slot → show conflict → stop.
98. Admin → cancel booking → confirm → show available slot → stop.
99. User → open Calendar → change month or week → show correct dates → stop.
100. User → open calendar event → show lesson details → stop.

## Payments

101. Admin → open Payments → show payment list → stop.
102. Admin → add full payment → save → show success → stop.
103. Admin → add partial payment → save → show remaining balance → stop.
104. Admin → add payment with invalid amount → show validation → stop.
105. Admin → add duplicate receipt → show error → stop.
106. Admin → search payments → show matching payment → stop.
107. Admin → filter payments by date → show correct rows → stop.
108. Admin → open payment → show receipt details → stop.
109. Admin → edit payment → save → show success → stop.
110. Admin → delete disposable payment → confirm → remove it → stop.

## Discounts, debts, and finance

111. Admin → add fixed discount to student → save → show final price → stop.
112. Admin → add percentage discount → save → show final price → stop.
113. Admin → consume monthly discount in payment → show updated discount → stop.
114. Admin → open Debts → show debt list → stop.
115. Admin → search debts → show matching debt → stop.
116. Admin → filter overdue debts → show correct rows → stop.
117. Admin → complete remaining payment → mark debt paid → stop.
118. Admin → open Finance → show summary totals → stop.
119. Admin → filter Finance by teacher and date → show correct totals → stop.
120. Admin → open teacher finance details → show scoped totals → stop.

## Subjects and assignments

121. Admin → open Subjects → show subject list → stop.
122. Admin → add subject → fill valid data → save → show success → stop.
123. Admin → add duplicate subject → show error → stop.
124. Admin → edit subject → save → show success → stop.
125. Admin → delete unused subject → confirm → remove it → stop.
126. Admin → open Assignments → show assignment list → stop.
127. Admin → add class assignment → save → show success → stop.
128. Admin → add student assignment → save → show success → stop.
129. Admin → edit assignment → save → show success → stop.
130. Admin → delete assignment → confirm → remove it → stop.

## Test creation

131. Teacher or admin → open Tests → show test list → stop.
132. Teacher or admin → create basic test → save → show success → stop.
133. Teacher or admin → create test with empty title → show validation → stop.
134. Teacher or admin → add multiple-choice question → save → show question → stop.
135. Teacher or admin → add written question → save → show question → stop.
136. Teacher or admin → reorder questions → save → keep new order → stop.
137. Teacher or admin → edit test → save → show success → stop.
138. Teacher or admin → publish test → confirm → show published state → stop.
139. Teacher or admin → assign test to class → save → show assignment → stop.
140. Teacher or admin → assign test to student → save → show assignment → stop.

## Test taking and grading

141. Student → open My Tests → show assigned tests → stop.
142. Student → start available test → show first question → stop.
143. Unassigned student → open test directly → show access denied → stop.
144. Student → answer questions → move forward and back → retain answers → stop.
145. Student → reload active test → restore answers and timer → stop.
146. Student → submit test → confirm → show submitted state → stop.
147. Student → reach time limit → auto-submit → show submitted state → stop.
148. Teacher → open submission → show answers → stop.
149. Teacher → grade written answer → save → show final score → stop.
150. Student → open graded submission → show result and feedback → stop.

## Teacher portal

151. Teacher → log in → show portal overview → stop.
152. Teacher → open Classes tab → show assigned classes → stop.
153. Teacher → open Students tab → show assigned students → stop.
154. Teacher → search own students → show matching student → stop.
155. Teacher → open Attendance tab → show attendance data → stop.
156. Teacher → open Grades tab → show grade data → stop.
157. Teacher → open Assignments tab → show assignments → stop.
158. Teacher → open Tests tab → show owned tests → stop.
159. Teacher → open Payments tab while locked → show unlock form → stop.
160. Teacher → enter payment password → show scoped payments → stop.

## Student portal

161. Student → log in → show portal overview → stop.
162. Student → open profile → show own data → stop.
163. Student → open weekly schedule → show own lessons → stop.
164. Student → open attendance → show own attendance → stop.
165. Student → open grades → show own grades → stop.
166. Student → open coins → show own balance → stop.
167. Student → open payments → show own history → stop.
168. Student → open debts → show own balance → stop.
169. Student → open assignments → show own assignments → stop.
170. Frozen student → attempt write action → show blocked message → stop.

## Reports and retention

171. Owner → open Reports → show overview → stop.
172. Owner → open finance report → show center totals → stop.
173. Owner → open student report → show student metrics → stop.
174. Owner → open teacher report → show teacher metrics → stop.
175. Owner → open discount report → show discount metrics → stop.
176. Owner → open retention report → show retention metrics → stop.
177. Owner → open attendance report → show attendance metrics → stop.
178. Owner → change report date range → refresh all values → stop.
179. Owner → switch center in Reports → show only new center data → stop.
180. Admin → open Intake view → apply filters → show correct cohort → stop.

## Archive and Telegram

181. Admin → open Archive → show archived records → stop.
182. Admin → filter Archive by type → show correct records → stop.
183. Admin → search Archive → show matching record → stop.
184. Admin → restore archived record → confirm → show success → stop.
185. Owner → purge archived record → confirm → show success → stop.
186. Admin → open Telegram Registrations → show pending leads → stop.
187. Admin → filter Telegram leads → show correct leads → stop.
188. Admin → convert Telegram lead to student → save → show success → stop.
189. Admin → convert same lead twice → prevent duplicate → stop.
190. Admin → reject Telegram lead → confirm → show rejected state → stop.

## Settings, logs, and engineering

191. Admin → open Settings → change theme → reload → keep theme → stop.
192. Admin → change language → reload → keep language → stop.
193. Admin → change list appearance → save → keep layout → stop.
194. Admin → submit invalid setting → show validation → stop.
195. Owner → open Logs → search requests → show matching logs → stop.
196. Owner → open log details → hide secrets → stop.
197. Owner → open Engineering → show service health → stop.
198. Owner → run allowed database operation → confirm → show result → stop.
199. Admin → open owner-only Engineering action → show access denied → stop.
200. Owner → run E2E flow → show running and final status → stop.

## Reliability and cross-feature

201. Page API fails → show error → retry → show recovered data → stop.
202. Form save fails → retain entered values → show error → stop.
203. User double-clicks Save → create one record → show success → stop.
204. User searches quickly → show latest result only → stop.
205. Owner switches center → remove old-center data → stop.
206. Create center → create teacher → create class → show complete setup → stop.
207. Create student → assign class → take payment → show correct balance → stop.
208. Create class → schedule lesson → complete attendance → show report → stop.
209. Create test → assign student → submit → grade → show final result → stop.
210. Create room → schedule class → try conflict → show conflict → stop.

+## Dashboard page

211. Admin → open Dashboard → show summary cards → stop.
212. Admin → click Students summary card → show student details → stop.
213. Admin → click Teachers summary card → show teacher details → stop.
214. Admin → click Payments summary card → show payment details → stop.
215. Admin → change dashboard scope to teacher → refresh scoped data → stop.
216. Admin → change dashboard scope to class → refresh scoped data → stop.
217. Admin → move dashboard to previous month → show previous data → stop.
218. Admin → move dashboard to next month → show next data → stop.
219. Admin → click student in dashboard details → open student profile → stop.
220. Admin → click teacher in dashboard details → open teacher profile → stop.

## Student page tools

221. Admin → switch Students to Statistics tab → show statistics → stop.
222. Admin → switch Students to Teachers tab → show grouped students → stop.
223. Admin → import valid students CSV → show imported students → stop.
224. Admin → import invalid students CSV → show import errors → stop.
225. Admin → export students CSV → download file → stop.
226. Admin → push students to Google Sheets → show success → stop.
227. Admin → pull students from Google Sheets → refresh list → stop.
228. Admin → select several students → bulk archive → show success → stop.
229. Admin → reset student password → save → show success → stop.
230. Admin → change group teacher from Students page → show success → stop.

## Teacher page tools

231. Admin → import valid teachers CSV → show imported teachers → stop.
232. Admin → import invalid teachers CSV → show import errors → stop.
233. Admin → export teachers CSV → download file → stop.
234. Admin → select several teachers → bulk delete → show success → stop.
235. Admin → select teachers → clear selection → show no selected rows → stop.
236. Admin → switch teacher list view → keep same results → stop.
237. Admin → paginate teacher list → show next page → stop.
238. Admin → open teacher grades → show scoped grades → stop.
239. Admin → open teacher attendance → show scoped attendance → stop.
240. Admin → open teacher tests → show scoped tests → stop.

## Class page tools

241. Admin → import valid classes CSV → show imported classes → stop.
242. Admin → import invalid classes CSV → show import errors → stop.
243. Admin → export classes CSV → download file → stop.
244. Admin → select several classes → bulk delete → show success → stop.
245. Admin → force-delete disposable class → confirm → remove it → stop.
246. Admin → generate class sessions → show created and skipped counts → stop.
247. Admin → open class Subjects tab → show assigned subjects → stop.
248. Admin → open class Points tab → show student points → stop.
249. Admin → open class Tests tab → show assigned tests → stop.
250. Admin → open class Sessions tab → choose session workflow → stop.

## Payment and debt page tools

251. Admin → import valid payments CSV → show imported payments → stop.
252. Admin → import invalid payments CSV → show import errors → stop.
253. Admin → export payments CSV → download file → stop.
254. Admin → open payment folder → show grouped payments → stop.
255. Admin → return from payment folder → show folders → stop.
256. Admin → add debt manually → save → show success → stop.
257. Admin → edit debt → save → show success → stop.
258. Admin → delete debt → confirm → remove it → stop.
259. Admin → analyze unpaid students → show debt candidates → stop.
260. Admin → select candidates → generate debts → show created records → stop.

## Calendar and archive page tools

261. User → switch Calendar to Month view → show month grid → stop.
262. User → switch Calendar to Week view → show week grid → stop.
263. User → open a calendar day → show all daily sessions → stop.
264. User → close calendar details → return to selected date → stop.
265. Admin → refresh Archive → show latest archived records → stop.
266. Admin → open archived Students tab → show archived students → stop.
267. Admin → open archived Teachers tab → show archived teachers → stop.
268. Admin → open archived Classes tab → show archived classes → stop.
269. Admin → open archived Payments tab → show archived payments → stop.
270. Admin → open archived Calendar Sessions tab → show archived sessions → stop.

## Settings details

271. Admin → change sidebar order → save → show new order → stop.
272. Admin → set page-size preference → save → apply to list → stop.
273. Admin → set calendar default view → save → open chosen view → stop.
274. Admin → set calendar start hour → save → show new time range → stop.
275. Admin → clear one settings override → return to default → stop.
276. Admin → reset calendar preferences → confirm defaults → stop.
277. Admin → reset all settings → confirm defaults → stop.
278. Admin → cancel settings changes → keep stored settings → stop.
279. Admin → settings save fails → keep edits and show error → stop.
280. Admin → open Logs from Settings → show Logs page → stop.

## Logs and server monitor

281. Owner → toggle log filters → show filter controls → stop.
282. Owner → filter logs by status → show correct requests → stop.
283. Owner → filter logs by method → show correct requests → stop.
284. Owner → filter logs by path → show correct requests → stop.
285. Owner → paginate logs → show next page → stop.
286. Owner → refresh server monitor → show new statistics → stop.
287. Owner → set monitor refresh interval → auto-refresh stats → stop.
288. Owner → inspect process statistics → show CPU and memory → stop.
289. Owner → inspect database statistics → show connection state → stop.
290. Owner → Mongo logging unavailable → keep server monitor usable → stop.

## Engineering pages

291. Owner → open Engineering Server tab → show service statistics → stop.
292. Owner → open Engineering Database tab → show schema summary → stop.
293. Owner → search database schema → show matching tables → stop.
294. Owner → select database table → show columns and references → stop.
295. Owner → open Engineering Studio tab → show database tables → stop.
296. Owner → select Studio table → show rows → stop.
297. Owner → search Studio rows → show matching rows → stop.
298. Owner → paginate Studio rows → show next page → stop.
299. Owner → open request-health tab → refresh → show success and failure counts → stop.
300. Owner → cancel active E2E run → show cancelled status → stop.

## Common page states

301. Open populated list page → show rows → stop.
302. Open empty list page → show empty state → stop.
303. Open page during loading → show loader → finish with data → stop.
304. Open page when request fails → show error state → stop.
305. Failed page → click Retry → show recovered data → stop.
306. Search list with no match → show no-results state → stop.
307. Change list filter → reset to first page → stop.
308. Delete last row on final page → move to valid page → stop.
309. Open missing record ID → show not-found state → stop.
310. Open another-center record ID → deny access without leaking data → stop.

## Navigation and responsive pages

311. Desktop admin → use sidebar → open every permitted page → stop.
312. Desktop limited admin → inspect sidebar → hide forbidden pages → stop.
313. Mobile admin → open navigation menu → choose page → close menu → stop.
314. Mobile user → open Students list → show usable card layout → stop.
315. Mobile user → open Teachers list → show usable card layout → stop.
316. Mobile user → open Calendar → show usable calendar → stop.
317. Mobile student → open portal → navigate all sections → stop.
318. Browser Back → return to previous list state → stop.
319. Browser Forward → restore next route → stop.
320. Reload page with filters → preserve only intended state → stop.

## Run locally

```bash
cd ui
npx playwright test --headed --project=chromium
```

Use `--debug` to pause and move through a test manually.
