// English level tests, B2 and C1: grammar, vocabulary and a reading text, all auto-graded.
// Original questions written for this school.
import type { LevelTest } from './levelTestTypes';
const { mc, tf } = require('./levelTestTypes');

const B2: LevelTest = {
  key: 'english-b2',
  level: 'B2',
  title: 'English level test — B2',
  durationMinutes: 40,
  passage: {
    title: 'Farms on the roof',
    content:
      'In many fast-growing cities, land is too expensive to be used for agriculture. Yet a growing number of urban farmers are finding space in an unexpected place: on rooftops. What began as a hobby for a handful of enthusiasts has turned into a small industry, with some rooftop farms now supplying restaurants and supermarkets every week.\n\nSupporters argue that rooftop farming brings several benefits at once. Food travels only a few hundred metres instead of hundreds of kilometres, which reduces transport costs and emissions. Plants also help to cool buildings in summer, and they absorb some of the rainwater that would otherwise overload city drains.\n\nCritics, however, point out that the costs are considerable. Not every roof is strong enough to carry soil, water and equipment, and strengthening an old building can be extremely expensive. Moreover, the amount of food produced is tiny compared with what a city consumes, so rooftop farms are unlikely ever to replace traditional agriculture.\n\nMost experts agree that the real value of these farms may lie elsewhere. By letting city dwellers see where their vegetables come from, they encourage people to think more carefully about what they eat and how much they waste. In that sense, their greatest harvest may be a change in attitude rather than a change in supply.',
  },
  questions: [
    mc('grammar', 'If she hadn\'t missed the train, she ___ here now.', ['would be', 'would have been', 'will be', 'had been'], 0, 'Mixed conditional: a past condition with a present result.'),
    mc('grammar', 'Not only ___ late, but he also forgot the tickets.', ['he arrived', 'did he arrive', 'he did arrive', 'arrived he'], 1, 'After "Not only" at the start, use question word order (inversion).'),
    mc('grammar', 'The new bridge ___ to be the longest in Asia.', ['says', 'is said', 'is saying', 'has said'], 1, 'Passive reporting structure: "is said to be".'),
    mc('grammar', 'I wish I ___ so much money last month.', ["didn't spend", "hadn't spent", "wouldn't spend", "don't spend"], 1, 'Regret about the past: wish + past perfect.'),
    mc('grammar', 'We\'re having our kitchen ___ next week.', ['paint', 'painting', 'painted', 'to paint'], 2, 'Causative: have + object + past participle.'),
    mc('grammar', 'By the time you get home, I ___ dinner.', ['will cook', 'will have cooked', 'am cooking', 'have cooked'], 1, 'Future perfect: finished before a point in the future.'),
    mc('grammar', '___ the instructions, he started assembling the desk.', ['Having read', 'Being read', 'Read', 'To have read'], 0, 'Perfect participle clause: one action completed before the next.'),
    mc('grammar', 'You ___ told me you were ill — I would have helped.', ['should have', 'must have', 'could', 'would'], 0, '"Should have" + past participle: criticism of a past action.'),
    mc('grammar', 'He passed all his exams, ___ surprised everyone.', ['what', 'that', 'which', 'who'], 2, '"Which" can refer to a whole clause.'),
    mc('grammar', 'I\'ll lend you the car ___ you drive carefully.', ['unless', 'provided that', 'even if', 'in case of'], 1, '"Provided that" = only if.'),
    mc('grammar', 'She denied ___ the money.', ['to take', 'taking', 'take', 'that taking'], 1, '"Deny" is followed by -ing.'),
    mc('grammar', 'Hardly anyone came to the meeting, ___?', ['did they', "didn't they", 'came they', "hadn't they"], 0, '"Hardly anyone" is negative in meaning, so the tag is positive.'),
    mc('vocabulary', 'The engineers ___ a brilliant solution to the problem.', ['came up with', 'came across', 'put up with', 'got round to'], 0, '"Come up with" = think of an idea.'),
    mc('vocabulary', 'I can\'t ___ his rudeness any longer.', ['put up with', 'put off', 'make up for', 'look down on'], 0, '"Put up with" = tolerate.'),
    mc('vocabulary', 'The new law will ___ thousands of small businesses.', ['effect', 'affect', 'infect', 'afflict on'], 1, '"Affect" is the verb; "effect" is usually the noun.'),
    mc('vocabulary', 'The noun from "persuade" is ___.', ['persuasion', 'persuadement', 'persuasiveness of', 'persuading'], 0),
    mc('vocabulary', 'At the start of the course, the teacher played a game to ___.', ['break the ice', 'break a leg', 'cut corners', 'hit the sack'], 0, '"Break the ice" = help people relax with strangers.'),
    mc('vocabulary', 'There has been a ___ increase in prices this year.', ['significant', 'significance', 'signify', 'signal'], 0),
    mc('vocabulary', 'The company plans to ___ its operations to Kazakhstan.', ['expand', 'extend out', 'enlarge into', 'grow up'], 0),
    mc('vocabulary', 'She was ___ by the news and couldn\'t speak.', ['astonished', 'astonishing', 'astonishment', 'astonish'], 0),
    mc('vocabulary', 'We need to ___ the risks before we invest.', ['weigh up', 'weigh down', 'look over to', 'think on'], 0, '"Weigh up" = consider carefully.'),
    mc('vocabulary', 'The project was a ___ success; nobody expected it.', ['surprisingly', 'surprising', 'surprised', 'surprise of'], 1),
    mc('reading', 'Why is agriculture rare in many fast-growing cities?', ['People do not like vegetables', 'Land is too expensive', 'The climate is too hot', 'It is illegal'], 1),
    mc('reading', 'Which benefit of rooftop farming is mentioned?', ['It creates many jobs', 'It cools buildings in summer', 'It makes food cheaper than in shops', 'It replaces supermarkets'], 1),
    mc('reading', 'What is one problem raised by critics?', ['Rooftop vegetables taste worse', 'Some roofs cannot carry the weight', 'Restaurants refuse the food', 'Plants attract insects'], 1),
    mc('reading', 'According to the text, what may be the real value of rooftop farms?', ['Supplying the whole city', 'Changing people\'s attitudes to food', 'Reducing rent', 'Making buildings taller'], 1),
    mc('reading', 'The word "dwellers" in the last paragraph is closest in meaning to ___.', ['visitors', 'residents', 'farmers', 'workers'], 1),
    tf('reading', 'Rooftop farming started as a hobby for a few people.', true),
    tf('reading', 'Critics believe rooftop farms will eventually replace traditional agriculture.', false, 'They say it is unlikely ever to happen.'),
    tf('reading', 'Plants on roofs can absorb some rainwater.', true),
  ],
};

const C1: LevelTest = {
  key: 'english-c1',
  level: 'C1',
  title: 'English level test — C1',
  durationMinutes: 40,
  passage: {
    title: 'The quiet disappearance of languages',
    content:
      'Of the roughly seven thousand languages spoken today, linguists estimate that as many as half may fall silent by the end of this century. The process is rarely dramatic. Languages seldom vanish because their speakers are forbidden to use them; far more often, parents simply stop passing them on, convinced that their children\'s prospects lie in a more widely spoken tongue. Within two or three generations, a language that once carried an entire culture can be reduced to a handful of elderly speakers.\n\nWhat is lost is not merely a set of words. Each language encodes a particular way of carving up experience — distinctions of time, kinship or landscape that may have no neat equivalent elsewhere. Some languages of Australia, for instance, describe position using compass directions rather than "left" and "right", and their speakers display a remarkable sense of orientation as a result. When such a language disappears, researchers lose a window onto the range of what the human mind can do.\n\nYet revival is not a lost cause. Hebrew, which for centuries was used mainly in writing and prayer, became the everyday language of millions. Welsh, once in steep decline, is now taught in every school in Wales. Such successes, however, tend to depend on a rare combination of community commitment, political support and sheer persistence — conditions that many small language communities can only dream of.',
  },
  questions: [
    mc('grammar', 'Hardly ___ the station when the train left.', ['we had reached', 'had we reached', 'we reached', 'did we reached'], 1, 'Inversion after "Hardly": had + subject + past participle.'),
    mc('grammar', 'Little ___ that she was about to become famous.', ['she knew', 'did she know', 'knew she', 'she did know'], 1, 'Negative adverbial at the start: inversion with "did".'),
    mc('grammar', 'It\'s essential that every student ___ the form by Friday.', ['submits', 'submit', 'will submit', 'submitted'], 1, 'Subjunctive after "essential that": the base form.'),
    mc('grammar', 'We ___ taken a taxi — the hotel was only two minutes away.', ["needn't have", "didn't need", "mustn't have", "shouldn't"], 0, '"Needn\'t have" + past participle: we did it, but it was unnecessary.'),
    mc('grammar', '___ I known about the strike, I would have left earlier.', ['If', 'Had', 'Were', 'Should'], 1, 'Conditional without "if": Had + subject + past participle.'),
    mc('grammar', 'What I need most ___ a long holiday.', ['are', 'is', 'be', 'being'], 1, 'Cleft sentence: "What I need ... is ...".'),
    mc('grammar', 'I ___ appreciate your help — I just can\'t accept the money.', ['do', 'am', 'did to', 'have'], 0, 'Emphatic "do" stresses the verb.'),
    mc('grammar', 'She said she would call, and she ___.', ['did', 'had', 'was', 'called it'], 0, 'Substitution: "did" replaces "called".'),
    mc('grammar', 'He left the company in 2010; little did anyone know he ___ return as its director.', ['will', 'was to', 'is going to', 'has to'], 1, '"Was to" = future in the past (something that happened later).'),
    mc('grammar', 'The ___ of the new policy took longer than expected.', ['implement', 'implementing of', 'implementation', 'implemented'], 2, 'Nominalisation: the verb becomes a noun.'),
    mc('grammar', 'The company is on the ___ of bankruptcy.', ['edge', 'verge', 'border', 'side'], 1, 'Fixed phrase: "on the verge of".'),
    mc('grammar', 'Such ___ the noise that nobody could sleep.', ['is', 'was', 'had', 'were'], 1, 'Inversion with "Such": Such was the noise that...'),
    mc('vocabulary', 'She checked every figure twice; she is extremely ___.', ['meticulous', 'reckless', 'indifferent', 'outspoken'], 0),
    mc('vocabulary', 'Smartphones have become ___ — almost everyone has one.', ['ubiquitous', 'obsolete', 'scarce', 'tentative'], 0),
    mc('vocabulary', 'Please ___ in mind that the office closes early on Friday.', ['bear', 'keep on', 'hold', 'take'], 0, 'Collocation: "bear in mind".'),
    mc('vocabulary', 'It is too early to ___ any firm conclusions.', ['draw', 'make up', 'pull', 'take out'], 0, 'Collocation: "draw a conclusion".'),
    mc('vocabulary', 'The minister\'s speech was deliberately ___, so nobody knew his real position.', ['ambiguous', 'explicit', 'concise', 'transparent'], 0),
    mc('vocabulary', 'After months of arguing, the two sides finally reached a ___.', ['compromise', 'concession out', 'consensus with', 'commitment of'], 0),
    mc('vocabulary', 'He tends to ___ around the bush instead of answering directly.', ['beat', 'hit', 'walk', 'cut'], 0, '"Beat around the bush" = avoid the main point.'),
    mc('vocabulary', 'Which word is the most formal way to say "start"?', ['kick off', 'get going', 'commence', 'set about it'], 2),
    mc('vocabulary', 'The evidence ___ the theory that the city was founded earlier.', ['underpins', 'undermines of', 'overlooks', 'outweighs to'], 0, '"Underpin" = support, give a basis to.'),
    mc('vocabulary', 'Her ___ to the cause was unquestionable; she worked for free for ten years.', ['dedication', 'dedicate', 'dedicated', 'dedicating'], 0),
    mc('reading', 'According to the text, why do most languages disappear?', ['Governments ban them', 'Parents stop passing them on', 'They are too difficult to learn', 'Their speakers emigrate'], 1),
    mc('reading', 'What does the example of some Australian languages illustrate?', ['Languages can shape how speakers think about space', 'Compass directions are easier than left and right', 'Australian languages are disappearing fastest', 'Elderly speakers have a better memory'], 0),
    mc('reading', 'In the second paragraph, "carving up experience" most nearly means ___.', ['describing violence', 'dividing reality into categories', 'remembering the past', 'sharing culture'], 1),
    mc('reading', 'What does the writer suggest about language revival?', ['It never succeeds', 'It is easy with modern technology', 'It is possible but needs rare conditions', 'It only works for written languages'], 2),
    mc('reading', 'What is the writer\'s overall tone?', ['Indifferent', 'Concerned but not hopeless', 'Angry and accusing', 'Purely optimistic'], 1),
    tf('reading', 'Linguists estimate that up to half of today\'s languages may disappear this century.', true),
    tf('reading', 'Hebrew was a common spoken language throughout the centuries before its revival.', false, 'It was used mainly in writing and prayer.'),
    tf('reading', 'Welsh is now taught in every school in Wales.', true),
  ],
};

module.exports = { UPPER_LEVEL_TESTS: [B2, C1] };
