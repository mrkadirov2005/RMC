[4/15/2026 9:23 AM] Shakhobov Temurbek: CRM uchun Coin System TZ

1. Loyihaning maqsadi

CRM ichida o‘quvchilarning har bir darsdagi natijasiga qarab avtomatik ball, coin, reyting, oylik natija va Red List tizimini yaratish kerak.

Tizim quyidagilarni bajarishi kerak:

 

- [ ]  ustoz har dars uchun o‘quvchiga ball qo‘yadi
- [ ]  CRM ballga qarab coinni avtomatik hisoblaydi
- [ ]  qo‘shimcha bonus coinlarni ham avtomatik yoki admin tasdiqlashi bilan qo‘shadi
- [ ]  o‘quvchi Telegram bot orqali o‘z balli, coini va reytingini ko‘ra oladi
- [ ]  ustoz o‘z guruhidagi o‘quvchilar natijasini ko‘radi
- [ ]  admin barcha guruhlar va barcha ustozlar natijasini ko‘ra oladi
[4/15/2026 9:23 AM] Shakhobov Temurbek: 2. Rollar

2.1. Student

Telegram bot orqali:

- [ ]  bugungi dars natijasi
- [ ]  bugungi coin
- [ ]  bugungi o‘rni
- [ ]  oylik ball
- [ ]  oylik coin
- [ ]  oylik reyting ko‘ra oladi
- [ ]  faqat o‘z guruhlariga kiradi
- [ ]  har dars uchun ball qo‘yadi
- [ ]  o‘z guruhidagi o‘quvchilarning kundalik va oylik natijasini ko‘ra oladi

2.3. Admin

- [ ]  barcha guruhlarni ko‘radi
- [ ]  barcha ustozlar guruhlarini ko‘radi
- [ ]  umumiy reytingni ko‘radi
- [ ]  Red List bo‘limini ko‘radi
- [ ]  extra coin tasdiqlaydi

 3. Har dars uchun ball tizimi

Har bir dars maksimal 100 ball bo‘ladi.

3.1. Davomat — 50 ball

- [ ]  vaqtida keldi = 50 ball
- [ ]  kechikib keldi = 40 ball
- [ ]  sababli qoldirdi = 30 ball
- [ ]  sababsiz qoldirdi = 0 ball

3.2. 

- [ ]  Aktivlik — 30 ball
- [ ]  juda aktiv = 30 ball
- [ ]  o‘rtacha = 20 ball
- [ ]  sust = 10 ball
- [ ]  umuman qatnashmadi = 0 ball

3.3.

 Uy vazifa — 20 ball
• to‘liq = 20 ball
• ayrim qismi yo‘q = 15 ball
• chala = 10 ball
• o‘ta chala = 5 ball
• umuman yo‘q = 0 ball

3.4. Jami ball formulasi

- [ ]  Jami ball = Davomat + Aktivlik + Uy vazifa

 4. Asosiy coin tizimi

- [ ]  CRM jami ballga qarab coinni avtomatik beradi.
- [ ]  Eslatma:• 45 dan past har qanday natija uchun ham -20 coin
- [ ]  • coin avtomatik hisoblansin
- [ ]  • ustoz coinni qo‘lda kiritmaydi

5. Avtomatik bonus coinlar

5.1. Improvement Bonus

- [ ]  Agar o‘quvchi bugungi darsda oldingi darsdagi balidan 20 ball yoki undan ko‘p yuqori olsa:
• +5 bonus coin
- [ ]  Shart:• oldingi darsdagi ball mavjud bo‘lishi kerak • bonus avtomatik ishlasin

5.2. Comeback Bonus

- [ ]  Agar o‘quvchi oldingi darsda sababli qoldirgan bo‘lsa va keyingi darsda yaxshi qatnashsa:
• +5 bonus coin
- [ ]  Yaxshi qatnashgan deb hisoblanadi, agar:
• bugungi ball 80 yoki undan yuqori bo‘lsa

5.3. Top Student Bonus

Har bir darsda guruh ichida eng yuqori ball olgan o‘quvchiga: +5 bonus coin

Shart:

• eng yuqori ball kamida 85 bo‘lishi kerak
• agar 2 yoki undan ortiq o‘quvchi bir xil eng yuqori ball olsa, hammasiga bonus berilsin
 6. Extra coin tizimi

Bu darsdagi ballga bog‘liq bo‘lmagan qo‘shimcha coinlar.

6.1. Referral Coin

Agar o‘quvchi do‘st olib kelsa:
• +50 coin

Shart:
• referral admin tomonidan tasdiqlanadi
• bitta yangi o‘quvchi uchun coin faqat 1 marta beriladi

6.2. Olimpiada / musobaqa natijasi
• 1-o‘rin = +75 coin
• 2-o‘rin = +50 coin
• 3-o‘rin = +25 coin

Shart:
• admin tasdiqlaydi

6.3. Challenge participation

Agar o‘quvchi challenge’da qatnashsa:
• +10 coin

Shart:
• admin yoki teacher belgilaydi
• coin qo‘lda tasdiqlanadi

⸻

1. Telegram bot funksiyalari

O‘quvchi botda quyidagilarni ko‘ra olishi kerak:
[4/15/2026 9:26 AM] Shakhobov Temurbek: 7.1. Bugungi natijam

Quyidagilar chiqsin:
• ball: masalan 85/100
• asosiy coin: +8
• improvement bonus: +5
• comeback bonus: agar bo‘lsa
• top student bonus: agar bo‘lsa
• jami bugungi coin
• bugungi reytingdagi o‘rni

Misol:
• Ball: 85/100
• Asosiy coin: +8
• Improvement bonus: +5
• Top Student bonus: +5
• Jami: +18 coin
• Bugungi o‘rni: 2/14

7.2. Mening oylik reytingim

Quyidagilar chiqsin:
• oyda nechta dars o‘tgan: masalan 5/12
• shu oygacha jami ball
• shu oygacha jami coin
• reytingdagi o‘rni

Misol:
• O‘tilgan darslar: 5/12
• Jami ball: 430
• Jami coin: 46
• Oylik o‘rni: 3/14

Muhim:
• o‘quvchi oy tugamasdan turib ham o‘zining oylik natijasini ko‘ra olishi kerak
• 5 dars o‘tsa 5 ta darslik natija bo‘yicha ko‘rsatilsin
• 7 dars o‘tsa yangilangan natija chiqsin
• reyting dinamik o‘zgarib borsin

7.3. Guruh reytingi

O‘quvchi guruhdagi o‘quvchilar reytingini ko‘ra olsin:
• ism
• ball
• coin
• o‘rin

⸻

1. Teacher panel

Teacher faqat o‘z guruhlari va o‘z o‘quvchilarini ko‘radi.

Har bir guruh uchun jadval bo‘lsin.

8.1. Jadval ustunlari
• №
• O‘quvchi ismi
• har bir sana uchun alohida Ball
• har bir sana uchun alohida Coin
• Overall Ball
• Overall Coin
• Rank

Misol:
• 05.04 Ball | 05.04 Coin
• 07.04 Ball | 07.04 Coin
• 10.04 Ball | 10.04 Coin

Jadval oxirida:
• Overall Ball
• Overall Coin
• Rank

Teacher o‘z guruhidagi oylik reytingni ko‘ra olsin.

⸻

1. Admin panel

Admin barcha ustozlar va barcha guruhlar bo‘yicha natijalarni ko‘ra olsin.
[4/15/2026 9:27 AM] Shakhobov Temurbek: 9.1. Admin ko‘rishi kerak
• barcha guruhlar
• barcha teacherlar
• barcha studentlar
• har bir guruhning oylik reytingi
• har bir teacher guruhining natijasi
• extra coin tasdiqlash
• Red List

9.2. Admin jadvali

Teacher jadvalidagi kabi bo‘lsin, lekin barcha guruhlar uchun filter bilan:
• teacher bo‘yicha
• group bo‘yicha
• level bo‘yicha
• month bo‘yicha

⸻

1. Oylik reyting va Oy o‘quvchisi

10.1. Oylik reyting

Har oy:
• o‘quvchining shu oy ichidagi barcha ballari qo‘shiladi
• barcha coinlari qo‘shiladi
• oylik rank hosil bo‘ladi

10.2. Oy o‘quvchisi

Oy oxirida:
• har bir level yoki guruh ichida o‘quvchilar solishtiriladi
• eng yuqori overall ball olgan o‘quvchi Oy o‘quvchisi bo‘ladi

10.3. Top 3 nominee

Oy oxirida:
• eng yuqori 3 ta o‘quvchi alohida ko‘rinsin
• ular Oy o‘quvchisi nomzodlari bo‘lsin

⸻

1. Red List

Faqat admin va kerak bo‘lsa manager ko‘radi.

11.1. Red List maqsadi

Past ko‘rsatkichli o‘quvchilarni erta aniqlash va ular bilan ishlash.

11.2. Red Listga tushish shartlari

Agar o‘quvchi quyidagilardan biriga tushsa:
• oylik average ball juda past bo‘lsa
• oylik overall coin juda past bo‘lsa
• ko‘p sababsiz qoldirsa
• ketma-ket bir necha dars past ball olsa
[4/15/2026 9:27 AM] Shakhobov Temurbek: 11.3. Red List ko‘rinishi
• O‘quvchi ismi
• Guruh
• Teacher
• Overall Ball
• Overall Coin
• Average Ball
• Attendance
• Risk holati

⸻

1. Ma’lumotlar bazasida kerak bo‘ladigan asosiy fieldlar

Student table
• id
• full_name
• group_id
• level_id
• teacher_id

Lesson score table

Har dars uchun:
• student_id
• group_id
• lesson_date
• attendance_score
• activity_score
• homework_score
• total_score
• base_coin
• improvement_bonus_coin
• comeback_bonus_coin
• top_student_bonus_coin
• total_daily_coin
• comment

Extra coin table
• student_id
• type
• coin_amount
• reason
• approved_by
• approved_at

Monthly summary table
• student_id
• month
• lesson_count
• overall_score
• overall_coin
• average_score
• rank
[4/15/2026 9:28 AM] Shakhobov Temurbek: 13. Logika

13.1. Darsdagi logika

1. Teacher student uchun 3 bo‘lim bo‘yicha ball tanlaydi
2. CRM total score ni hisoblaydi
3. CRM base coin ni hisoblaydi
4. CRM improvement bonusni tekshiradi
5. CRM comeback bonusni tekshiradi
6. CRM top student bonusni tekshiradi
7. total_daily_coin ni chiqaradi
8. student botda natijani ko‘radi

13.2. Oylik logika

1. Oydagi barcha darslar yig‘iladi
2. overall score hisoblanadi
3. overall coin hisoblanadi
4. rank hisoblanadi
5. top 3 nominee aniqlanadi
6. red list aniqlanadi

⸻

1. Ekranlar

Student bot
• Bugungi natijam
• Mening oylik reytingim
• Guruh reytingi
• Coin balansim

Teacher panel
• Guruhlar ro‘yxati
• Har guruh uchun ball va coin jadvali
• Oylik overall natija
• O‘z guruhidagi o‘quvchilar reytingi

Admin panel
• Teacher filter
• Group filter
• Month filter
• Barcha grouplar jadvali
• Top students
• Red List
• Extra coin approval

⸻

1. Muhim talablar
• Teacher coinni qo‘lda kiritmaydi
• Coin har doim CRM tomonidan avtomatik hisoblansin
• Extra coinlar admin tasdiqlashi bilan kiritilsin
• Telegram botdagi natijalar CRM bilan real bog‘langan bo‘lsin
• Oylik reyting oy tugashini kutmasdan ham ko‘rinib tursin
• Har yangi darsdan keyin rank yangilansin

⸻

1. Qisqa xulosa

Bu tizimda:
• teacher faqat ball qo‘yadi
• CRM coinni o‘zi hisoblaydi
• student botda natijasini ko‘radi
• teacher o‘z guruhini kuzatadi
• admin barcha natijalarni va Red Listni kuzatadi