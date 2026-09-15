// ─────────────────────────────────────────────
// 튜닝 상수 모음.
// 실기기 첫 리허설에서 값을 조정할 것. 코드 다른 곳엔 매직넘버 금지.
// ─────────────────────────────────────────────

export const VAD = {
  // RMS 볼륨 임계값 (0~1). 마이크 감도에 따라 0.01~0.05 사이에서 조정.
  SPEAKING_THRESHOLD: 0.008,
  // 히스테리시스: 말 시작/끝 판정에 필요한 연속 시간(ms). 파닥거림 방지.
  ATTACK_MS: 150,   // 이 시간 이상 소리가 지속되어야 "말하는 중"
  RELEASE_MS: 700,  // 이 시간 이상 조용해야 "정적"으로 전환
  // 정적 단계 판정(ms). RELEASE 이후부터 카운트.
  SHORT_SILENCE_MS: 2000,  // 갸웃
  LONG_SILENCE_MS: 5000,   // "...?" 표정
  // 분석 주기(ms)
  POLL_MS: 60,
};

export const CUE = {
  // 2층 반응 지속 시간(ms). 끝나면 1층 상태로 복귀.
  DURATION_MS: 2600,
  // 같은 큐 연속 발동 최소 간격(ms)
  COOLDOWN_MS: 4000,
  // 반복 단어 감지: 최근 N초 안에 같은 단어(2글자 이상)가 K회 이상
  REPEAT_WINDOW_MS: 12000,
  REPEAT_COUNT: 3,
};

// 중간 인식 자막에 대한 패턴 매칭 규칙.
// 위에서부터 첫 매치 하나만 발동.
export const CUE_PATTERNS = [
  {
    id: 'question',
    label: '질문 감지',
    state: 'thinking',
    regex: /(일까|을까|ㄹ까|갔을까|뭘까|왜 그럴|왜일|되겠지|맞겠지|무엇일|어떻게 될)\s*[?요]?\s*$/,
  },
  {
    id: 'summary',
    label: '정리 신호',
    state: 'bignod',
    regex: /(즉,?|그래서|정리하면|정리하자면|핵심은|다시 말해|결론적으로|요약하면)/,
  },
  {
    id: 'newterm',
    label: '새 용어 도입',
    state: 'writing',
    regex: /(라고 해|라고 부른|라고 합니다|이라고 하는|라는 개념|을 뜻해|를 뜻해|의미해)/,
  },
];

export const REACTIONS = {
  // 끄덕임 간격 랜덤 범위(ms): 살아있는 느낌용
  NOD_MIN_MS: 1200,
  NOD_MAX_MS: 2600,
};
