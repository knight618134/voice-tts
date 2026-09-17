export const ARTICLE_LEVELS = [
  { id: 'a1', label: 'A1 · Beginner' },
  { id: 'a2', label: 'A2 · Elementary' },
  { id: 'b1', label: 'B1 · Intermediate' },
  { id: 'b2', label: 'B2 · Upper-intermediate' },
];

export const ARTICLE_TOPICS = [
  { id: 'nature', label: 'Nature' },
  { id: 'culture', label: 'Culture' },
  { id: 'geography', label: 'Geography' },
];

const ARTICLES = {
  a1: {
    nature: {
      title: 'A Morning in the Garden',
      body: 'Mia has a small garden behind her home. Every morning, she opens the door and looks at the plants.\n\nThere are red flowers, green leaves, and a little tree. A yellow bird often sits in the tree.\n\nMia gives the plants water. She likes the quiet garden before the busy day starts.',
      quiz: [{ question: 'What does Mia give the plants?', options: ['Food', 'Water', 'Books', 'Music'], answer: 1, explanation: 'The article says Mia gives the plants water.' }],
    },
    culture: {
      title: 'A Special Market',
      body: 'Every Sunday, a small market opens in the town square. People sell bread, fruit, clothes, and flowers.\n\nTom goes to the market with his grandmother. They buy warm bread and talk to a baker.\n\nThe market is busy, but people are friendly. Tom enjoys this family tradition.',
      quiz: [{ question: 'When does the market open?', options: ['Every Monday', 'Every Friday', 'Every Sunday', 'Every night'], answer: 2, explanation: 'The market opens every Sunday.' }],
    },
    geography: {
      title: 'A River Near the Town',
      body: 'A wide river runs near Lina’s town. The water moves slowly between two green hills.\n\nPeople walk beside the river in the afternoon. Some children watch small fish in the water.\n\nThe river gives the town beautiful views and fresh air.',
      quiz: [{ question: 'What is beside the river?', options: ['Two green hills', 'A tall school', 'A train station', 'A large airport'], answer: 0, explanation: 'The river moves between two green hills.' }],
    },
  },
  a2: {
    nature: {
      title: 'Why Bees Matter',
      body: 'Bees are small insects, but they are important for many plants. When a bee visits a flower, pollen sticks to its body. The bee carries the pollen to another flower.\n\nThis process helps plants make fruit and seeds. Apples, strawberries, and many other foods depend on pollination.\n\nPeople can help bees by planting flowers and avoiding harmful chemicals in their gardens.',
      quiz: [{ question: 'How do bees help plants?', options: ['They carry pollen between flowers.', 'They make the soil colder.', 'They remove all insects.', 'They carry water to trees.'], answer: 0, explanation: 'Bees carry pollen from one flower to another.' }],
    },
    culture: {
      title: 'The Story Behind a Festival',
      body: 'In one coastal town, people celebrate a lantern festival at the end of summer. Families make colorful paper lanterns during the week. On festival night, they walk together through the old streets.\n\nThe lanterns represent hope and guidance. Older people tell children stories about the town’s history.\n\nAlthough the festival has changed over time, it still brings neighbors together.',
      quiz: [{ question: 'What do the lanterns represent?', options: ['Wealth and power', 'Hope and guidance', 'Winter and snow', 'Work and travel'], answer: 1, explanation: 'The lanterns represent hope and guidance.' }],
    },
    geography: {
      title: 'Living on an Island',
      body: 'Island communities often depend on the sea. People may fish, travel by boat, or welcome visitors who want to see the coast. However, island life can be difficult when strong storms arrive.\n\nSome islands have limited space and fresh water. Residents therefore plan carefully and try not to waste resources.\n\nToday, many island communities are also developing solar power and better systems for collecting rainwater.',
      quiz: [{ question: 'Why do island residents plan carefully?', options: ['They have unlimited space.', 'They want more storms.', 'Resources such as fresh water may be limited.', 'They never travel by boat.'], answer: 2, explanation: 'The article says islands may have limited space and fresh water.' }],
    },
  },
  b1: {
    nature: {
      title: 'How Forests Protect Cities',
      body: 'Forests are not only beautiful places for hiking. They also protect nearby cities in several ways. Tree roots hold soil in place, which can reduce flooding after heavy rain. Leaves provide shade and help lower the temperature of streets and buildings.\n\nForests also store carbon and create homes for birds, insects, and small mammals. When a city protects the land around it, residents may enjoy cleaner air and more natural spaces.\n\nThe challenge is to balance new construction with long-term environmental care.',
      quiz: [{ question: 'How can tree roots help a city?', options: ['By increasing traffic', 'By holding soil in place', 'By removing all rain', 'By making buildings taller'], answer: 1, explanation: 'Tree roots hold soil in place and can reduce flooding.' }],
    },
    culture: {
      title: 'When Food Carries History',
      body: 'A traditional dish often tells a story about the people who created it. Its ingredients may reflect the local climate, available crops, or contact with neighboring cultures. A recipe can also show how families responded to difficult times by using inexpensive ingredients in creative ways.\n\nToday, chefs sometimes change traditional dishes for modern tastes. This can help a food reach new audiences, but it may also raise questions about authenticity. Many communities choose to protect the original recipe while welcoming respectful changes.',
      quiz: [{ question: 'What can a traditional dish show?', options: ['Only a chef’s personal style', 'The local climate and history', 'The height of nearby buildings', 'The weather tomorrow'], answer: 1, explanation: 'Ingredients and recipes can reflect climate, crops, and cultural contact.' }],
    },
    geography: {
      title: 'A City Shaped by Its Coastline',
      body: 'A coastline influences how a city grows. Harbors may support trade, while beaches can attract tourism. In some places, narrow land between the sea and mountains leaves little room for roads and homes, so neighborhoods become dense.\n\nCoastal cities also face risks. Rising sea levels, stronger storms, and erosion can damage buildings and transportation systems. City planners increasingly combine sea walls with wetlands and other natural protections.\n\nGeography does not decide a city’s future by itself, but it strongly affects the choices available to its residents.',
      quiz: [{ question: 'Why might a coastal city have dense neighborhoods?', options: ['It has too many deserts.', 'Mountains and the sea can limit available land.', 'It never needs roads.', 'Tourists cannot visit it.'], answer: 1, explanation: 'The article explains that mountains and the sea may leave little room.' }],
    },
  },
  b2: {
    nature: {
      title: 'Restoring a Wetland',
      body: 'Wetlands are often described as the planet’s natural filters. Their plants and soil can remove pollutants from water, while their shallow basins absorb excess rain. They also provide breeding grounds for fish and shelter for migratory birds.\n\nDespite these benefits, wetlands have been drained for farming, roads, and housing. Restoration projects now aim to bring back native plants and reconnect waterways. Success depends on more than planting trees: communities must also manage pollution, water flow, and invasive species.\n\nA restored wetland may look wild, yet it relies on careful planning and years of observation.',
      quiz: [{ question: 'Why are wetlands important?', options: ['They increase pollution.', 'They filter water and absorb excess rain.', 'They prevent all migration.', 'They require no planning.'], answer: 1, explanation: 'Wetlands can filter water and absorb excess rain.' }],
    },
    culture: {
      title: 'Museums in the Digital Age',
      body: 'Digital technology has changed how museums share collections. High-resolution images allow visitors to examine objects that are too fragile or distant to see in person. Online exhibitions can also connect a local collection with students around the world.\n\nHowever, a digital image cannot reproduce every part of an in-person visit. Scale, texture, atmosphere, and the experience of standing among other visitors all shape interpretation. Museums therefore increasingly combine online access with carefully designed physical displays.\n\nThe goal is not to replace the museum, but to make its questions and stories available in more ways.',
      quiz: [{ question: 'What is one limitation of a digital museum image?', options: ['It cannot show any color.', 'It cannot fully reproduce scale and texture.', 'It is always too expensive.', 'It prevents global access.'], answer: 1, explanation: 'The article notes that scale, texture, and atmosphere are difficult to reproduce digitally.' }],
    },
    geography: {
      title: 'Why Maps Change Our View',
      body: 'A map appears to describe the world objectively, yet every map reflects choices. A designer must decide which features to emphasize, how to represent distance, and where to place the center. A projection may preserve shapes while distorting area, or show area accurately while changing the appearance of coastlines.\n\nThese choices do not make maps useless. On the contrary, they make maps powerful tools for answering particular questions. A map for sailors, for example, may need different strengths from a map used to compare population density.\n\nReading a map critically means asking not only “What does it show?” but also “What purpose shaped its design?”',
      quiz: [{ question: 'Why do maps reflect choices?', options: ['Maps have no designers.', 'Designers must select features and represent distance.', 'Maps can only show oceans.', 'All projections preserve everything equally.'], answer: 1, explanation: 'The designer chooses features, emphasis, and how distance is represented.' }],
    },
  },
};

export function getArticleSample(level = 'a1', topic = 'nature') {
  const selected = ARTICLES[level]?.[topic] || ARTICLES.a1.nature;
  return {
    level: ARTICLES[level] ? level : 'a1',
    topic: ARTICLES[level]?.[topic] ? topic : 'nature',
    title: selected.title,
    body: selected.body,
    quiz: selected.quiz.map((question) => ({ ...question, options: [...question.options] })),
  };
}

export function getArticleLevelLabel(level) {
  return ARTICLE_LEVELS.find((item) => item.id === level)?.label || level.toUpperCase();
}

export function getArticleTopicLabel(topic) {
  return ARTICLE_TOPICS.find((item) => item.id === topic)?.label || topic;
}
