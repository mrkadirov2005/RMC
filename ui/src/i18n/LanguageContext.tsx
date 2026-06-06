import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { translationAPI, type TranslationRow } from '../shared/api/api';

export type AppLanguage = 'en' | 'uz';

const LANGUAGE_STORAGE_KEY = 'crm_language';

const translations: Record<string, string> = {
  Dashboard: 'Boshqaruv paneli',
  'My Portal': 'Mening portalim',
  'My Tests': 'Mening testlarim',
  Students: 'Oquvchilar',
  Teachers: 'Oqituvchilar',
  Classes: 'Sinflar',
  Rooms: 'Xonalar',
  Logs: 'Jurnallar',
  Calendar: 'Taqvim',
  Settings: 'Sozlamalar',
  Tests: 'Testlar',
  Payments: 'Tolovlar',
  Finance: 'Moliya',
  Grades: 'Baholar',
  Attendance: 'Davomat',
  Assignments: 'Vazifalar',
  Subjects: 'Fanlar',
  Debts: 'Qarzlar',
  'Owner Panel': 'Ega paneli',
  Centers: 'Markazlar',
  'Active Branch': 'Faol filial',
  Logout: 'Chiqish',
  'Switch to light mode': 'Yorug rejimga otish',
  'Switch to dark mode': 'Qorongu rejimga otish',
  'Open sidebar': 'Yon panelni ochish',
  'Close sidebar': 'Yon panelni yopish',
  Loading: 'Yuklanmoqda',
  'Loading...': 'Yuklanmoqda...',
  'Access Denied': 'Kirish rad etildi',
  "You don't have permission to access this resource.": 'Bu sahifaga kirish huquqingiz yoq.',
  'Go to Dashboard': 'Boshqaruv paneliga otish',
  English: 'Inglizcha',
  Uzbek: 'Ozbekcha',
  Language: 'Til',
  'Debts Management': 'Qarzlarni boshqarish',
  'Add Debt': 'Qarz qoshish',
  'Debt Records': 'Qarz yozuvlari',
  'Student Name': 'Oquvchi ismi',
  'Debt Amount': 'Qarz miqdori',
  'Paid Amount': 'Tolangan miqdor',
  Remaining: 'Qoldiq',
  'Due Date': 'Muddat',
  Actions: 'Amallar',
  'No debt records match your search': 'Qidiruvga mos qarz yozuvlari topilmadi',
  'No debt records found': 'Qarz yozuvlari topilmadi',
  'Edit Debt': 'Qarzni tahrirlash',
  'Add New Debt': 'Yangi qarz qoshish',
  Student: 'Oquvchi',
  Center: 'Markaz',
  'Select a student': 'Oquvchini tanlang',
  'Select a center': 'Markazni tanlang',
  'Amount Paid': 'Tolangan miqdor',
  'Debt Date': 'Qarz sanasi',
  Remarks: 'Izohlar',
  Cancel: 'Bekor qilish',
  Save: 'Saqlash',
  'Saving...': 'Saqlanmoqda...',
  'Search debts by student, amount, date, remarks...': 'Qarzlarni oquvchi, miqdor, sana yoki izoh boyicha qidiring...',
  Add: 'Qoshish',
  'Add New': 'Yangi qoshish',
  Edit: 'Tahrirlash',
  Delete: 'Ochirish',
  Clear: 'Tozalash',
  Search: 'Qidirish',
  Filters: 'Filtrlar',
  'Clear All': 'Hammasini tozalash',
  Name: 'Ism',
  Password: 'Parol',
  Status: 'Holat',
  Notes: 'Eslatmalar',
  Date: 'Sana',
  Method: 'Usul',
  Amount: 'Miqdor',
  'Payment History': 'Tolovlar tarixi',
  'Add Payment': 'Tolov qoshish',
  'Edit Payment': 'Tolovni tahrirlash',
  'Payment Date': 'Tolov sanasi',
  'Payment Method': 'Tolov usuli',
  'Payment Type': 'Tolov turi',
  'Receipt Number': 'Kvitansiya raqami',
  'Receipt #': 'Kvitansiya #',
  'No payment records': 'Tolov yozuvlari yoq',
  'No payments found': 'Tolovlar topilmadi',
  'No payments match your criteria': 'Mezonlarga mos tolovlar topilmadi',
  'Search by student, receipt, reference...': 'Oquvchi, kvitansiya yoki havola boyicha qidiring...',
  Total: 'Jami',
  Collected: 'Yigildi',
  Expected: 'Kutilgan',
  'Outstanding debt': 'Qolgan qarz',
  'Paid': 'Tolangan',
  'Still unpaid': 'Hali tolanmagan',
  'Should pay': 'Tolashi kerak',
  'Student Payments': 'Oquvchi tolovlari',
  'Monthly tuition': 'Oylik tolov',
  'Payment Amount': 'Tolov miqdori',
  'Class Schedule': 'Dars jadvali',
  'Class Code': 'Sinf kodi',
  Level: 'Daraja',
  Capacity: 'Sigim',
  'Room Number': 'Xona raqami',
  'No data available': 'Malumot yoq',
  'No data': 'Malumot yoq',
  'No room': 'Xona yoq',
  'No classes found': 'Sinflar topilmadi',
  'No students found': 'Oquvchilar topilmadi',
  'No teachers found': 'Oqituvchilar topilmadi',
  'Select currency': 'Valyutani tanlang',
  Currency: 'Valyuta',
  'Monthly Fee Amount': 'Oylik tolov miqdori',
  'Generate Debt Records': 'Qarz yozuvlarini yaratish',
  'All students have made payments for the analyzed period!': 'Tahlil qilingan davr uchun barcha oquvchilar tolov qilgan!',
  'Unpaid Months:': 'Tolanmagan oylar:',
  'Present out of Total': 'Jami ichida kelganlar',
  Submitted: 'Topshirilgan',
  Overall: 'Umumiy',
  'Average Grade': 'Ortacha baho',
  'Current month snapshot': 'Joriy oy holati',
  'Monthly Revenue': 'Oylik daromad',
  'Teacher Earnings': 'Oqituvchi daromadlari',
  Earnings: 'Daromad',
  'Earned total': 'Jami daromad',
  'Top teacher': 'Eng yaxshi oqituvchi',
  'Selected month': 'Tanlangan oy',
  'Revenue Pulse': 'Daromad holati',
  'Payment Trend': 'Tolov tendensiyasi',
  'Paid share': 'Tolangan ulush',
  'Avg paid': 'Ortacha tolov',
  'Students by Center': 'Markaz boyicha oquvchilar',
  All: 'Hammasi',
  Active: 'Faol',
  Inactive: 'Nofaol',
  Available: 'Mavjud',
  Completed: 'Tugallangan',
  Pending: 'Kutilmoqda',
  Failed: 'Muvaffaqiyatsiz',
  Close: 'Yopish',
  Done: 'Tayyor',
  Update: 'Yangilash',
  Create: 'Yaratish',
  Submit: 'Yuborish',
  'View details': 'Tafsilotlarni korish',
  'View Details': 'Tafsilotlarni korish',
  'View Submission': 'Topshiriqni korish',
  'Grade Submission': 'Topshiriqni baholash',
  'Delete Test': 'Testni ochirish',
  'No tests found': 'Testlar topilmadi',
  'No submissions yet': 'Topshiriqlar hali yoq',
  'No grades recorded yet': 'Baholar hali yozilmagan',
  'No grades recorded': 'Baholar yozilmagan',
  'No attendance records': 'Davomat yozuvlari yoq',
  'No test results': 'Test natijalari yoq',
  'No coin transactions yet': 'Coin tranzaksiyalari hali yoq',
  'No activity recorded yet': 'Faollik hali yozilmagan',
  'Manage Grades': 'Baholarni boshqarish',
  'Manage Assignments': 'Vazifalarni boshqarish',
  'Room Management': 'Xonalarni boshqarish',
  'Assigned Class': 'Biriktirilgan sinf',
  'Select a class': 'Sinfni tanlang',
  'Select class': 'Sinfni tanlang',
  'Select day': 'Kunni tanlang',
  Unassigned: 'Biriktirilmagan',
  Day: 'Kun',
  Time: 'Vaqt',
  'Search students...': 'Oquvchilarni qidiring...',
  'Search tests...': 'Testlarni qidiring...',
  'Search assignments...': 'Vazifalarni qidiring...',
  'Search students by name, email, or enrollment...': 'Oquvchilarni ism, email yoki royxat raqami boyicha qidiring...',
  'Search by student name...': 'Oquvchi ismi boyicha qidiring...',
  'Search teachers by name or email...': 'Oqituvchilarni ism yoki email boyicha qidiring...',
  'Search teachers by name, ID, subject, email, phone...': 'Oqituvchilarni ism, ID, fan, email yoki telefon boyicha qidiring...',
  'Search centers by name, code, city, phone...': 'Markazlarni nom, kod, shahar yoki telefon boyicha qidiring...',
  'All Classes': 'Barcha sinflar',
  'All Subjects': 'Barcha fanlar',
  'All Status': 'Barcha holatlar',
  'All Methods': 'Barcha usullar',
  'Select status': 'Holatni tanlang',
  'Select gender': 'Jinsni tanlang',
  'Select teacher': 'Oqituvchini tanlang',
  'Select subject': 'Fanni tanlang',
  'Select term': 'Chorakni tanlang',
  'Select branch': 'Filialni tanlang',
  'Switch branch': 'Filialni almashtirish',
  'Total Grades': 'Jami baholar',
  'Class Average': 'Sinf ortachasi',
  'Grade Types': 'Baho turlari',
  'Student Grades': 'Oquvchi baholari',
  'Recent Activity': 'Songgi faollik',
  'Enrollment #': 'Royxat raqami',
  'Grades Count': 'Baholar soni',
  Average: 'Ortacha',
  'Letter Grade': 'Harf bahosi',
  'Add Grade': 'Baho qoshish',
  'Grade Type': 'Baho turi',
  Score: 'Ball',
  'Max Score': 'Maksimal ball',
  'Notes (optional)': 'Eslatmalar (ixtiyoriy)',
  'Submitted At': 'Topshirilgan vaqt',
  'Select Month:': 'Oyni tanlang:',
  'Payment Status': 'Tolov holati',
  'No students': 'Oquvchilar yoq',
  'Teacher Profile': 'Oqituvchi profili',
  'Contact Information': 'Aloqa malumotlari',
  'Professional Details': 'Kasbiy malumotlar',
  Username: 'Foydalanuvchi nomi',
  Email: 'Email',
  Phone: 'Telefon',
  'Date of Birth': 'Tugilgan sana',
  Gender: 'Jins',
  'Employee ID': 'Xodim ID',
  Qualification: 'Malaka',
  Specialization: 'Mutaxassislik',
  'New Password': 'Yangi parol',
  'Temporary Password': 'Vaqtinchalik parol',
  'Set Payment Password': 'Tolov parolini ornatish',
  'Payment Password': 'Tolov paroli',
  'Share this password with the teacher.': 'Bu parolni oqituvchi bilan ulashing.',
  'First Name': 'Ism',
  'Last Name': 'Familiya',
  Percentage: 'Foiz',
  Grade: 'Baho',
  'Enter Grades for Students': 'Oquvchilar uchun baholarni kiriting',
  'Tests Management': 'Testlarni boshqarish',
  'Personal Information': 'Shaxsiy malumotlar',
  Contact: 'Aloqa',
  'Avg. Grade': 'Ortacha baho',
  'Tests Taken': 'Topshirilgan testlar',
  Subject: 'Fan',
  Test: 'Test',
  Delta: 'Ozgarish',
  Reason: 'Sabab',
  By: 'Tomonidan',
  Action: 'Amal',
  'Current Balance': 'Joriy balans',
  'Update Coins': 'Coinlarni yangilash',
  'Add coins': 'Coin qoshish',
  'Subtract coins': 'Coin ayirish',
  'Select action': 'Amalni tanlang',
  'Enter amount': 'Miqdorni kiriting',
  'Reason (optional)': 'Sabab (ixtiyoriy)',
  'Reason for adjustment': 'Ozgarish sababi',
  'Student Profile': 'Oquvchi profili',
  'Student Details': 'Oquvchi malumotlari',
  'Class Snapshot': 'Sinf malumotlari',
  Guardian: 'Vasiy',
  'Guardian Phone': 'Vasiy telefoni',
  Teacher: 'Oqituvchi',
  Branches: 'Filiallar',
  'Total Students': 'Jami oquvchilar',
  'Class Coverage': 'Sinf qamrovi',
  'Paid Students': 'Tolagan oquvchilar',
  'Revenue / Paid': 'Daromad / toladi',
  'Strongest branch': 'Eng kuchli filial',
  'Revenue leader': 'Daromad yetakchisi',
  'Needs attention': 'Etibor kerak',
  'Average collected': 'Ortacha yigim',
  Executive: 'Boshqaruv',
  Revenue: 'Daromad',
  Staff: 'Xodimlar',
  'Enrollment Mix': 'Royxat tarkibi',
  '6-month revenue': '6 oylik daromad',
  peak: 'eng yuqori',
  'Centers Management': 'Markazlarni boshqarish',
  'Owner access': 'Ega kirishi',
  'Owner setup': 'Ega sozlamasi',
  'Restricted access': 'Cheklangan kirish',
  'Owner sign in': 'Ega tizimga kirishi',
  'Active Tests': 'Faol testlar',
  'Ready to take': 'Topshirishga tayyor',
  'Attendance Rate': 'Davomat foizi',
  'Outstanding Debt': 'Qolgan qarz',
  'Remaining balance': 'Qolgan balans',
  Coins: 'Coinlar',
  'Focus Today': 'Bugungi fokus',
  'Student Growth': 'Oquvchilar osishi',
  'Schools of Students': 'Oquvchilar maktablari',
  'Financial Analysis': 'Moliyaviy tahlil',
  'Collections by month segment': 'Oy qismlari boyicha yigim',
  'In Progress': 'Jarayonda',
  'Test Submissions': 'Test topshiriqlari',
  Notifications: 'Bildirishnomalar',
  Today: 'Bugun',
  'Today’s schedule': 'Bugungi jadval',
  "Today's schedule": 'Bugungi jadval',
  'No classes scheduled today.': 'Bugun darslar rejalashtirilmagan.',
  'Next test': 'Keyingi test',
  'No upcoming tests.': 'Yaqin testlar yoq.',
  'Next assignment': 'Keyingi vazifa',
  'No assignments due this week.': 'Bu hafta topshiriladigan vazifalar yoq.',
  Enrollment: 'Royxat',
  Code: 'Kod',
  Room: 'Xona',
  'Upcoming Tests': 'Yaqin testlar',
  'No tests scheduled soon.': 'Yaqinda testlar rejalashtirilmagan.',
  'Assignments Due Soon': 'Yaqin muddatli vazifalar',
  'Recent Grades': 'Songgi baholar',
  'No grades posted yet.': 'Baholar hali joylanmagan.',
  'No class': 'Sinf yoq',
  Settled: 'Yopilgan',
  Unpaid: 'Tolanmagan',
  'Classes Management': 'Sinflarni boshqarish',
  'Search classes by name, code, schedule, room...': 'Sinflarni nom, kod, jadval yoki xona boyicha qidiring...',
  'Filter by teacher': 'Oqituvchi boyicha filtr',
  'All teachers': 'Barcha oqituvchilar',
  'No classes match your search.': 'Qidiruvga mos sinflar yoq.',
  'Open class actions': 'Sinf amallarini ochish',
  'Select all visible classes': 'Korinayotgan barcha sinflarni tanlash',
  'Payment Frequency': 'Tolov davriyligi',
  'Select Frequency': 'Davriylikni tanlang',
  'Select Class Days': 'Dars kunlarini tanlang',
  'Class Time': 'Dars vaqti',
  'Teacher (Optional)': 'Oqituvchi (ixtiyoriy)',
  'Select Teacher': 'Oqituvchini tanlang',
  None: 'Yoq',
  'Attendance records found': 'Davomat yozuvlari topildi',
  'Student ID': 'Oquvchi ID',
  Session: 'Sessiya',
  'Default lesson length (minutes)': 'Standart dars davomiyligi (daqiqa)',
  'Override for next generation (minutes)': 'Keyingi yaratish uchun alohida davomiylik (daqiqa)',
  'Leave empty to use default': 'Standartdan foydalanish uchun bosh qoldiring',
  'Default calendar view': 'Standart taqvim korinishi',
  'Month view': 'Oy korinishi',
  'Week view': 'Hafta korinishi',
  'Day starts': 'Kun boshlanishi',
  'Day ends': 'Kun tugashi',
  'Total Earnings This Month': 'Bu oy jami daromad',
  'Class Earnings': 'Sinf daromadi',
  Outstanding: 'Qoldiq',
  'Total Tests': 'Jami testlar',
  'Inactive Tests': 'Nofaol testlar',
  'Total Submissions': 'Jami topshiriqlar',
  'All Types': 'Barcha turlar',
  'No questions added yet': 'Savollar hali qoshilmagan',
  'Time Taken': 'Sarflangan vaqt',
  Passed: 'Otdi',
  'Average Score': 'Ortacha ball',
  'No statistics available yet': 'Statistika hali mavjud emas',
  'Start Test': 'Testni boshlash',
  'Create New Test': 'Yangi test yaratish',
  'Test Type': 'Test turi',
  'No Subject': 'Fan yoq',
  Description: 'Tavsif',
  Instructions: 'Korsatmalar',
  'Enter instructions for students taking this test...': 'Bu testni topshiradigan oquvchilar uchun korsatmalarni kiriting...',
  'Duration (minutes)': 'Davomiylik (daqiqa)',
  'Passing Marks': 'Otish balli',
  'Reading Passages': 'Oqish matnlari',
  Passage: 'Matn',
  Title: 'Sarlavha',
  Difficulty: 'Qiyinlik',
  Easy: 'Oson',
  Medium: 'Ortacha',
  Hard: 'Qiyin',
  'Passage Content': 'Matn mazmuni',
  Questions: 'Savollar',
  'Total Marks': 'Jami ball',
  'Question Text': 'Savol matni',
  'Question Type': 'Savol turi',
  Marks: 'Ballar',
  Options: 'Variantlar',
  'Select correct answer': 'Togri javobni tanlang',
  True: 'Togri',
  False: 'Notogri',
  'Word Limit (optional)': 'Soz chegarasi (ixtiyoriy)',
  'Correct Answer': 'Togri javob',
  'Correct Answer(s) - comma separated for multiple accepted answers': 'Togri javob(lar) - bir nechta javob uchun vergul bilan ajrating',
  Explanation: 'Izoh',
  'Explanation (shown after submission)': 'Izoh (topshirgandan keyin korsatiladi)',
  'Test Settings': 'Test sozlamalari',
  'Timed Test': 'Vaqtli test',
  'Shuffle Questions': 'Savollarni aralashtirish',
  'Show Results Immediately': 'Natijalarni darhol korsatish',
  'Allow Retakes': 'Qayta topshirishga ruxsat',
  'Maximum Retakes': 'Maksimal qayta topshirish',
  Assignment: 'Biriktirish',
  'Assign To': 'Kimga biriktirish',
  'All Students': 'Barcha oquvchilar',
  'Specific Students': 'Aniq oquvchilar',
  'Specific Class': 'Aniq sinf',
  "Specific Teacher's Students": 'Aniq oqituvchi oquvchilari',
  'Review your test details before creating.': 'Yaratishdan oldin test malumotlarini tekshiring.',
  'Test Information': 'Test malumotlari',
  Type: 'Tur',
  Duration: 'Davomiylik',
  Visibility: 'Korinish',
  Private: 'Shaxsiy',
  Public: 'Ommaviy',
  'Content Summary': 'Kontent xulosasi',
  Passages: 'Matnlar',
  Timed: 'Vaqtli',
  'Retakes Allowed': 'Qayta topshirish ruxsat',
  Yes: 'Ha',
  No: 'Yoq',
  'Submission Details': 'Topshiriq tafsilotlari',
  Timestamps: 'Vaqt belgilari',
  'Answers Summary': 'Javoblar xulosasi',
  Question: 'Savol',
  Correct: 'Togri',
  'Detailed Answers': 'Batafsil javoblar',
  'No answers recorded': 'Javoblar yozilmagan',
  'Student’s Answer': 'Oquvchi javobi',
  "Student's Answer": 'Oquvchi javobi',
  Feedback: 'Fikr-mulohaza',
  'No answer provided': 'Javob berilmagan',
  'Not specified': 'Korsatilmagan',
  'Submission not found': 'Topshiriq topilmadi',
  'No answers to grade': 'Baholash uchun javoblar yoq',
  'Quick Grade': 'Tez baholash',
  'Marks Awarded': 'Berilgan ballar',
  'Feedback (optional)': 'Fikr-mulohaza (ixtiyoriy)',
  'Add feedback for this answer...': 'Bu javob uchun fikr qoshish...',
  'Assign Test': 'Testni biriktirish',
  'Assignment Settings': 'Biriktirish sozlamalari',
  'Assignment Type': 'Biriktirish turi',
  'By Class': 'Sinf boyicha',
  'Individual Students': 'Alohida oquvchilar',
  Mandatory: 'Majburiy',
  'Yes - Required': 'Ha - majburiy',
  'No - Optional': 'Yoq - ixtiyoriy',
  'Select Classes': 'Sinflarni tanlang',
  'No classes available': 'Sinflar mavjud emas',
  'Select Students': 'Oquvchilarni tanlang',
  'No students available': 'Oquvchilar mavjud emas',
  'Question Navigator': 'Savollar navigatsiyasi',
  'Type your answer here...': 'Javobingizni shu yerga yozing...',
  'Write your answer here...': 'Javobingizni shu yerga yozing...',
  'Select match...': 'Moslikni tanlang...',
  'Answer based on the reading passage...': 'Oqish matniga asoslanib javob bering...',
  'Your time has expired. Your test will be submitted automatically.': 'Vaqtingiz tugadi. Test avtomatik topshiriladi.',
  Monday: 'Dushanba',
  Tuesday: 'Seshanba',
  Wednesday: 'Chorshanba',
  Thursday: 'Payshanba',
  Friday: 'Juma',
  Saturday: 'Shanba',
  Sunday: 'Yakshanba',
  Present: 'Keldi',
  Absent: 'Kelmadi',
  Late: 'Kechikdi',
  'Filter by Day:': 'Kun boyicha filtr:',
  'No records found.': 'Yozuvlar topilmadi.',
  'Additional remarks...': 'Qoshimcha izohlar...',
  Class: 'Sinf',
  Term: 'Chorak',
  Profile: 'Profil',
  Schedule: 'Jadval',
  School: 'Maktab',
  Worked: 'Ishlangan',
  Back: 'Orqaga',
  Graded: 'Baholangan',
  Month: 'Oy',
  Result: 'Natija',
  Role: 'Rol',
  Year: 'Yil',
  Balance: 'Balans',
  Card: 'Karta',
  Cash: 'Naqd',
  Check: 'Chek',
  Activity: 'Faollik',
  Debt: 'Qarz',
  Days: 'Kunlar',
  Path: 'Yol',
  Aborted: 'Toxtatilgan',
  'Loading students...': 'Oquvchilar yuklanmoqda...',
  'Loading classes...': 'Sinflar yuklanmoqda...',
  'Loading teachers...': 'Oqituvchilar yuklanmoqda...',
  'Status *': 'Holat *',
  'All Grades': 'Barcha baholar',
  'All Statuses': 'Barcha holatlar',
  'All Terms': 'Barcha choraklar',
  'Due Date *': 'Muddat *',
  'Grade Letter': 'Harf baho',
  'Select a teacher': 'Oqituvchini tanlang',
  'Amount *': 'Miqdor *',
  'Gender Breakdown': 'Jins boyicha taqsimot',
  'No students found for this teacher': 'Bu oqituvchi uchun oquvchilar topilmadi',
  'No classes assigned to this teacher': 'Bu oqituvchiga sinflar biriktirilmagan',
  'Payment Date *': 'Tolov sanasi *',
  'Receipt Number *': 'Kvitansiya raqami *',
  'Select method': 'Usulni tanlang',
  'Select type': 'Turni tanlang',
  'Term *': 'Chorak *',
  '-- Select --': '-- Tanlang --',
  'Academic Year *': 'Oquv yili *',
  'All Genders': 'Barcha jinslar',
  'All methods': 'Barcha usullar',
  'All results': 'Barcha natijalar',
  'All Rooms': 'Barcha xonalar',
  'Assignment Name': 'Vazifa nomi',
  'Assignment Name *': 'Vazifa nomi *',
  'Date *': 'Sana *',
  'Description *': 'Tavsif *',
  'Enter new password': 'Yangi parolni kiriting',
  'Enter password': 'Parolni kiriting',
  'Marks Obtained *': 'Olingan ball *',
  'New password': 'Yangi parol',
  'No students in this class': 'Bu sinfda oquvchilar yoq',
  'Paid Share': 'Tolangan ulush',
  'Paid students': 'Tolagan oquvchilar',
  'Paid vs Unpaid': 'Tolangan va tolanmagan',
  'Parent Phone': 'Ota-ona telefoni',
  'Payment Method *': 'Tolov usuli *',
  'Payment Type *': 'Tolov turi *',
  'Regular Class': 'Oddiy sinf',
  'Reset password': 'Parolni tiklash',
  'Room Number *': 'Xona raqami *',
  'Search by student or subject...': 'Oquvchi yoki fan boyicha qidiring...',
  'Select a subject': 'Fanni tanlang',
  'Select Class': 'Sinfni tanlang',
  'Select Subject': 'Fanni tanlang',
  'Semester 1': '1-semestr',
  'Semester 2': '2-semestr',
  'Status Breakdown': 'Holat taqsimoti',
  'Subject *': 'Fan *',
  'Timed:': 'Vaqtli:',
  'Title *': 'Sarlavha *',
  'Total Amount': 'Jami miqdor',
  'Unpaid Amount': 'Tolanmagan miqdor',
  'Unpaid students': 'Tolamagan oquvchilar',
  'Academic Year': 'Oquv yili',
  'Active and inactive student balance.': 'Faol va nofaol oquvchilar balansi.',
  'Active students': 'Faol oquvchilar',
  'Add any additional notes...': 'Qoshimcha eslatmalarni kiriting...',
  'Add any remarks...': 'Izoh kiriting...',
  'Add notes...': 'Eslatma kiriting...',
  'Additional notes...': 'Qoshimcha eslatmalar...',
  'Address *': 'Manzil *',
  'Admin permissions': 'Admin ruxsatlari',
  'Analysis Period': 'Tahlil davri',
  'Are you sure you want to submit your test?': 'Testni topshirishga ishonchingiz komilmi?',
  'Assignment Coverage': 'Vazifa qamrovi',
  'Assignment:': 'Vazifa:',
  'Attendance Calendar': 'Davomat taqvimi',
  'Attendance Date *': 'Davomat sanasi *',
  'Attendance Mix': 'Davomat taqsimoti',
  'Attendance score / 50': 'Davomat balli / 50',
  'Attendance Status': 'Davomat holati',
  'Attendance Summary': 'Davomat xulosasi',
  'Average distribution per center.': 'Markazlar boyicha ortacha taqsimot.',
  'Average Percentage': 'Ortacha foiz',
  'Avg duration': 'Ortacha davomiylik',
  'Avg Students': 'Ortacha oquvchilar',
  'Avg Teachers': 'Ortacha oqituvchilar',
  'Bank Transfer': 'Bank otkazmasi',
  'Bottom 3': 'Pastki 3',
  'Capacity *': 'Sigim *',
  'Capacity Health': 'Sigim holati',
  'Center Breakdown': 'Markaz taqsimoti',
  'Center Code *': 'Markaz kodi *',
  'Center Name *': 'Markaz nomi *',
  'Choose a class from the dropdown above': 'Yuqoridagi royxatdan sinfni tanlang',
  'City *': 'Shahar *',
  'Class (Optional - leave empty for personal task)': 'Sinf (shaxsiy vazifa uchun bosh qoldiring)',
  'Class *': 'Sinf *',
  'Class activity / 30': 'Sinf faolligi / 30',
  'Class assigned': 'Sinf biriktirilgan',
  'Class Code *': 'Sinf kodi *',
  'Class Day': 'Dars kuni',
  'Class Levels': 'Sinf darajalari',
  'Class list': 'Sinf royxati',
  'Class Name *': 'Sinf nomi *',
  'Class Profile': 'Sinf profili',
  'Click &quot;Add Teacher&quot; to get started': 'Boshlash uchun &quot;Oqituvchi qoshish&quot; tugmasini bosing',
  'Coin Balance': 'Coin balansi',
  'Combined Score': 'Umumiy ball',
  'Confirm password': 'Parolni tasdiqlang',
  'Current Debt': 'Joriy qarz',
  'Current Score': 'Joriy ball',
  'Current view': 'Joriy korinish',
  'Day *': 'Kun *',
  'Days:': 'Kunlar:',
  'Delete Assignment': 'Vazifani ochirish',
  'Delete session': 'Sessiyani ochirish',
  'Device ID': 'Qurilma ID',
  'Due date': 'Muddat',
  'Duration max': 'Maksimal davomiylik',
  'Duration min': 'Minimal davomiylik',
  'Duration:': 'Davomiylik:',
  'e.g. Room 101': 'masalan, Xona 101',
  'Earned Total': 'Jami daromad',
  'Email *': 'Email *',
  'Enrollment Health': 'Royxat holati',
  'Enrollment Number': 'Royxat raqami',
  'Enter username': 'Foydalanuvchi nomini kiriting',
  'Enter your payment password provided by admin.': 'Admin bergan tolov parolini kiriting.',
  'Exact status': 'Aniq holat',
  'Exam Grades': 'Imtihon baholari',
  'Edit mode on': 'Tahrirlash rejimi yoqilgan',
  'Edit translations': 'Tarjimalarni tahrirlash',
  'Click a label, button, heading, table header, or placeholder to edit its translation.': 'Tarjimasini tahrirlash uchun label, tugma, sarlavha, jadval sarlavhasi yoki placeholder ustiga bosing.',
  'Edit translation': 'Tarjimani tahrirlash',
  'Visible text': 'Korinadigan matn',
  'placeholder text': 'Placeholder matni',
  'aria-label text': 'Aria-label matni',
  'title text': 'Title matni',
  'Editing:': 'Tahrirlanmoqda:',
  'ID / key': 'ID / kalit',
  'Save translation': 'Tarjimani saqlash',
  'Translation saved': 'Tarjima saqlandi',
  'Translation id is required': 'Tarjima ID si majburiy',
  'Could not save translation': 'Tarjimani saqlab bolmadi',
};

const createReverseTranslations = (translationMap: Record<string, string>, englishMap: Record<string, string>) => ({
  ...Object.fromEntries(Object.entries(translationMap).map(([english, uzbek]) => [uzbek, english])),
  ...Object.fromEntries(Object.entries(englishMap).map(([id, english]) => [id, english])),
}) as Record<string, string>;

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildTranslationPattern = (source: string) => {
  const escaped = escapeRegExp(source);
  if (/^[A-Za-z][A-Za-z\s]*[A-Za-z]$/.test(source)) {
    return new RegExp(`\\b${escaped}\\b`, 'g');
  }
  return new RegExp(escaped, 'g');
};

const translateExact = (
  value: string,
  language: AppLanguage,
  translationMap: Record<string, string>,
  reverseTranslationMap: Record<string, string>
) => {
  const trimmed = value.trim();
  if (!trimmed) return value;
  const translated = language === 'uz' ? translationMap[trimmed] : reverseTranslationMap[trimmed];
  if (translated) return value.replace(trimmed, translated);

  const entries = Object.entries(language === 'uz' ? translationMap : reverseTranslationMap).sort(
    (a, b) => b[0].length - a[0].length
  );
  return entries.reduce((nextValue, [source, target]) => {
    if (source.length < 3) return nextValue;
    return nextValue.replace(buildTranslationPattern(source), target);
  }, value);
};

const translateStaticDom = (
  language: AppLanguage,
  translationMap: Record<string, string>,
  reverseTranslationMap: Record<string, string>
) => {
  if (typeof document === 'undefined' || !document.body) return;

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode as Text);
  }
  textNodes.forEach((node) => {
    const currentValue = node.nodeValue || '';
    const nextValue = translateExact(currentValue, language, translationMap, reverseTranslationMap);
    if (nextValue !== currentValue) {
      node.nodeValue = nextValue;
    }
  });

  document.querySelectorAll<HTMLElement>('[placeholder], [aria-label], [title]').forEach((element) => {
    ['placeholder', 'aria-label', 'title'].forEach((attribute) => {
      const value = element.getAttribute(attribute);
      if (!value) return;
      const nextValue = translateExact(value, language, translationMap, reverseTranslationMap);
      if (nextValue !== value) {
        element.setAttribute(attribute, nextValue);
      }
    });
  });
};

interface LanguageContextValue {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  toggleLanguage: () => void;
  t: (value: string) => string;
  translations: TranslationRow[];
  refreshTranslations: () => Promise<void>;
  saveTranslation: (row: TranslationRow) => Promise<void>;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

const getInitialLanguage = (): AppLanguage => {
  if (typeof window === 'undefined') return 'en';
  const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return stored === 'uz' ? 'uz' : 'en';
};

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguageState] = useState<AppLanguage>(getInitialLanguage);
  const [remoteTranslations, setRemoteTranslations] = useState<TranslationRow[]>([]);

  const refreshTranslations = useCallback(async () => {
    try {
      const response = await translationAPI.getAll();
      setRemoteTranslations(Array.isArray(response.data) ? response.data : []);
    } catch {
      setRemoteTranslations([]);
    }
  }, []);

  const saveTranslation = useCallback(
    async (row: TranslationRow) => {
      const response = await translationAPI.save(row.id, {
        english: row.english,
        uzbek: row.uzbek,
      });
      setRemoteTranslations((currentRows) => {
        const existingIndex = currentRows.findIndex((currentRow) => currentRow.id === response.data.id);
        if (existingIndex === -1) return [...currentRows, response.data];
        return currentRows.map((currentRow, index) => (index === existingIndex ? response.data : currentRow));
      });
    },
    []
  );

  const databaseTranslationMap = useMemo(() => {
    return remoteTranslations.reduce<Record<string, string>>((acc, row) => {
      const id = row.id?.trim();
      const english = row.english?.trim();
      const uzbek = row.uzbek?.trim();
      if (!id || !uzbek) return acc;
      acc[id] = uzbek;
      if (english) acc[english] = uzbek;
      return acc;
    }, {});
  }, [remoteTranslations]);

  const databaseEnglishMap = useMemo(() => {
    return remoteTranslations.reduce<Record<string, string>>((acc, row) => {
      const id = row.id?.trim();
      const english = row.english?.trim();
      if (id && english) acc[id] = english;
      return acc;
    }, {});
  }, [remoteTranslations]);

  const activeTranslations = useMemo(
    () => ({
      ...translations,
      ...databaseTranslationMap,
    }),
    [databaseTranslationMap]
  );

  const activeReverseTranslations = useMemo(
    () => createReverseTranslations(activeTranslations, databaseEnglishMap),
    [activeTranslations, databaseEnglishMap]
  );

  useEffect(() => {
    void refreshTranslations();
  }, [refreshTranslations]);

  useEffect(() => {
    document.documentElement.lang = language === 'uz' ? 'uz' : 'en';
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }, [language]);

  useEffect(() => {
    translateStaticDom(language, activeTranslations, activeReverseTranslations);
    const observer = new MutationObserver(() => translateStaticDom(language, activeTranslations, activeReverseTranslations));
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['placeholder', 'aria-label', 'title'],
      characterData: true,
      childList: true,
      subtree: true,
    });
    return () => observer.disconnect();
  }, [language, activeTranslations, activeReverseTranslations]);

  const setLanguage = useCallback((nextLanguage: AppLanguage) => {
    setLanguageState(nextLanguage);
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguageState((current) => (current === 'en' ? 'uz' : 'en'));
  }, []);

  const t = useCallback(
    (value: string) => (language === 'uz' ? activeTranslations[value] || value : databaseEnglishMap[value] || value),
    [language, activeTranslations, databaseEnglishMap]
  );

  const contextValue = useMemo(
    () => ({
      language,
      setLanguage,
      toggleLanguage,
      t,
      translations: remoteTranslations,
      refreshTranslations,
      saveTranslation,
    }),
    [language, setLanguage, toggleLanguage, t, remoteTranslations, refreshTranslations, saveTranslation]
  );

  return <LanguageContext.Provider value={contextValue}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};
