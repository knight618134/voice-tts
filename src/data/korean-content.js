import bundledVocabulary from './korean-vocabulary.json';
import fullContentPack from './korean-content-full.json';

export const KOREAN_SCHEMA_VERSION = 1;
export const KOREAN_CONTENT_STORAGE_KEY = 'vocabulary-reader:korean-content:v1';

const clone = (value) => JSON.parse(JSON.stringify(value));

function sourceLabel(sources = []) {
  return sources.map((source) => source.section ? `Section ${source.section}` : source.kind || '').filter(Boolean).join(' · ') || 'Korean content pack';
}

function posLabel(pos = '') {
  return ({ adjective: '形容詞', adverb: '副詞', determiner: '限定詞', expression: '表現', interjection: '感嘆詞', noun: '名詞', numeral: '數詞', pronoun: '代詞', verb: '動詞', verb_intransitive: '不及物動詞', verb_transitive: '及物動詞' })[pos] || pos;
}

const CURRICULUM_UNITS = [
  { id: 'KO-A1-01', level: 'A1', titleKo: '나와 사람들', titleZh: '我與身邊的人', topics: ['people_family'], words: ['저', '친구', '직원'] },
  { id: 'KO-A1-02', level: 'A1', titleKo: '하루와 시간', titleZh: '一天與時間', topics: ['time_season'] },
  { id: 'KO-A1-03', level: 'A1', titleKo: '장소와 방향', titleZh: '地點與方向', topics: ['places_directions'], words: ['시내', '여기'] },
  { id: 'KO-A1-04', level: 'A1', titleKo: '교통과 이동', titleZh: '交通與移動', topics: ['transport'], words: ['기차', '버스', '차표', '표', '가다', '오다', '타다', '나가다', '나오다', '지나가다', '내려가다', '내려오다'] },
  { id: 'KO-A1-05', level: 'A1', titleKo: '카페와 음식', titleZh: '咖啡廳與飲食', topics: ['food_drink'], words: ['카페', '메뉴', '커피', '사이다', '말차'] },
  { id: 'KO-A1-06', level: 'A1', titleKo: '쇼핑과 물건', titleZh: '購物與物品', topics: ['shopping', 'objects'], words: ['모자', '바지', '사다', '싸다', '이거', '하나', '주세요'] },
  { id: 'KO-A1-07', level: 'A1', titleKo: '학교와 한국어', titleZh: '學校與韓文', topics: ['study_language'], words: ['교과서', '노트'] },
  { id: 'KO-A1-08', level: 'A1', titleKo: '기본 표현', titleZh: '基礎表達與功能詞', topics: ['function_or_context'], words: ['하고', '도', '같이'] },
  { id: 'KO-A2-01', level: 'A2', titleKo: '일상 행동', titleZh: '日常行動', topics: ['action'], words: ['쉬다', '보다', '두다', '차다', '켜다', '깨다', '때리다', '바꾸다', '쓰다', '꿰다', '먹다', '싣다', '굶다', '끊다', '끓다', '쌓다', '앉다', '앓다', '얹다', '핥다', '훑다'] },
  { id: 'KO-A2-02', level: 'A2', titleKo: '생각과 소통', titleZh: '想法與溝通', topics: ['action'], words: ['소개하다', '좋아하다', '이기다', '모르다', '되다', '배우다', '사귀다', '시키다', '외치다', '요구하다', '그리워하다', '비교하다', '듣다', '믿다'] },
  { id: 'KO-A2-03', level: 'A2', titleKo: '감정과 상태', titleZh: '感受與狀態', topics: ['description'], words: ['있다', '없다'] },
  { id: 'KO-A2-04', level: 'A2', titleKo: '자연과 여가', titleZh: '自然與休閒', topics: ['animals_nature'], words: ['파티', '노래', '야구', '공'] },
  { id: 'KO-A2-05', level: 'A2', titleKo: '받침 발음 도전', titleZh: '收音發音挑戰', topics: [], words: ['곬', '끝', '낫', '넋', '몫', '삯'] },
  { id: 'KO-A2-06', level: 'A2', titleKo: '생활 어휘 확장', titleZh: '生活詞彙延伸', topics: ['general'], words: [] },
];

const PRESENT_FORMS = {
  '가다': '가요', '나가다': '나가요', '이기다': '이겨요', '나오다': '나와요', '두다': '둬요', '모르다': '몰라요',
  '보다': '봐요', '아니다': '아니에요', '오다': '와요', '되다': '돼요', '배우다': '배워요', '사귀다': '사귀어요',
  '사다': '사요', '소개하다': '소개해요', '쉬다': '쉬어요', '지나가다': '지나가요', '내려가다': '내려가요',
  '내려오다': '내려와요', '시키다': '시켜요', '아프다': '아파요', '외치다': '외쳐요', '요구하다': '요구해요',
  '차다': '차요', '켜다': '켜요', '크다': '커요', '타다': '타요', '계시다': '계세요', '기쁘다': '기뻐요',
  '깨다': '깨요', '나쁘다': '나빠요', '때리다': '때려요', '바꾸다': '바꿔요', '바쁘다': '바빠요', '싸다': '싸요',
  '쓰다': '써요', '그리워하다': '그리워해요', '꿰다': '꿰어요', '비교하다': '비교해요', '가깝다': '가까워요',
  '가볍다': '가벼워요', '곱다': '고와요', '듣다': '들어요', '먹다': '먹어요', '믿다': '믿어요', '싣다': '실어요',
  '작다': '작아요', '괜찮다': '괜찮아요', '굶다': '굶어요', '귀찮다': '귀찮아요', '끊다': '끊어요',
  '끓다': '끓어요', '넓다': '넓어요', '싫다': '싫어요', '쌓다': '쌓아요', '앉다': '앉아요', '앓다': '앓아요',
  '얹다': '얹어요', '없다': '없어요', '옳다': '옳아요', '점잖다': '점잖아요', '좋다': '좋아요', '핥다': '핥아요',
  '훑다': '훑어요', '있다': '있어요', '좋아하다': '좋아해요',
};

const SPECIAL_EXAMPLES = {
  '거기': ['거기에서 친구를 만나요.', '在那裡和朋友見面。'],
  '그': ['그 사람은 제 친구예요.', '那個人是我的朋友。'],
  '나': ['나는 한국어를 배워요.', '我學習韓文。'],
  '너': ['너는 어디에 가요?', '你要去哪裡？'],
  '더': ['물을 더 주세요.', '請再給我一些水。'],
  '아니': ['아니, 저는 괜찮아요.', '不，我沒關係。'],
  '이': ['이 책은 재미있어요.', '這本書很有趣。'],
  '구': ['구는 숫자예요.', '九是一個數字。'],
  '누구': ['저 사람은 누구예요?', '那個人是誰？'],
  '모두': ['모두 함께 가요.', '大家一起去。'],
  '어디': ['지금 어디에 가요?', '現在要去哪裡？'],
  '우리': ['우리는 한국어를 배워요.', '我們學習韓文。'],
  '매우': ['오늘은 매우 바빠요.', '今天非常忙。'],
  '새': ['새 가방을 샀어요.', '買了新包包。'],
  '여러': ['여러 사람이 같이 일해요.', '許多人一起工作。'],
  '여보시오': ['여보시오, 여기 좀 보세요.', '喂，請看一下這裡。'],
  '어째서': ['어째서 늦었어요?', '為什麼遲到了？'],
  '왜': ['왜 한국어를 배워요?', '為什麼學韓文？'],
  '먼저': ['제가 먼저 갈게요.', '我先走。'],
  '나가다': ['저는 아침에 집에서 나가요.', '我早上出門。'],
  '이기다': ['우리 팀이 경기에서 이겨요.', '我們隊在比賽中獲勝。'],
  '나오다': ['친구가 카페에서 나와요.', '朋友從咖啡廳出來。'],
  '두다': ['책을 책상 위에 둬요.', '把書放在桌上。'],
  '모르다': ['저는 그 사람을 몰라요.', '我不認識那個人。'],
  '되다': ['저는 선생님이 되고 싶어요.', '我想成為老師。'],
  '배우다': ['우리는 한국어를 배워요.', '我們學習韓文。'],
  '사귀다': ['저는 학교에서 새 친구를 사귀어요.', '我在學校結交新朋友。'],
  '지나가다': ['버스가 공원 앞을 지나가요.', '公車經過公園前面。'],
  '내려가다': ['계단으로 천천히 내려가요.', '慢慢走下樓梯。'],
  '내려오다': ['친구가 산에서 내려와요.', '朋友從山上下來。'],
  '시키다': ['선생님이 숙제를 시켜요.', '老師要求做作業。'],
  '외치다': ['사람들이 크게 외쳐요.', '人們大聲呼喊。'],
  '요구하다': ['손님이 환불을 요구해요.', '客人要求退款。'],
  '차다': ['아이가 공을 차요.', '孩子踢球。'],
  '켜다': ['방의 불을 켜요.', '打開房間的燈。'],
  '계시다': ['선생님이 교실에 계세요.', '老師在教室裡。'],
  '깨다': ['저는 아침 일곱 시에 깨요.', '我早上七點醒來。'],
  '때리다': ['선수가 공을 세게 때려요.', '選手用力擊球。'],
  '바꾸다': ['저는 옷을 바꿔 입어요.', '我換衣服穿。'],
  '쓰다': ['노트에 이름을 써요.', '在筆記本上寫名字。'],
  '그리워하다': ['저는 고향을 그리워해요.', '我思念故鄉。'],
  '꿰다': ['바늘에 실을 꿰어요.', '把線穿進針裡。'],
  '비교하다': ['두 가방의 값을 비교해요.', '比較兩個包包的價格。'],
  '듣다': ['저는 한국 노래를 들어요.', '我聽韓國歌曲。'],
  '먹다': ['저는 아침을 먹어요.', '我吃早餐。'],
  '믿다': ['저는 친구를 믿어요.', '我相信朋友。'],
  '싣다': ['차에 짐을 실어요.', '把行李裝上車。'],
  '굶다': ['너무 바빠서 점심을 굶어요.', '因為太忙而沒吃午餐。'],
  '끊다': ['이제 전화를 끊어요.', '現在掛電話。'],
  '끓다': ['물이 끓어요.', '水沸騰了。'],
  '쌓다': ['책을 책상 위에 쌓아요.', '把書堆在桌上。'],
  '앉다': ['의자에 앉아요.', '坐在椅子上。'],
  '앓다': ['동생이 감기를 앓아요.', '弟弟／妹妹得了感冒。'],
  '얹다': ['책을 가방 위에 얹어요.', '把書放在包包上面。'],
  '핥다': ['고양이가 우유를 핥아요.', '貓舔牛奶。'],
  '훑다': ['문장을 눈으로 훑어요.', '用眼睛快速掃過句子。'],
  '아니다': ['이것은 제 가방이 아니에요.', '這不是我的包包。'],
  '아프다': ['오늘은 머리가 아파요.', '今天頭痛。'],
  '크다': ['이 가방은 커요.', '這個包包很大。'],
  '기쁘다': ['좋은 소식을 들어서 기뻐요.', '聽到好消息所以很高興。'],
  '나쁘다': ['오늘 날씨가 나빠요.', '今天天氣不好。'],
  '바쁘다': ['저는 오늘 바빠요.', '我今天很忙。'],
  '가깝다': ['학교가 집에서 가까워요.', '學校離家很近。'],
  '가볍다': ['이 가방은 가벼워요.', '這個包包很輕。'],
  '곱다': ['한복의 색이 고와요.', '韓服的顏色很漂亮。'],
  '작다': ['이 신발은 작아요.', '這雙鞋很小。'],
  '괜찮다': ['지금은 괜찮아요.', '現在沒關係了。'],
  '귀찮다': ['오늘은 요리하기가 귀찮아요.', '今天覺得做飯很麻煩。'],
  '넓다': ['이 방은 넓어요.', '這個房間很寬敞。'],
  '싫다': ['저는 매운 음식이 싫어요.', '我不喜歡辣的食物。'],
  '옳다': ['그 답이 옳아요.', '那個答案是正確的。'],
  '점잖다': ['그분은 말과 행동이 점잖아요.', '那位先生言行穩重。'],
  '좋다': ['오늘 날씨가 좋아요.', '今天天氣很好。'],
  '나이': ['나이가 어떻게 돼요?', '年齡多大？'],
  '새해': ['새해에 가족을 만나요.', '新年和家人見面。'],
  '시대': ['새로운 시대가 시작돼요.', '新的時代開始了。'],
  '어제': ['어제 친구를 만났어요.', '昨天見了朋友。'],
  '과거': ['과거를 기억해요.', '記得過去。'],
  '가을': ['가을에는 날씨가 좋아요.', '秋天天氣很好。'],
  '겨울': ['겨울에는 날씨가 추워요.', '冬天天氣很冷。'],
  '금년': ['금년에는 한국어를 배워요.', '今年學習韓文。'],
  '내년': ['내년에 한국에 가요.', '明年去韓國。'],
  '밤': ['밤에 집에서 쉬어요.', '晚上在家休息。'],
  '오늘': ['오늘 친구를 만나요.', '今天和朋友見面。'],
  '낮': ['낮에는 공원에 가요.', '白天去公園。'],
  '아래': ['책이 의자 아래에 있어요.', '書在椅子下面。'],
  '위': ['책이 책상 위에 있어요.', '書在桌子上面。'],
  '동쪽': ['해가 동쪽에서 떠요.', '太陽從東邊升起。'],
  '서쪽': ['해가 서쪽으로 져요.', '太陽往西邊落下。'],
  '오른쪽': ['은행은 오른쪽에 있어요.', '銀行在右邊。'],
  '동녘': ['동녘 하늘이 밝아요.', '東方的天空亮了。'],
  '밖': ['아이들이 밖에서 놀아요.', '孩子們在外面玩。'],
  '옆': ['친구가 제 옆에 앉아요.', '朋友坐在我旁邊。'],
  '궤도': ['기차가 궤도를 따라가요.', '火車沿著軌道行駛。'],
  '차표': ['역에서 차표를 사요.', '在車站買車票。'],
  '표': ['영화 표를 두 장 사요.', '買兩張電影票。'],
  '머리': ['오늘은 머리가 아파요.', '今天頭痛。'],
  '비누': ['비누로 손을 씻어요.', '用肥皂洗手。'],
  '유리': ['창문은 유리로 만들었어요.', '窗戶是用玻璃做的。'],
  '교과서': ['교과서로 한국어를 공부해요.', '用教科書學韓文。'],
  '사회': ['학교에서 사회를 배워요.', '在學校學習社會。'],
  '소리': ['밖에서 큰 소리가 들려요.', '從外面傳來很大的聲音。'],
  '어휘': ['새 어휘를 노트에 써요.', '把新詞彙寫在筆記本上。'],
  '기초': ['한국어 기초를 배워요.', '學習韓文基礎。'],
  '뉴스': ['아침에 뉴스를 봐요.', '早上看新聞。'],
  '요구': ['손님의 요구를 들어요.', '聽取客人的要求。'],
  '이야기': ['친구의 이야기를 들어요.', '聽朋友的故事。'],
  '주의': ['운전할 때 주의가 필요해요.', '開車時需要注意。'],
  '글': ['한국어로 짧은 글을 써요.', '用韓文寫短文。'],
  '단어': ['매일 새 단어를 외워요.', '每天背新單字。'],
  '소': ['목장에 소가 있어요.', '牧場裡有牛。'],
  '돼지': ['농장에 돼지가 있어요.', '農場裡有豬。'],
  '강': ['도시에 큰 강이 있어요.', '城市裡有一條大河。'],
  '경치': ['산의 경치가 아름다워요.', '山上的風景很美。'],
  '값': ['이 가방은 값이 싸요.', '這個包包價格便宜。'],
  '그루': ['공원에 나무 한 그루가 있어요.', '公園裡有一棵樹。'],
  '기회': ['다시 만날 기회가 있어요.', '有再次見面的機會。'],
  '노래': ['저는 한국 노래를 좋아해요.', '我喜歡韓國歌曲。'],
  '뒤': ['학교 뒤에 공원이 있어요.', '學校後面有公園。'],
  '배': ['배를 타고 섬에 가요.', '搭船去島上。'],
  '세수': ['저는 아침마다 세수를 해요.', '我每天早上洗臉。'],
  '야구': ['주말에 친구하고 야구를 해요.', '週末和朋友打棒球。'],
  '키': ['제 동생은 키가 커요.', '我的弟弟／妹妹個子很高。'],
  '공': ['그 선수는 큰 공을 세웠어요.', '那位選手立下了大功。'],
  '몸': ['운동하면 몸이 건강해져요.', '運動會讓身體變健康。'],
  '곬': ['물이 한 곬으로 흘러요.', '水朝同一條水道流。'],
  '끝': ['수업이 끝났어요.', '課程結束了。'],
  '낫': ['농부가 낫을 사용해요.', '農夫使用鐮刀。'],
  '넋': ['이야기를 듣고 넋을 잃었어요.', '聽了故事後出了神。'],
  '몫': ['이것은 제 몫이에요.', '這是我的那一份。'],
  '삯': ['일한 삯을 받아요.', '領取工作的工錢。'],
};

function hasFinalConsonant(word = '') {
  const code = word.codePointAt(word.length - 1) - 0xAC00;
  return code >= 0 && code <= 11171 && code % 28 !== 0;
}

function particle(word, consonantForm, vowelForm) {
  return hasFinalConsonant(word) ? consonantForm : vowelForm;
}

function sentenceContainsKoreanTerm(text = '', term = '') {
  if (!term) return false;
  const particlePattern = /^(은|는|이|가|을|를|에|에서|도|만|와|과|하고|의|로|으로|에게|한테|부터|까지|에는|에서는|에게는|로는|으로는)$/;
  return String(text).split(/\s+/).some((rawToken) => {
    const token = rawToken.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
    if (token === term) return true;
    return token.startsWith(term) && particlePattern.test(token.slice(term.length));
  });
}

function generatedExample(entry) {
  if (SPECIAL_EXAMPLES[entry.ko]) return SPECIAL_EXAMPLES[entry.ko];
  const present = PRESENT_FORMS[entry.ko];
  if (present) {
    const adjective = entry.partOfSpeechZh === '形容詞' || entry.ko === '아니다';
    return adjective
      ? [`오늘은 ${present}.`, `今天${entry.zhTW}。`]
      : [`저는 매일 ${present}.`, `我每天${entry.zhTW}。`];
  }
  const topics = entry.topics || [];
  if (topics.includes('places_directions')) return [`저는 ${entry.ko}에 가요.`, `我去${entry.zhTW}。`];
  if (topics.includes('people_family')) return [`${entry.ko}하고 이야기해요.`, `和${entry.zhTW}說話。`];
  if (topics.includes('transport')) return [`저는 ${entry.ko}${particle(entry.ko, '을', '를')} 타요.`, `我搭${entry.zhTW}。`];
  if (topics.includes('food_drink')) return [`저는 ${entry.ko}${particle(entry.ko, '을', '를')} 좋아해요.`, `我喜歡${entry.zhTW}。`];
  if (topics.includes('animals_nature')) return [`공원에서 ${entry.ko}${particle(entry.ko, '을', '를')} 봐요.`, `在公園看${entry.zhTW}。`];
  if (['代詞', '限定詞', '副詞', '感嘆詞', '表現'].includes(entry.partOfSpeechZh)) return [`${entry.ko} 같이 가요.`, `${entry.zhTW}，一起去吧。`];
  return [`${entry.ko}${particle(entry.ko, '이', '가')} 있어요.`, `有${entry.zhTW}。`];
}

function prepareVocabulary(vocabulary) {
  return vocabulary.map((entry) => {
    const copy = clone(entry);
    const special = SPECIAL_EXAMPLES[copy.ko];
    const hasCompleteSentence = copy.exampleKo && copy.exampleKo !== copy.ko && copy.exampleZhTW && /[.!?。？！]|\s/.test(copy.exampleKo);
    if (special && !hasCompleteSentence) {
      copy.exampleKo = special[0];
      copy.exampleZhTW = special[1];
      copy.formInText = PRESENT_FORMS[copy.ko] || copy.formInText || copy.ko;
    } else if (!hasCompleteSentence) {
      const [exampleKo, exampleZhTW] = generatedExample(copy);
      copy.exampleKo = exampleKo;
      copy.exampleZhTW = exampleZhTW;
      copy.formInText = PRESENT_FORMS[copy.ko] || copy.formInText || copy.ko;
    }
    return copy;
  });
}

function curriculumUnitFor(entry) {
  const explicit = CURRICULUM_UNITS.find((unit) => unit.words?.includes(entry.ko));
  if (explicit) return explicit;
  const topic = (entry.topics || []).find((item) => item !== 'general');
  if (topic === 'action') {
    const communication = ['모르다', '배우다', '사귀다', '시키다', '외치다', '요구하다', '그리워하다', '비교하다', '듣다', '믿다'];
    return CURRICULUM_UNITS.find((unit) => unit.id === (communication.includes(entry.ko) ? 'KO-A2-02' : 'KO-A2-01'));
  }
  return CURRICULUM_UNITS.find((unit) => unit.topics.includes(topic)) || CURRICULUM_UNITS.at(-1);
}

function buildVocabularyCurriculum(vocabulary) {
  const grouped = new Map(CURRICULUM_UNITS.map((unit) => [unit.id, []]));
  vocabulary.forEach((entry) => {
    const unit = curriculumUnitFor(entry);
    entry.lessonIds = [unit.id];
    entry.curriculumLevel = unit.level;
    entry.curriculumTitle = unit.titleZh;
    grouped.get(unit.id).push(entry);
  });
  return CURRICULUM_UNITS.map((unit, unitIndex) => {
    const entries = grouped.get(unit.id);
    const paragraphs = [];
    for (let index = 0; index < entries.length; index += 4) {
      const group = entries.slice(index, index + 4);
      paragraphs.push({
        ko: group.map((entry) => entry.exampleKo).join(' '),
        zh: group.map((entry) => entry.exampleZhTW || entry.zhTW).join(' '),
      });
    }
    return {
      id: unit.id,
      order: unitIndex + 1,
      titleKo: unit.titleKo,
      titleZh: unit.titleZh,
      sourceType: '193-word A1–A2 vocabulary curriculum',
      level: unit.level,
      paragraphs,
      questions: [],
      textKo: paragraphs.map((paragraph) => paragraph.ko).join('\n\n'),
      isTextbookVerbatim: false,
      vocabularyIds: entries.map((entry) => entry.id),
      sentences: entries.map((entry, index) => ({ id: `${unit.id}-S${index + 1}`, text: entry.exampleKo, translation: entry.exampleZhTW, vocabularyIds: [entry.id] })),
    };
  }).filter((lesson) => lesson.vocabularyIds.length);
}

function normalizeFullBundle(input, { lessonIdMap = {} } = {}) {
  const lessons = Array.isArray(input?.lessons) ? input.lessons : [];
  const sentencePool = lessons.flatMap((lesson) => lesson.sentences || []);
  const vocabulary = (input?.vocabulary || []).map((entry) => {
    const lemma = entry.display || entry.lemma || '';
    const forms = Array.isArray(entry.surface_forms) ? entry.surface_forms : [];
    const example = sentencePool.find((sentence) => [lemma, ...forms].some((form) => sentenceContainsKoreanTerm(sentence.text, form)));
    return {
      id: entry.id,
      ko: lemma,
      zhTW: entry.meaning_zh_tw || '',
      formInText: forms[0] || lemma,
      exampleKo: example?.text || lemma,
      exampleZhTW: '',
      sourceLabel: sourceLabel(entry.sources),
      textbookSections: (entry.sources || []).map((source) => source.section).filter(Boolean),
      topics: entry.topics || [],
      lessonIds: (entry.used_in_readings || []).map((id) => lessonIdMap[id] || id),
      partOfSpeechZh: posLabel(entry.pos),
      learningNoteZh: (entry.topics || []).join(' · '),
      learningState: entry.learning_state || 'textbook_pool',
      sourceId: entry.id,
      surfaceForms: forms,
    };
  });
  return {
    schemaVersion: KOREAN_SCHEMA_VERSION,
    language: 'ko-KR',
    vocabulary,
    lessons: lessons.map((lesson) => {
      const id = lessonIdMap[lesson.id] || lesson.id;
      const paragraphs = String(lesson.text || '').split(/\n\s*\n/).map((text) => text.trim()).filter(Boolean).map((ko) => ({ ko, zh: '' }));
      return {
        id,
        order: lesson.order,
        titleKo: lesson.title_ko || lesson.id,
        titleZh: lesson.title_zh_tw || '',
        sourceType: 'korean_content_pack',
        level: 'A1',
        paragraphs,
        questions: [],
        textKo: lesson.text || paragraphs.map((paragraph) => paragraph.ko).join('\n\n'),
        isTextbookVerbatim: false,
        vocabularyIds: vocabulary.filter((entry) => entry.lessonIds.includes(id)).map((entry) => entry.id),
        sentences: clone(lesson.sentences || []),
      };
    }),
    phrases: clone(input?.phrases || []),
    grammar: clone(input?.grammar || []),
    pronunciationExamples: clone(input?.pronunciation_examples || []),
    pronunciationSentences: (input?.pronunciation_sentences || []).map((item, index) => ({ ...clone(item), id: item.id || `pronunciation-sentence-${index + 1}` })),
    rawReadingSurfaceTokens: clone(input?.raw_reading_surface_tokens || []),
    sourcePolicy: clone(input?.source_policy || {}),
  };
}

function mergeVocabularyByLemma(base, incoming) {
  const result = base.map((entry) => clone(entry));
  incoming.forEach((entry) => {
    const existing = result.find((candidate) => candidate.id === entry.id || candidate.ko === entry.ko);
    if (!existing) {
      result.push(clone(entry));
      return;
    }
    existing.lessonIds = [...new Set([...(existing.lessonIds || []), ...(entry.lessonIds || [])])];
    existing.sourceLabel = existing.sourceLabel || entry.sourceLabel;
    existing.partOfSpeechZh = existing.partOfSpeechZh || entry.partOfSpeechZh;
    existing.learningState = existing.learningState || entry.learningState;
    existing.surfaceForms = [...new Set([...(existing.surfaceForms || []), ...(entry.surfaceForms || [])])];
    existing.textbookSections = [...new Set([...(existing.textbookSections || []), ...(entry.textbookSections || [])])];
    existing.topics = [...new Set([...(existing.topics || []), ...(entry.topics || [])])];
    existing.fullPackId = entry.sourceId || entry.id;
  });
  return result;
}

export function getSeedKoreanContent() {
  const lessonIdMap = {};
  fullContentPack.lessons?.forEach((lesson) => {
    const legacyId = { 'reading-01': 'KR-R01', 'reading-02': 'KR-R02' }[lesson.id];
    lessonIdMap[lesson.id] = legacyId || lesson.id;
  });
  const normalized = normalizeFullBundle(fullContentPack, { lessonIdMap });
  const mergedVocabulary = prepareVocabulary(mergeVocabularyByLemma(clone(bundledVocabulary.vocabulary), normalized.vocabulary));
  const lessons = buildVocabularyCurriculum(mergedVocabulary);
  return {
    schemaVersion: KOREAN_SCHEMA_VERSION,
    language: 'ko-KR',
    lessons,
    vocabulary: mergedVocabulary,
    phrases: normalized.phrases,
    grammar: normalized.grammar,
    pronunciationExamples: normalized.pronunciationExamples,
    pronunciationSentences: normalized.pronunciationSentences,
    rawReadingSurfaceTokens: normalized.rawReadingSurfaceTokens,
    sourcePolicy: normalized.sourcePolicy,
  };
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function validateUniqueIds(items, label, errors) {
  const seen = new Set();
  items.forEach((item, index) => {
    if (!item || typeof item !== 'object' || typeof item.id !== 'string' || !item.id.trim()) {
      errors.push(`${label}[${index}] is missing a stable id.`);
      return;
    }
    if (seen.has(item.id)) errors.push(`${label} contains duplicate id ${item.id}.`);
    seen.add(item.id);
  });
  return seen;
}

export function validateKoreanBundle(input, { knownVocabularyIds = new Set(), allowPartial = false } = {}) {
  const errors = [];
  const warnings = [];
  if (!input || typeof input !== 'object') return { ok: false, errors: ['The JSON root must be an object.'], warnings };
  const bundle = input.schema_version && Array.isArray(input.lessons) && Array.isArray(input.vocabulary) ? normalizeFullBundle(input) : input;
  if (bundle.schemaVersion !== KOREAN_SCHEMA_VERSION) errors.push(`schemaVersion must be ${KOREAN_SCHEMA_VERSION}.`);
  const lessons = Array.isArray(bundle.lessons) ? bundle.lessons : [];
  const vocabulary = Array.isArray(bundle.vocabulary) ? bundle.vocabulary : Array.isArray(bundle.entries) ? bundle.entries : [];
  if (!allowPartial && !lessons.length && !vocabulary.length) errors.push('The bundle must contain lessons or vocabulary entries.');
  const lessonIds = validateUniqueIds(lessons, 'lessons', errors);
  const vocabularyIds = validateUniqueIds(vocabulary, 'vocabulary', errors);

  lessons.forEach((lesson) => {
    if (!lesson.titleKo?.trim() || !lesson.titleZh?.trim()) errors.push(`${lesson.id || 'Lesson'} needs Korean and Traditional Chinese titles.`);
    if (!lesson.textKo?.trim()) errors.push(`${lesson.id || 'Lesson'} needs nonempty Korean text.`);
    if (!Array.isArray(lesson.paragraphs) || !lesson.paragraphs.length) errors.push(`${lesson.id || 'Lesson'} needs paragraphs.`);
    lesson.paragraphs?.forEach((paragraph, index) => {
      if (!paragraph?.ko?.trim()) errors.push(`${lesson.id || 'Lesson'} paragraph ${index + 1} needs Korean text.`);
    });
    if (!Array.isArray(lesson.questions)) errors.push(`${lesson.id || 'Lesson'} needs a questions array.`);
    lesson.questions?.forEach((question, index) => {
      if (!question?.id || !question.promptZh?.trim()) errors.push(`${lesson.id || 'Lesson'} question ${index + 1} needs an id and promptZh.`);
      if (!Array.isArray(question.optionsZh) || question.optionsZh.length < 2) errors.push(`${question.id || 'Question'} needs at least two options.`);
      if (!Number.isInteger(question.correctIndex) || question.correctIndex < 0 || question.correctIndex >= (question.optionsZh?.length || 0)) {
        errors.push(`${question.id || 'Question'} has an invalid correctIndex.`);
      }
    });
    lesson.vocabularyIds?.forEach((id) => {
      if (!vocabularyIds.has(id) && !knownVocabularyIds.has(id)) warnings.push(`${lesson.id} references vocabulary ${id}, which is not in this file.`);
    });
  });

  vocabulary.forEach((entry) => {
    if (!entry.ko?.trim() || !entry.zhTW?.trim() || !entry.exampleKo?.trim()) errors.push(`${entry.id || 'Vocabulary entry'} needs Korean, meaning, and example text.`);
    if (!Array.isArray(entry.lessonIds)) errors.push(`${entry.id || 'Vocabulary entry'} needs lessonIds.`);
    entry.lessonIds?.forEach((id) => {
      if (!lessonIds.has(id) && !input.lessons?.some((lesson) => lesson.id === id)) warnings.push(`${entry.id} references lesson ${id}, which is not in this file.`);
    });
  });

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    lessons,
    vocabulary,
    phrases: bundle.phrases || [],
    grammar: bundle.grammar || [],
    pronunciationExamples: bundle.pronunciationExamples || [],
    pronunciationSentences: bundle.pronunciationSentences || [],
    summary: { lessons: lessons.length, vocabulary: vocabulary.length, questions: lessons.reduce((sum, lesson) => sum + (lesson.questions?.length || 0), 0), phrases: (bundle.phrases || []).length, grammar: (bundle.grammar || []).length, pronunciationExamples: (bundle.pronunciationExamples || []).length },
  };
}

export function loadImportedKoreanContent() {
  try {
    const stored = JSON.parse(localStorage.getItem(KOREAN_CONTENT_STORAGE_KEY) || '{"schemaVersion":1,"lessons":[],"vocabulary":[]}');
    const result = validateKoreanBundle(stored, { allowPartial: true });
    return result.ok ? { schemaVersion: KOREAN_SCHEMA_VERSION, lessons: result.lessons, vocabulary: result.vocabulary, phrases: result.phrases, grammar: result.grammar, pronunciationExamples: result.pronunciationExamples, pronunciationSentences: result.pronunciationSentences } : { schemaVersion: KOREAN_SCHEMA_VERSION, lessons: [], vocabulary: [], phrases: [], grammar: [], pronunciationExamples: [], pronunciationSentences: [] };
  } catch {
    return { schemaVersion: KOREAN_SCHEMA_VERSION, lessons: [], vocabulary: [], phrases: [], grammar: [], pronunciationExamples: [], pronunciationSentences: [] };
  }
}

export function saveImportedKoreanContent(content) {
  localStorage.setItem(KOREAN_CONTENT_STORAGE_KEY, JSON.stringify({
    schemaVersion: KOREAN_SCHEMA_VERSION,
    lessons: content.lessons,
    vocabulary: content.vocabulary,
    phrases: content.phrases || [],
    grammar: content.grammar || [],
    pronunciationExamples: content.pronunciationExamples || [],
    pronunciationSentences: content.pronunciationSentences || [],
  }));
}

export function mergeKoreanContent(base, incoming) {
  const lessons = [...base.lessons];
  const vocabulary = [...base.vocabulary];
  const phrases = [...(base.phrases || [])];
  const grammar = [...(base.grammar || [])];
  const pronunciationExamples = [...(base.pronunciationExamples || [])];
  const pronunciationSentences = [...(base.pronunciationSentences || [])];
  const collisions = [];
  const add = (target, items, label) => {
    items.forEach((item) => {
      const existing = target.find((candidate) => candidate.id === item.id);
      if (!existing) target.push(clone(item));
      else if (!sameJson(existing, item)) collisions.push(`${label} ${item.id} conflicts with existing content.`);
    });
  };
  add(lessons, incoming.lessons || [], 'Lesson');
  incoming.vocabulary?.forEach((item) => {
    const existing = vocabulary.find((candidate) => candidate.id === item.id || candidate.ko === item.ko);
    if (!existing) vocabulary.push(clone(item));
    else if (existing.id === item.id && !sameJson(existing, item)) collisions.push(`Vocabulary ${item.id} conflicts with existing content.`);
    else {
      const [merged] = mergeVocabularyByLemma([existing], [item]);
      Object.assign(existing, merged);
    }
  });
  add(phrases, incoming.phrases || [], 'Phrase');
  add(grammar, incoming.grammar || [], 'Grammar');
  add(pronunciationExamples, incoming.pronunciationExamples || [], 'Pronunciation example');
  add(pronunciationSentences, incoming.pronunciationSentences || [], 'Pronunciation sentence');
  return { schemaVersion: KOREAN_SCHEMA_VERSION, lessons, vocabulary, phrases, grammar, pronunciationExamples, pronunciationSentences, collisions };
}

export function getKoreanContent() {
  const seed = getSeedKoreanContent();
  const imported = loadImportedKoreanContent();
  const merged = mergeKoreanContent(seed, { ...imported, lessons: [] });
  merged.vocabulary = prepareVocabulary(merged.vocabulary);
  merged.lessons = buildVocabularyCurriculum(merged.vocabulary);
  return merged;
}

export function exportKoreanContent(content = getKoreanContent()) {
  return JSON.stringify({ schemaVersion: KOREAN_SCHEMA_VERSION, language: 'ko-KR', lessons: content.lessons, vocabulary: content.vocabulary, phrases: content.phrases || [], grammar: content.grammar || [], pronunciationExamples: content.pronunciationExamples || [], pronunciationSentences: content.pronunciationSentences || [] }, null, 2);
}
