export const WORD_SAMPLE = `
curious | /ˈkjʊəriəs/ | 好奇的 | She was curious about the old map.
notice | /ˈnəʊtɪs/ | 注意到 | Did you notice the small sign?
steady | /ˈstedi/ | 穩定的 | A steady rhythm makes practice easier.
reflect | /rɪˈflekt/ | 反思；映照 | Take a moment to reflect on the sentence.
respond | /rɪˈspɒnd/ | 回應 | Try to respond with a complete sentence.
`;

export const DIALOG_SAMPLE = `
A: Are you ready to practise for five minutes?
B: Yes. I want to build a steady habit.
A: Great. Read each line aloud and notice one new word.
B: Then I will reflect on what I remember.
`;

export function getSample(mode) {
  return mode === 'dialog' ? DIALOG_SAMPLE.trim() : WORD_SAMPLE.trim();
}
