import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { translationAPI, type TranslationRow } from '../shared/api/api';

export type AppLanguage = 'en' | 'uz';

const LANGUAGE_STORAGE_KEY = 'crm_language';

const translations: Record<string, string> = {
  Dashboard: 'Boshqaruv paneli',
  'My Portal': 'Mening portalim',
  'My Tests': 'Mening testlarim',
  Students: "O'quvchilar",
  students: "o'quvchi",
  Teachers: "O'qituvchilar",
  Classes: 'Sinflar',
  Rooms: 'Xonalar',
  Logs: 'Jurnallar',
  Calendar: 'Taqvim',
  Settings: 'Sozlamalar',
  Tests: 'Testlar',
  Payments: "To'lovlar",
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
  'Switch to light mode': "Yorug' rejimga o'tish",
  'Switch to dark mode': "Qorong'u rejimga o'tish",
  'Open sidebar': 'Yon panelni ochish',
  'Close sidebar': 'Yon panelni yopish',
  Loading: 'Yuklanmoqda',
  'Loading...': 'Yuklanmoqda...',
  'Access Denied': 'Kirish rad etildi',
  "You don't have permission to access this resource.": "Bu sahifaga kirish huquqingiz yo'q.",
  'Go to Dashboard': "Boshqaruv paneliga o'tish",
  English: 'Inglizcha',
  Uzbek: "O'zbekcha",
  Language: 'Til',
  'Debts Management': 'Qarzlarni boshqarish',
  'Add Debt': "Qarz qo'shish",
  'Debt Records': 'Qarz yozuvlari',
  'Student Name': "O'quvchi ismi",
  'Debt Amount': 'Qarz miqdori',
  'Paid Amount': "To'langan miqdor",
  Remaining: 'Qoldiq',
  'Due Date': 'Muddat',
  Actions: 'Amallar',
  'No debt records match your search': 'Qidiruvga mos qarz yozuvlari topilmadi',
  'No debt records found': 'Qarz yozuvlari topilmadi',
  'Edit Debt': 'Qarzni tahrirlash',
  'Add New Debt': "Yangi qarz qo'shish",
  Student: "O'quvchi",
  Center: 'Markaz',
  'Select a student': "O'quvchini tanlang",
  'Select a center': 'Markazni tanlang',
  'Amount Paid': "To'langan miqdor",
  'Debt Date': 'Qarz sanasi',
  Remarks: 'Izohlar',
  Cancel: "Bekor qilish",
  Save: 'Saqlash',
  'Saving...': 'Saqlanmoqda...',
  'Search debts by student, amount, date, remarks...': "Qarzlarni o'quvchi, miqdor, sana yoki izoh bo'yicha qidiring...",
  Add: "Qo'shish",
  'Add New': "Yangi qo'shish",
  Edit: 'Tahrirlash',
  Delete: "O'chirish",
  Clear: 'Tozalash',
  Search: 'Qidirish',
  Select: 'Tanlang',
  Filters: 'Filtrlar',
  'Clear All': 'Hammasini tozalash',
  Name: 'Ism',
  Password: 'Parol',
  Status: 'Holat',
  Notes: 'Eslatmalar',
  Date: 'Sana',
  Method: 'Usul',
  Amount: 'Miqdor',
  'Payment History': "To'lovlar tarixi",
  'Add Payment': "To'lov qo'shish",
  'Edit Payment': "To'lovni tahrirlash",
  'Payment Date': "To'lov sanasi",
  'Payment Method': "To'lov usuli",
  'Payment Type': "To'lov turi",
  'Receipt Number': 'Kvitansiya raqami',
  'Receipt #': 'Kvitansiya #',
  'No payment records': "To'lov yozuvlari yo'q",
  'No payments found': "To'lovlar topilmadi",
  'No payments match your criteria': "Mezonlarga mos to'lovlar topilmadi",
  'Search by student, receipt, reference...': "O'quvchi, kvitansiya yoki havola bo'yicha qidiring...",
  Total: 'Jami',
  Collected: 'Yigildi',
  Expected: 'Kutilgan',
  'Outstanding debt': 'Qolgan qarz',
  'Paid': "To'langan",
  Unpaid: "To'lanmagan",
  'Still unpaid': "Hali to'lanmagan",
  'Should pay': 'Tolashi kerak',
  'Student Payments': "O'quvchi to'lovlari",
  'Monthly tuition': "Oylik to'lov",
  'Payment Amount': "To'lov miqdori",
  'Class Schedule': 'Dars jadvali',
  'Class Code': 'Sinf kodi',
  Level: 'Daraja',
  Capacity: "Sig'im",
  'Room Number': 'Xona raqami',
  'No data available': "Ma'lumot yo'q",
  'No data': "Ma'lumot yo'q",
  'No room': "Xona yo'q",
  'No classes found': 'Sinflar topilmadi',
  'No students found': "O'quvchilar topilmadi",
  'No teachers found': "O'qituvchilar topilmadi",
  'Select currency': 'Valyutani tanlang',
  Currency: 'Valyuta',
  'Monthly Fee Amount': "Oylik to'lov miqdori",
  'Generate Debt Records': 'Qarz yozuvlarini yaratish',
  'All students have made payments for the analyzed period!': "Tahlil qilingan davr uchun barcha o'quvchilar to'lov qilgan!",
  'Unpaid Months:': "To'lanmagan oylar:",
  'Present out of Total': 'Jami ichida kelganlar',
  Submitted: 'Topshirilgan',
  Overall: 'Umumiy',
  'Average Grade': "O'rtacha baho",
  'Current month snapshot': 'Joriy oy holati',
  'Monthly Revenue': 'Oylik daromad',
  'Teacher Earnings': "O'qituvchi daromadlari",
  Earnings: 'Daromad',
  'Earned total': 'Jami daromad',
  'Top teacher': "Eng yaxshi o'qituvchi",
  'Selected month': 'Tanlangan oy',
  'Revenue Pulse': 'Daromad holati',
  'Payment Trend': "To'lov tendensiyasi",
  'Paid share': "To'langan ulush",
  'Avg paid': "O'rtacha to'lov",
  'Students by Center': "Markaz bo'yicha o'quvchilar",
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
  'View details': "Tafsilotlarni ko'rish",
  'View Details': "Tafsilotlarni ko'rish",
  'View Submission': "Topshiriqni ko'rish",
  'Grade Submission': 'Topshiriqni baholash',
  'Delete Test': "Testni o'chirish",
  'No tests found': 'Testlar topilmadi',
  'Failed to load tests': "Testlarni yuklab bo'lmadi",
  'No submissions yet': "Topshiriqlar hali yo'q",
  'No grades recorded yet': 'Baholar hali yozilmagan',
  'No grades recorded': 'Baholar yozilmagan',
  'No attendance records': "Davomat yozuvlari yo'q",
  'No test results': "Test natijalari yo'q",
  'No coin transactions yet': "Coin tranzaksiyalari hali yo'q",
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
  'Search students...': "O'quvchilarni qidiring...",
  'Search tests...': 'Testlarni qidiring...',
  'Search assignments...': 'Vazifalarni qidiring...',
  'Search students by name, email, or enrollment...': "O'quvchilarni ism, email yoki ro'yxat raqami bo'yicha qidiring...",
  'Search by student name...': "O'quvchi ismi bo'yicha qidiring...",
  'Search teachers by name or email...': "O'qituvchilarni ism yoki email bo'yicha qidiring...",
  'Search teachers by name, ID, subject, email, phone...': "O'qituvchilarni ism, ID, fan, email yoki telefon bo'yicha qidiring...",
  'Search centers by name, code, city, phone...': "Markazlarni nom, kod, shahar yoki telefon bo'yicha qidiring...",
  'All Classes': 'Barcha sinflar',
  'All Subjects': 'Barcha fanlar',
  'All Status': 'Barcha holatlar',
  'All Methods': 'Barcha usullar',
  'Select status': 'Holatni tanlang',
  'Select gender': 'Jinsni tanlang',
  'Select teacher': "O'qituvchini tanlang",
  'Select subject': 'Fanni tanlang',
  'Select term': 'Chorakni tanlang',
  'Select branch': 'Filialni tanlang',
  'Switch branch': 'Filialni almashtirish',
  'Total Grades': 'Jami baholar',
  'Class Average': "Sinf o'rtachasi",
  'Grade Types': 'Baho turlari',
  'Student Grades': "O'quvchi baholari",
  'Recent Activity': "So'nggi faollik",
  'Enrollment #': "Ro'yxat raqami",
  'Grades Count': 'Baholar soni',
  Average: "O'rtacha",
  'Letter Grade': 'Harf bahosi',
  'Add Grade': "Baho qo'shish",
  'Grade Type': 'Baho turi',
  Score: 'Ball',
  'Max Score': 'Maksimal ball',
  'Notes (optional)': 'Eslatmalar (ixtiyoriy)',
  'Submitted At': 'Topshirilgan vaqt',
  'Select Month:': 'Oyni tanlang:',
  'Payment Status': "To'lov holati",
  'No students': "O'quvchilar yo'q",
  'Teacher Profile': "O'qituvchi profili",
  'Contact Information': "Aloqa ma'lumotlari",
  'Professional Details': "Kasbiy ma'lumotlar",
  Username: 'Foydalanuvchi nomi',
  Email: 'Email',
  Phone: 'Telefon',
  'Date of Birth': "Tug'ilgan sana",
  Gender: 'Jins',
  'Employee ID': 'Xodim ID',
  Qualification: 'Malaka',
  Specialization: 'Mutaxassislik',
  'New Password': 'Yangi parol',
  'Temporary Password': 'Vaqtinchalik parol',
  'Set Payment Password': "To'lov parolini o'rnatish",
  'Payment Password': "To'lov paroli",
  'Share this password with the teacher.': "Bu parolni o'qituvchi bilan ulashing.",
  'First Name': 'Ism',
  'Last Name': 'Familiya',
  Percentage: 'Foiz',
  Grade: 'Baho',
  'Enter Grades for Students': "O'quvchilar uchun baholarni kiriting",
  'Tests Management': 'Testlarni boshqarish',
  'Personal Information': "Shaxsiy ma'lumotlar",
  Contact: 'Aloqa',
  'Avg. Grade': "O'rtacha baho",
  'Tests Taken': 'Topshirilgan testlar',
  Subject: 'Fan',
  Test: 'Test',
  'Test Results': 'Test natijalari',
  Delta: "O'zgarish",
  Reason: 'Sabab',
  By: 'Tomonidan',
  Action: 'Amal',
  in: 'fan:',
  'Current Balance': 'Joriy balans',
  'Update Coins': 'Coinlarni yangilash',
  'Add coins': "Coin qo'shish",
  'Subtract coins': 'Coin ayirish',
  'Select action': 'Amalni tanlang',
  'Enter amount': 'Miqdorni kiriting',
  'Reason (optional)': 'Sabab (ixtiyoriy)',
  'Reason for adjustment': "O'zgarish sababi",
  'Student Profile': "O'quvchi profili",
  'Student Details': "O'quvchi ma'lumotlari",
  'Class Snapshot': "Sinf ma'lumotlari",
  Guardian: 'Vasiy',
  'Guardian Phone': 'Vasiy telefoni',
  Teacher: "O'qituvchi",
  Branches: 'Filiallar',
  'Total Students': "Jami o'quvchilar",
  'Class Coverage': 'Sinf qamrovi',
  'Paid Students': "To'lagan o'quvchilar",
  'Revenue / Paid': "Daromad / to'langan",
  'Strongest branch': 'Eng kuchli filial',
  'Revenue leader': 'Daromad yetakchisi',
  'Needs attention': 'Etibor kerak',
  'Average collected': "O'rtacha yigim",
  Executive: 'Boshqaruv',
  Revenue: 'Daromad',
  Staff: 'Xodimlar',
  'Enrollment Mix': "Ro'yxat tarkibi",
  '6-month revenue': "6 oylik daromad",
  peak: 'eng yuqori',
  'Centers Management': 'Markazlarni boshqarish',
  'Owner access': 'Ega kirishi',
  'Owner setup': 'Ega sozlamasi',
  'Restricted access': 'Cheklangan kirish',
  'Owner sign in': 'Ega tizimga kirishi',
  'Student Portal - Your schedule, tests, assignments, grades, and payments': "O'quvchi portali - jadval, testlar, vazifalar, baholar va to'lovlar",
  'Active Tests': 'Faol testlar',
  'Ready to take': 'Topshirishga tayyor',
  'Attendance Rate': 'Davomat foizi',
  present: 'kelgan',
  'Outstanding Debt': 'Qolgan qarz',
  'Remaining balance': 'Qolgan balans',
  'Across posted grades': "Joylangan baholar bo'yicha",
  Coins: 'Coinlar',
  'Current balance': 'Joriy balans',
  'Focus Today': 'Bugungi fokus',
  'Student Growth': "O'quvchilar o'sishi",
  'Schools of Students': "O'quvchilar maktablari",
  'Financial Analysis': 'Moliyaviy tahlil',
  'Collections by month segment': "Oy qismlari bo'yicha yig'im",
  'In Progress': 'Jarayonda',
  'Test Submissions': 'Test topshiriqlari',
  Notifications: 'Bildirishnomalar',
  Today: 'Bugun',
  'The most important student work for the next school day.': "Keyingi o'quv kuni uchun eng muhim ishlar.",
  'Today’s schedule': 'Bugungi jadval',
  "Today's schedule": 'Bugungi jadval',
  'No classes scheduled today.': 'Bugun darslar rejalashtirilmagan.',
  classes: 'dars',
  'Next test': 'Keyingi test',
  'No upcoming tests.': "Yaqin testlar yo'q.",
  'Next assignment': 'Keyingi vazifa',
  'No assignments due this week.': "Bu hafta topshiriladigan vazifalar yo'q.",
  Enrollment: "Ro'yxat",
  Code: 'Kod',
  Room: 'Xona',
  'Class not assigned': 'Sinf biriktirilmagan',
  'No subjects assigned yet.': 'Hali fanlar biriktirilmagan.',
  'Upcoming Tests': 'Yaqin testlar',
  'View all': "Hammasini ko'rish",
  'No tests scheduled soon.': 'Yaqinda testlar rejalashtirilmagan.',
  'Assignments Due Soon': 'Yaqin muddatli vazifalar',
  due: 'muddatli',
  'Recent Grades': "So'nggi baholar",
  total: 'jami',
  'No grades posted yet.': 'Baholar hali joylanmagan.',
  'Weekly Class Schedule': 'Haftalik dars jadvali',
  'Unknown date': "Noma'lum sana",
  'N/A': 'Mavjud emas',
  'No class': "Sinf yo'q",
  Settled: 'Yopilgan',
  'Classes Management': 'Sinflarni boshqarish',
  'Search classes by name, code, schedule, room...': "Sinflarni nom, kod, jadval yoki xona bo'yicha qidiring...",
  'Filter by teacher': "O'qituvchi bo'yicha filtr",
  'All teachers': "Barcha o'qituvchilar",
  'No classes match your search.': "Qidiruvga mos sinflar yo'q.",
  'Open class actions': 'Sinf amallarini ochish',
  'Select all visible classes': "Ko'rinayotgan barcha sinflarni tanlash",
  'Payment Frequency': "To'lov davriyligi",
  'Select Frequency': 'Davriylikni tanlang',
  'Select Class Days': 'Dars kunlarini tanlang',
  'Class Time': 'Dars vaqti',
  'Teacher (Optional)': "O'qituvchi (ixtiyoriy)",
  'Select Teacher': "O'qituvchini tanlang",
  None: "Yo'q",
  'Attendance records found': 'Davomat yozuvlari topildi',
  'Student ID': "O'quvchi ID",
  Session: 'Sessiya',
  'Default lesson length (minutes)': 'Standart dars davomiyligi (daqiqa)',
  'Override for next generation (minutes)': 'Keyingi yaratish uchun alohida davomiylik (daqiqa)',
  'Leave empty to use default': 'Standartdan foydalanish uchun bosh qoldiring',
  'Default calendar view': "Standart taqvim ko'rinishi",
  'Month view': "Oy ko'rinishi",
  'Week view': "Hafta ko'rinishi",
  'Day starts': 'Kun boshlanishi',
  'Day ends': 'Kun tugashi',
  'Total Earnings This Month': 'Bu oy jami daromad',
  'Class Earnings': 'Sinf daromadi',
  Outstanding: 'Qoldiq',
  'Total Tests': 'Jami testlar',
  'Inactive Tests': 'Nofaol testlar',
  'Total Submissions': 'Jami topshiriqlar',
  'All Types': 'Barcha turlar',
  'No questions added yet': "Savollar hali qo'shilmagan",
  'Time Taken': 'Sarflangan vaqt',
  Passed: 'Otdi',
  'Average Score': "O'rtacha ball",
  'No statistics available yet': 'Statistika hali mavjud emas',
  'Start Test': 'Testni boshlash',
  'Create New Test': 'Yangi test yaratish',
  'Test Type': 'Test turi',
  'No Subject': "Fan yo'q",
  Description: 'Tavsif',
  Instructions: "Ko'rsatmalar",
  'Enter instructions for students taking this test...': "Bu testni topshiradigan o'quvchilar uchun ko'rsatmalarni kiriting...",
  'Duration (minutes)': 'Davomiylik (daqiqa)',
  'Passing Marks': "O'tish balli",
  'Reading Passages': 'Oqish matnlari',
  Passage: 'Matn',
  Title: 'Sarlavha',
  Difficulty: 'Qiyinlik',
  Easy: 'Oson',
  Medium: "O'rtacha",
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
  False: "Noto'g'ri",
  'Word Limit (optional)': 'Soz chegarasi (ixtiyoriy)',
  'Correct Answer': 'Togri javob',
  'Correct Answer(s) - comma separated for multiple accepted answers': 'Togri javob(lar) - bir nechta javob uchun vergul bilan ajrating',
  Explanation: 'Izoh',
  'Explanation (shown after submission)': "Izoh (topshirgandan keyin ko'rsatiladi)",
  'Test Settings': 'Test sozlamalari',
  'Timed Test': 'Vaqtli test',
  'Shuffle Questions': 'Savollarni aralashtirish',
  'Show Results Immediately': "Natijalarni darhol ko'rsatish",
  'Allow Retakes': 'Qayta topshirishga ruxsat',
  'Maximum Retakes': 'Maksimal qayta topshirish',
  Assignment: 'Biriktirish',
  'Assign To': 'Kimga biriktirish',
  'All Students': "Barcha o'quvchilar",
  'Specific Students': "Aniq o'quvchilar",
  'Specific Class': 'Aniq sinf',
  "Specific Teacher's Students": "Aniq o'qituvchi o'quvchilari",
  'Review your test details before creating.': "Yaratishdan oldin test ma'lumotlarini tekshiring.",
  'Test Information': "Test ma'lumotlari",
  Type: 'Tur',
  Duration: 'Davomiylik',
  Visibility: "Ko'rinish",
  Private: 'Shaxsiy',
  Public: 'Ommaviy',
  'Content Summary': 'Kontent xulosasi',
  Passages: 'Matnlar',
  Timed: 'Vaqtli',
  'Retakes Allowed': 'Qayta topshirish ruxsat',
  Yes: 'Ha',
  No: "Yo'q",
  'Submission Details': 'Topshiriq tafsilotlari',
  Timestamps: 'Vaqt belgilari',
  'Answers Summary': 'Javoblar xulosasi',
  Question: 'Savol',
  Correct: 'Togri',
  'Detailed Answers': 'Batafsil javoblar',
  'No answers recorded': 'Javoblar yozilmagan',
  'Student’s Answer': "O'quvchi javobi",
  "Student's Answer": "O'quvchi javobi",
  Feedback: 'Fikr-mulohaza',
  'No answer provided': 'Javob berilmagan',
  'Not specified': "Ko'rsatilmagan",
  'Submission not found': 'Topshiriq topilmadi',
  'No answers to grade': "Baholash uchun javoblar yo'q",
  'Quick Grade': 'Tez baholash',
  'Marks Awarded': 'Berilgan ballar',
  'Feedback (optional)': 'Fikr-mulohaza (ixtiyoriy)',
  'Add feedback for this answer...': "Bu javob uchun fikr qo'shish...",
  'Assign Test': 'Testni biriktirish',
  'Assignment Settings': 'Biriktirish sozlamalari',
  'Assignment Type': 'Biriktirish turi',
  'By Class': "Sinf bo'yicha",
  'Individual Students': "Alohida o'quvchilar",
  Mandatory: 'Majburiy',
  'Yes - Required': 'Ha - majburiy',
  'No - Optional': "Yo'q - ixtiyoriy",
  'Select Classes': 'Sinflarni tanlang',
  'No classes available': 'Sinflar mavjud emas',
  'Select Students': "O'quvchilarni tanlang",
  'No students available': "O'quvchilar mavjud emas",
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
  'Filter by Day:': "Kun bo'yicha filtr:",
  'No records found.': 'Yozuvlar topilmadi.',
  'Additional remarks...': "Qo'shimcha izohlar...",
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
  'Loading students...': "O'quvchilar yuklanmoqda...",
  'Loading classes...': 'Sinflar yuklanmoqda...',
  'Loading teachers...': "O'qituvchilar yuklanmoqda...",
  'Status *': 'Holat *',
  'All Grades': 'Barcha baholar',
  'All Statuses': 'Barcha holatlar',
  'All Terms': 'Barcha choraklar',
  'Due Date *': 'Muddat *',
  'Grade Letter': 'Harf baho',
  'Select a teacher': "O'qituvchini tanlang",
  'Amount *': 'Miqdor *',
  'Gender Breakdown': "Jins bo'yicha taqsimot",
  'No students found for this teacher': "Bu o'qituvchi uchun o'quvchilar topilmadi",
  'No classes assigned to this teacher': "Bu o'qituvchiga sinflar biriktirilmagan",
  'Payment Date *': "To'lov sanasi *",
  'Receipt Number *': 'Kvitansiya raqami *',
  'Select method': 'Usulni tanlang',
  'Select type': 'Turni tanlang',
  'Term *': 'Chorak *',
  '-- Select --': '-- Tanlang --',
  'Academic Year *': "O'quv yili *",
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
  'No students in this class': "Bu sinfda o'quvchilar yo'q",
  'Paid Share': "To'langan ulush",
  'Paid students': "To'lagan o'quvchilar",
  'Paid vs Unpaid': "To'langan va to'lanmagan",
  'Parent Phone': 'Ota-ona telefoni',
  'Payment Method *': "To'lov usuli *",
  'Payment Type *': "To'lov turi *",
  'Regular Class': 'Oddiy sinf',
  'Reset password': 'Parolni tiklash',
  'Room Number *': 'Xona raqami *',
  'Search by student or subject...': "O'quvchi yoki fan bo'yicha qidiring...",
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
  'Unpaid Amount': "To'lanmagan miqdor",
  'Unpaid students': "To'lamagan o'quvchilar",
  'Academic Year': "O'quv yili",
  'Active and inactive student balance.': "Faol va nofaol o'quvchilar balansi.",
  'Active students': "Faol o'quvchilar",
  'Add any additional notes...': "Qo'shimcha eslatmalarni kiriting...",
  'Add any remarks...': 'Izoh kiriting...',
  'Add notes...': 'Eslatma kiriting...',
  'Additional notes...': "Qo'shimcha eslatmalar...",
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
  'Average distribution per center.': "Markazlar bo'yicha o'rtacha taqsimot.",
  'Average Percentage': "O'rtacha foiz",
  'Avg duration': "O'rtacha davomiylik",
  'Avg Students': "O'rtacha o'quvchilar",
  'Avg Teachers': "O'rtacha o'qituvchilar",
  'Bank Transfer': "Bank o'tkazmasi",
  'Bottom 3': 'Pastki 3',
  'Capacity *': "Sig'im *",
  'Capacity Health': "Sig'im holati",
  'Center Breakdown': 'Markaz taqsimoti',
  'Center Code *': 'Markaz kodi *',
  'Center Name *': 'Markaz nomi *',
  'Choose a class from the dropdown above': "Yuqoridagi ro'yxatdan sinfni tanlang",
  'City *': 'Shahar *',
  'Class (Optional - leave empty for personal task)': 'Sinf (shaxsiy vazifa uchun bosh qoldiring)',
  'Class *': 'Sinf *',
  'Class activity / 30': 'Sinf faolligi / 30',
  'Class assigned': 'Sinf biriktirilgan',
  'Class Code *': 'Sinf kodi *',
  'Class Day': 'Dars kuni',
  'Class Levels': 'Sinf darajalari',
  'Class list': "Sinf ro'yxati",
  'Class Name *': 'Sinf nomi *',
  'Class Profile': 'Sinf profili',
  'Click &quot;Add Teacher&quot; to get started': "Boshlash uchun &quot;O'qituvchi qo'shish&quot; tugmasini bosing",
  'Coin Balance': 'Coin balansi',
  'Combined Score': 'Umumiy ball',
  'Confirm password': 'Parolni tasdiqlang',
  'Current Debt': 'Joriy qarz',
  'Current Score': 'Joriy ball',
  'Current view': "Joriy ko'rinish",
  'Day *': 'Kun *',
  'Days:': 'Kunlar:',
  'Delete Assignment': "Vazifani o'chirish",
  'Delete session': "Sessiyani o'chirish",
  'Device ID': 'Qurilma ID',
  'Due date': 'Muddat',
  'Duration max': 'Maksimal davomiylik',
  'Duration min': 'Minimal davomiylik',
  'Duration:': 'Davomiylik:',
  'e.g. Room 101': 'masalan, Xona 101',
  'Earned Total': 'Jami daromad',
  'Email *': 'Email *',
  'Enrollment Health': "Ro'yxat holati",
  'Enrollment Number': "Ro'yxat raqami",
  'Enter username': 'Foydalanuvchi nomini kiriting',
  'Enter your payment password provided by admin.': "Admin bergan to'lov parolini kiriting.",
  'Exact status': 'Aniq holat',
  'Exam Grades': 'Imtihon baholari',
  'Edit mode on': "Tahrirlash rejimi yo'qilgan",
  'Edit translations': 'Tarjimalarni tahrirlash',
  'Click a label, button, heading, table header, or placeholder to edit its translation.': 'Tarjimasini tahrirlash uchun label, tugma, sarlavha, jadval sarlavhasi yoki placeholder ustiga bosing.',
  'Edit translation': 'Tarjimani tahrirlash',
  'Visible text': "Ko'rinadigan matn",
  'placeholder text': 'Placeholder matni',
  'aria-label text': 'Aria-label matni',
  'title text': 'Title matni',
  'Editing:': 'Tahrirlanmoqda:',
  'ID / key': 'ID / kalit',
  'Save translation': 'Tarjimani saqlash',
  'Translation saved': 'Tarjima saqlandi',
  'Translation id is required': 'Tarjima ID si majburiy',
  'Could not save translation': "Tarjimani saqlab bo'lmadi",
  'Refresh translations': 'Tarjimalarni yangilash',
  'Translations refreshed': 'Tarjimalar yangilandi',
  'Could not refresh translations': "Tarjimalarni yangilab bo'lmadi",
  'Owner system settings': 'Ega tizim sozlamalari',
  'Redeploy server': 'Serverni qayta joylash',
  'Runs the configured redeploy script after confirming the password from the backend .env file.': 'Backend .env faylidagi parol tasdiqlangandan keyin sozlangan redeploy skriptini ishga tushiradi.',
  Redeploy: 'Qayta joylash',
  'Confirm server redeploy': 'Server redeployini tasdiqlash',
  'Enter the redeploy password from': 'Redeploy parolini kiriting:',
  'Redeploy password': 'Redeploy paroli',
  'Redeploy password is required.': 'Redeploy paroli majburiy.',
  'Server redeploy started.': 'Server redeployi boshlandi.',
  'Could not start server redeploy.': "Server redeployini boshlab bo'lmadi.",
  'Start redeploy': 'Redeployni boshlash',
  'Starting...': 'Boshlanmoqda...',
  'No tests assigned to this class.': 'Bu sinfga testlar biriktirilmagan.',
  'Untitled test': 'Nomsiz test',
  Optional: 'Ixtiyoriy',
  Open: 'Ochish',
  'No duration': "Davomiylik yo'q",
  'pass': "o'tish",
  'Welcome back': 'Qaytganingiz bilan',
  'Teacher Portal - Manage your classes, students, and tests': "O'qituvchi portali - sinflar, o'quvchilar va testlarni boshqaring",
  'Teaching Workspace': "O'qituvchi ish maydoni",
  'Switch between the daily tools you use most.': 'Eng kop ishlatadigan kundalik vositalaringiz orasida almashing.',
  'Assigned to you': 'Sizga biriktirilgan',
  active: 'faol',
  'Open test work': 'Test ishlarini ochish',
  'Pending Grading': 'Baholash kutilmoqda',
  'Nothing pending': "Kutilayotgan narsa yo'q",
  "Today's Attendance": 'Bugungi davomat',
  'Records today': 'Bugungi yozuvlar',
  'To review': 'Tekshirish kerak',
  'Quick add': "Tez qo'shish",
  'Create Test': 'Test yaratish',
  'Take Attendance': 'Davomat olish',
  'Create Assignment': 'Vazifa yaratish',
  'Enter Grades': 'Baholarni kiritish',
  'My Classes': 'Mening sinflarim',
  'My Students': "Mening o'quvchilarim",
  'No classes assigned yet': 'Hali sinflar biriktirilmagan',
  'Classes will appear here once they are assigned to you': "Sinflar sizga biriktirilgandan keyin shu yerda ko'rinadi",
  'Student Payments Tracker': "O'quvchi to'lovlari kuzatuvchisi",
  'Showing': "Ko'rsatilmoqda",
  'of': 'dan',
  'Full Profile': "To'liq profil",
  'View Grades': "Baholarni ko'rish",
  'View Attendance': "Davomatni ko'rish",
  'View Test Results': "Test natijalarini ko'rish",
  'View Full Profile': "To'liq profilni ko'rish",
  Overview: "Umumiy ko'rinish",
  'Parent/Guardian': 'Ota-ona / vasiy',
  'With Submissions': 'Topshiriqlar bilan',
  'Try adjusting your search': "Qidiruvni o'zgartirib ko'ring",
  'Create your first test to get started': 'Boshlash uchun birinchi testingizni yarating',
  'Edit Test': 'Testni tahrirlash',
  'View Submissions': "Topshiriqlarni ko'rish",
  submissions: 'topshiriqlar',
  questions: 'savollar',
  marks: 'ball',
  min: 'daq',
  'Are you sure you want to delete': "O'chirishni xohlaysizmi",
  'This action cannot be undone.': "Bu amalni qaytarib bo'lmaydi.",
  'New Assignment': 'Yangi vazifa',
  'Total Assignments': 'Jami vazifalar',
  'Past Due': 'Muddati otgan',
  'No assignments found': 'Vazifalar topilmadi',
  'Create a new assignment to get started': 'Boshlash uchun yangi vazifa yarating',
  'No past due assignments': "Muddati otgan vazifalar yo'q",
  Overdue: 'Muddati otgan',
  'Due Today': 'Bugun muddati',
  'Due Soon': 'Yaqinda muddati',
  Due: 'Muddat',
  Max: 'Maks',
  pts: 'ball',
  'Edit Assignment': 'Vazifani tahrirlash',
  'Create New Assignment': 'Yangi vazifa yaratish',
  'Please fill in all required fields': "Barcha majburiy maydonlarni to'ldiring",
  'Assignment updated successfully!': 'Vazifa muvaffaqiyatli yangilandi!',
  'Assignment created successfully!': 'Vazifa muvaffaqiyatli yaratildi!',
  'Assignment deleted successfully!': "Vazifa muvaffaqiyatli o'chirildi!",
  'Failed to save assignment': "Vazifani saqlab bo'lmadi",
  'Failed to delete assignment': "Vazifani o'chirib bo'lmadi",
  'Select a class to take attendance': 'Davomat olish uchun sinfni tanlang',
  'Half Day': 'Yarim kun',
  'Mark All Present': 'Hammasini keldi qilish',
  'Mark All Absent': 'Hammasini kelmadi qilish',
  'Save Attendance': 'Davomatni saqlash',
  'Attendance already recorded for this date. Saving will update the records.': 'Bu sana uchun davomat allaqachon yozilgan. Saqlash yozuvlarni yangilaydi.',
  'You are about to save attendance for': 'Siz davomatni saqlamoqchisiz:',
  'students on': "o'quvchi, sana:",
  'Attendance saved successfully for': 'Davomat muvaffaqiyatli saqlandi:',
  'Failed to save attendance. Please try again.': "Davomatni saqlab bo'lmadi. Qayta urinib ko'ring.",
  'Select a subject first': 'Avval fanni tanlang',
  'Please select a subject first': 'Avval fanni tanlang',
  'Grade saved successfully!': 'Baho muvaffaqiyatli saqlandi!',
  'Failed to save grade': "Bahoni saqlab bo'lmadi",
  'Select a class to view students': "O'quvchilarni ko'rish uchun sinfni tanlang",
  'Add Grade for': "Baho qo'shish:",
  'Please select a subject from the filters above before adding a grade': "Baho qo'shishdan oldin yuqoridagi filtrlardan fanni tanlang",
  'Save Grade': 'Bahoni saqlash',
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
    if (node.parentElement?.closest('[data-translation-skip]')) return;
    const currentValue = node.nodeValue || '';
    const nextValue = translateExact(currentValue, language, translationMap, reverseTranslationMap);
    if (nextValue !== currentValue) {
      node.nodeValue = nextValue;
    }
  });

  document.querySelectorAll<HTMLElement>('[placeholder], [aria-label], [title]').forEach((element) => {
    if (element.closest('[data-translation-skip]')) return;
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
  if (typeof window === 'undefined') return 'uz';
  const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return stored === 'en' ? 'en' : 'uz';
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
