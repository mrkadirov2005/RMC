// English level tests, A2+ and B1: grammar, vocabulary and a reading text, all auto-graded.
// Original questions written for this school.
import type { LevelTest } from './levelTestTypes';
const { mc, tf } = require('./levelTestTypes');

const A2_PLUS: LevelTest = {
  key: 'english-a2-plus',
  level: 'A2+',
  title: 'English level test — A2+',
  durationMinutes: 30,
  passage: {
    title: 'The girl who sells clean water',
    content:
      'Two years ago, sixteen-year-old Laylo noticed that many people in her neighbourhood bought plastic bottles of water every day. Most of the bottles ended up in the street. She decided to do something about it. With help from her uncle, who is an engineer, she built a simple machine that cleans tap water. People bring their own bottles and pay a small amount to fill them.\n\nAt first, only a few neighbours came. Some of them were not sure the water was safe, so Laylo asked a laboratory to test it and put the results on the wall. Since then, the number of customers has grown every month. Now she has two machines, and her younger brother helps her after school. Laylo says the most important thing she has learned is that you don\'t need to be an adult to solve a problem — you just need to start.',
  },
  questions: [
    mc('grammar', 'I ___ in this city since 2019.', ['live', 'lived', 'have lived', 'am living'], 2, 'From a point in the past until now: present perfect with "since".'),
    mc('grammar', 'She ___ her keys yesterday, so she couldn\'t get in.', ['has lost', 'lost', 'loses', 'has been losing'], 1, 'A finished time ("yesterday") needs the past simple.'),
    mc('grammar', 'They ___ for the bus for forty minutes. It still hasn\'t come.', ['wait', 'are waiting', 'have been waiting', 'waited'], 2, 'An action that started in the past and is still going on: present perfect continuous.'),
    mc('grammar', 'If I ___ a lot of money, I would travel around the world.', ['have', 'had', 'will have', 'would have'], 1, 'Second conditional: if + past, would + verb.'),
    mc('grammar', 'This bridge ___ in 1965.', ['built', 'is built', 'was built', 'has built'], 2, 'Passive past simple: was/were + past participle.'),
    mc('grammar', 'English ___ in many countries.', ['speaks', 'is spoken', 'is speaking', 'spoke'], 1, 'Passive present simple.'),
    mc('grammar', 'He said that he ___ tired.', ['is', 'was', 'were', 'be'], 1, 'Reported speech: "is" usually moves back to "was".'),
    mc('grammar', 'Take an umbrella. It ___ rain later.', ['might', 'must', 'can\'t', 'should to'], 0, '"Might" for something possible but not certain.'),
    mc('grammar', 'That\'s the woman ___ son plays for the national team.', ['who', 'which', 'whose', 'that\'s'], 2, '"Whose" shows possession.'),
    mc('grammar', 'You\'re coming to the party, ___?', ["don't you", "aren't you", "isn't it", "won't you"], 1, 'Question tag: positive "you are" → negative tag "aren\'t you".'),
    mc('grammar', 'We decided ___ a taxi because it was late.', ['take', 'taking', 'to take', 'took'], 2, '"Decide" is followed by "to" + verb.'),
    mc('grammar', 'There\'s only ___ milk left. Can you buy some?', ['a few', 'a little', 'many', 'few of'], 1, 'Milk is uncountable: "a little".'),
    mc('vocabulary', 'We should ___ plastic bottles instead of throwing them away.', ['recycle', 'pollute', 'waste', 'destroy'], 0),
    mc('vocabulary', 'My laptop isn\'t working. I need to ___ it to the charger.', ['plug in', 'connect', 'download', 'switch'], 1),
    mc('vocabulary', 'He ___ smoking last year and feels much healthier.', ['gave up', 'gave in', 'took up', 'looked after'], 0, '"Give up" = stop doing a habit.'),
    mc('vocabulary', 'Can you ___ what time the train leaves?', ['find out', 'find', 'look up to', 'come out'], 0, '"Find out" = discover information.'),
    mc('vocabulary', 'The noun from "decide" is ___.', ['decidement', 'decision', 'deciding', 'decisive'], 1),
    mc('vocabulary', 'She got a good ___ in her maths exam.', ['mark', 'note', 'point', 'degree'], 0),
    mc('vocabulary', 'My brother is studying at ___ to become an engineer.', ['primary school', 'university', 'kindergarten', 'nursery'], 1),
    mc('vocabulary', 'The ___ of the city has grown to three million people.', ['population', 'people', 'crowd', 'public'], 0),
    mc('vocabulary', 'It\'s a ___ idea, but will it work in real life?', ['good-looking', 'clever', 'tidy', 'lazy'], 1),
    mc('vocabulary', 'I can\'t ___ the noise from the street. It\'s too loud.', ['stand', 'keep', 'hold', 'bear with'], 0, '"Can\'t stand" = can\'t tolerate.'),
    mc('reading', 'What problem did Laylo notice?', ['There was no tap water', 'Plastic bottles ended up in the street', 'Water was too expensive in shops', 'Her neighbours were ill'], 1),
    mc('reading', 'Who helped her build the machine?', ['Her brother', 'A laboratory', 'Her uncle', 'Her neighbours'], 2),
    mc('reading', 'Why did Laylo ask a laboratory to test the water?', ['The law required it', 'Some people weren\'t sure it was safe', 'The machine was broken', 'To sell the results'], 1),
    mc('reading', 'How many machines does she have now?', ['One', 'Two', 'Three', 'Sixteen'], 1),
    mc('reading', 'What is the main message of Laylo\'s story?', ['Machines are expensive', 'Only adults can solve problems', 'You just need to start', 'Plastic bottles are useful'], 2),
    tf('reading', 'Customers bring their own bottles.', true),
    tf('reading', 'The number of customers has gone down since the test results.', false, 'It has grown every month.'),
    tf('reading', 'Laylo\'s younger brother helps her in the mornings before school.', false, 'He helps after school.'),
  ],
};

const B1: LevelTest = {
  key: 'english-b1',
  level: 'B1',
  title: 'English level test — B1',
  durationMinutes: 35,
  passage: {
    title: 'Why teenagers need more sleep',
    content:
      'Most teenagers know the feeling: the alarm rings at 6:30, and getting out of bed seems impossible. Parents often think their children are simply lazy, but scientists disagree. During the teenage years, the body starts producing melatonin — the hormone that makes us sleepy — about two hours later than in childhood. As a result, many teenagers are not tired until 11 p.m. or even midnight, even if they go to bed earlier.\n\nThe problem is that school usually starts at the same early time. Researchers believe that teenagers need between eight and ten hours of sleep a night, yet many get fewer than seven. A lack of sleep can affect memory, mood and concentration, and it has been linked to more accidents among young drivers.\n\nSome schools in other countries have experimented with starting lessons an hour later. In several cases, attendance improved and students reported feeling happier, although not every study found better exam results. Experts also suggest that teenagers could help themselves by putting their phones away an hour before bed, since the light from screens can delay sleep even more.',
  },
  questions: [
    mc('grammar', 'If I had known about the meeting, I ___ it.', ['would attend', 'would have attended', 'had attended', 'will attend'], 1, 'Third conditional: if + past perfect, would have + past participle.'),
    mc('grammar', 'When we arrived at the cinema, the film ___.', ['already started', 'has already started', 'had already started', 'was already start'], 2, 'Past perfect: the film started before we arrived.'),
    mc('grammar', 'The documents must ___ by Friday.', ['send', 'be sent', 'be sending', 'have send'], 1, 'Passive with a modal: must be + past participle.'),
    mc('grammar', 'She asked me where ___.', ['I lived', 'did I live', 'do I live', 'I do live'], 0, 'Reported questions use normal word order.'),
    mc('grammar', 'I\'ve done it for years, so I\'m ___ up early.', ['used to get', 'used to getting', 'use to getting', 'using to get'], 1, '"Be used to" + -ing = be accustomed to.'),
    mc('grammar', 'I wish I ___ speak Chinese.', ['can', 'could', 'will', 'would can'], 1, '"Wish" about the present + past form.'),
    mc('grammar', 'My father, ___ is a doctor, works at night.', ['that', 'who', 'which', 'whose'], 1, 'Non-defining relative clause about a person: "who" (not "that").'),
    mc('grammar', 'Your eyes are red. ___ crying?', ['Have you been', 'Did you', 'Were you be', 'Do you'], 0, 'Present perfect continuous: a recent activity with a visible result.'),
    mc('grammar', 'This time tomorrow I ___ on a beach.', ['will lie', 'will be lying', 'am lying', 'lie'], 1, 'Future continuous: an action in progress at a future time.'),
    mc('grammar', 'He\'s not answering. He ___ asleep.', ['must be', 'must to be', 'can be', 'has to being'], 0, 'Deduction (we are almost sure): "must be".'),
    mc('grammar', 'I stopped ___ a coffee on the way to work. (I paused in order to buy one.)', ['buying', 'to buy', 'buy', 'bought'], 1, '"Stop to do" = stop in order to do something.'),
    mc('grammar', 'Unless you ___ harder, you won\'t pass.', ['study', "don't study", 'will study', 'studied'], 0, '"Unless" already means "if not".'),
    mc('vocabulary', 'We need to ___ a decision before the end of the week.', ['make', 'do', 'take on', 'have'], 0),
    mc('vocabulary', 'The meeting has been ___ until next Monday.', ['put off', 'put out', 'put up', 'called on'], 0, '"Put off" = postpone.'),
    mc('vocabulary', 'Don\'t stop — ___ with your story!', ['carry on', 'carry out', 'go off', 'take off'], 0, '"Carry on" = continue.'),
    mc('vocabulary', 'The adjective from "rely" is ___.', ['reliance', 'reliable', 'relying', 'relied'], 1),
    mc('vocabulary', 'The noun from "happy" is ___.', ['happiment', 'happiness', 'happily', 'happiful'], 1),
    mc('vocabulary', 'He applied for the ___ of manager.', ['position', 'work', 'career', 'employ'], 0),
    mc('vocabulary', 'It was a piece of ___ — the test was very easy.', ['cake', 'bread', 'pie', 'paper'], 0, '"A piece of cake" = very easy.'),
    mc('vocabulary', 'The company had to ___ twenty workers because of the crisis.', ['lay off', 'lay down', 'set off', 'turn up'], 0),
    mc('vocabulary', 'I\'m sorry, I didn\'t ___ to hurt your feelings.', ['mean', 'think', 'want for', 'aim'], 0),
    mc('vocabulary', 'Prices have ___ sharply this year.', ['raised', 'risen', 'arisen', 'rose up'], 1, '"Rise" (intransitive) — prices rise; we raise something.'),
    mc('reading', 'According to scientists, why do teenagers find it hard to get up early?', ['They are lazy', 'Their body produces the sleep hormone later', 'They drink too much coffee', 'Their alarms are too quiet'], 1),
    mc('reading', 'How much sleep do teenagers need, according to researchers?', ['Less than seven hours', 'Six to eight hours', 'Eight to ten hours', 'Over ten hours'], 2),
    mc('reading', 'Which of these is NOT mentioned as an effect of too little sleep?', ['Poorer memory', 'Changes in mood', 'Weight gain', 'More accidents among young drivers'], 2),
    mc('reading', 'What happened in some schools that started later?', ['Exam results always improved', 'Attendance improved', 'Students slept less', 'Parents complained'], 1),
    mc('reading', 'Why should teenagers put phones away before bed?', ['Phones are expensive', 'Screen light can delay sleep', 'Teachers say so', 'To save battery'], 1),
    tf('reading', 'Melatonin makes people feel sleepy.', true),
    tf('reading', 'Every study found better exam results when school started later.', false, 'Not every study found better results.'),
    tf('reading', 'Many teenagers sleep fewer than seven hours a night.', true),
  ],
};

module.exports = { MIDDLE_LEVEL_TESTS: [A2_PLUS, B1] };
