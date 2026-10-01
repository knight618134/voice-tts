const COURSES = [
  {
    id: 'EN-A1-01', level: 'A1', title: 'Daily routines', topic: 'nature',
    words: [
      ['wake up', '/weɪk ʌp/', '醒來', 'I wake up at seven every morning.'],
      ['usually', '/ˈjuːʒuəli/', '通常', 'I usually eat breakfast at home.'],
      ['early', '/ˈɜːrli/', '早地', 'Mina arrives at school early.'],
      ['prepare', '/prɪˈper/', '準備', 'I prepare my bag before I leave.'],
      ['routine', '/ruːˈtiːn/', '例行習慣', 'A simple routine helps me start the day.'],
    ],
    dialog: ['A: What time do you usually wake up?', 'B: I wake up at seven.', 'A: Do you prepare breakfast?', 'B: Yes, and then I leave for school.'],
    grammar: ['Present simple for routines', 'Adverbs of frequency', 'What time…?'],
  },
  {
    id: 'EN-A1-02', level: 'A1', title: 'Food and cafés', topic: 'culture',
    words: [
      ['order', '/ˈɔːrdər/', '點餐', 'We order two sandwiches.'],
      ['menu', '/ˈmenjuː/', '菜單', 'The menu is on the table.'],
      ['hungry', '/ˈhʌŋɡri/', '餓的', 'I am hungry after class.'],
      ['delicious', '/dɪˈlɪʃəs/', '美味的', 'The soup is delicious.'],
      ['bill', '/bɪl/', '帳單', 'Could we have the bill, please?'],
    ],
    dialog: ['A: Are you ready to order?', 'B: Yes. I would like the soup.', 'A: Anything to drink?', 'B: Water, please.'],
    grammar: ['Countable and uncountable nouns', 'I would like…', 'Some and any'],
  },
  {
    id: 'EN-A2-01', level: 'A2', title: 'Travel and directions', topic: 'geography',
    words: [
      ['platform', '/ˈplætfɔːrm/', '月台', 'The train leaves from platform six.'],
      ['direction', '/dəˈrekʃən/', '方向', 'Could you give me directions?'],
      ['nearby', '/ˌnɪrˈbaɪ/', '附近的', 'There is a nearby bus stop.'],
      ['turn', '/tɜːrn/', '轉彎', 'Turn left at the bank.'],
      ['arrive', '/əˈraɪv/', '抵達', 'We arrive at the station at noon.'],
    ],
    dialog: ['A: Excuse me, how do I get to the station?', 'B: Go straight and turn right at the bank.', 'A: Is it far?', 'B: No, it is about five minutes away.'],
    grammar: ['Imperatives for directions', 'Prepositions of place', 'How do I get to…?'],
  },
  {
    id: 'EN-A2-02', level: 'A2', title: 'Plans and experiences', topic: 'culture',
    words: [
      ['plan', '/plæn/', '計畫', 'We plan to visit the museum.'],
      ['experience', '/ɪkˈspɪriəns/', '經驗', 'It was an interesting experience.'],
      ['already', '/ɔːlˈredi/', '已經', 'I have already bought the tickets.'],
      ['decide', '/dɪˈsaɪd/', '決定', 'They decide to travel by train.'],
      ['invite', '/ɪnˈvaɪt/', '邀請', 'I want to invite my classmates.'],
    ],
    dialog: ['A: Have you visited the new museum?', 'B: Not yet, but I have already bought a ticket.', 'A: When are you going?', 'B: I plan to go on Saturday.'],
    grammar: ['Be going to for plans', 'Present perfect with already/yet', 'Verb + to-infinitive'],
  },
  {
    id: 'EN-B1-01', level: 'B1', title: 'Work and communication', topic: 'culture',
    words: [
      ['clarify', '/ˈklærəfaɪ/', '釐清', 'Could you clarify the final requirement?'],
      ['deadline', '/ˈdedlaɪn/', '截止期限', 'The deadline is next Friday.'],
      ['feedback', '/ˈfiːdbæk/', '回饋', 'Her feedback helped us improve the report.'],
      ['priority', '/praɪˈɔːrəti/', '優先事項', 'Safety is our first priority.'],
      ['coordinate', '/koʊˈɔːrdəneɪt/', '協調', 'We need to coordinate with both teams.'],
    ],
    dialog: ['A: Could we clarify the deadline for this project?', 'B: The first draft is due on Friday.', 'A: Which task has the highest priority?', 'B: Please finish the customer report first.'],
    grammar: ['Polite requests with could/would', 'Relative clauses', 'Reported speech'],
  },
  {
    id: 'EN-B1-02', level: 'B1', title: 'Ideas and decisions', topic: 'geography',
    words: [
      ['consider', '/kənˈsɪdər/', '考慮', 'We should consider another solution.'],
      ['benefit', '/ˈbenəfɪt/', '益處', 'The change could benefit local residents.'],
      ['however', '/haʊˈevər/', '然而', 'The plan is useful; however, it is expensive.'],
      ['evidence', '/ˈevɪdəns/', '證據', 'The report provides clear evidence.'],
      ['consequence', '/ˈkɑːnsəkwens/', '後果', 'Every decision has a consequence.'],
    ],
    dialog: ['A: Have you considered the new proposal?', 'B: Yes. It has several benefits.', 'A: However, it may cost more.', 'B: Then we should compare the long-term consequences.'],
    grammar: ['First conditional', 'Contrast linkers', 'Modals for possibility'],
  },
];

export function getEnglishCourses() {
  return COURSES.map((course) => ({ ...course, words: course.words.map((word) => [...word]), dialog: [...course.dialog], grammar: [...course.grammar] }));
}

export function getEnglishCourse(id) {
  return getEnglishCourses().find((course) => course.id === id) || getEnglishCourses()[0];
}

export function getEnglishModeSample(id, mode) {
  const course = getEnglishCourse(id);
  if (mode === 'dialog') return course.dialog.join('\n');
  return course.words.map((word) => word.join(' | ')).join('\n');
}
