import { useEffect, useState } from 'react';
import { REACTIONS } from '../config/tuning';

/**
 * 가상 학생 아바타. 플랫한 덩어리 스타일(큰 얼굴, 밥컷, 과장 표정).
 * state:
 *  idle          중립 (눈 깜빡)
 *  speaking      경청 - 주기적 끄덕임
 *  silence_short 갸웃
 *  silence_long  "...?" 물음표
 *  thinking      질문 큐 - 시선 위, 생각
 *  bignod        정리 큐 - 크게 끄덕 + 반짝 눈
 *  writing       새 용어 큐 - 받아 적기
 *  focus         반복 강조 큐 - 집중 (동공 확대)
 */
export default function Avatar({ state }) {
  const [nodTick, setNodTick] = useState(0);

  // speaking 상태에서 랜덤 간격 끄덕임 트리거
  useEffect(() => {
    if (state !== 'speaking') return;
    let alive = true;
    let t;
    const loop = () => {
      const delay =
        REACTIONS.NOD_MIN_MS +
        Math.random() * (REACTIONS.NOD_MAX_MS - REACTIONS.NOD_MIN_MS);
      t = setTimeout(() => {
        if (!alive) return;
        setNodTick((n) => n + 1);
        loop();
      }, delay);
    };
    loop();
    return () => { alive = false; clearTimeout(t); };
  }, [state]);

  const headClass = {
    idle: '',
    speaking: 'anim-nod',
    silence_short: 'anim-tilt',
    silence_long: 'anim-tilt-hold',
    thinking: 'anim-look-up',
    bignod: 'anim-bignod',
    writing: 'anim-write-head',
    focus: 'anim-lean-in',
  }[state] || '';

  const bigPupil = state === 'focus' || state === 'bignod';
  const lookUp = state === 'thinking';
  const showQuestion = state === 'silence_long';
  const showSpark = state === 'bignod';
  const showPencil = state === 'writing';

  // 입 모양
  const mouth = (() => {
    switch (state) {
      case 'speaking':
      case 'bignod':
        return <path d="M232 342 Q256 362 280 342" stroke="#7c2d12" strokeWidth="10" fill="none" strokeLinecap="round" />; // 미소
      case 'silence_short':
      case 'thinking':
        return <circle cx="256" cy="350" r="9" fill="#7c2d12" />; // 오므린 입
      case 'silence_long':
        return <ellipse cx="256" cy="352" rx="14" ry="10" fill="#7c2d12" />; // 벌어진 입
      case 'focus':
        return <line x1="238" y1="350" x2="274" y2="350" stroke="#7c2d12" strokeWidth="9" strokeLinecap="round" />; // 다문 입
      case 'writing':
        return <path d="M236 348 Q256 356 276 348" stroke="#7c2d12" strokeWidth="9" fill="none" strokeLinecap="round" />;
      default:
        return <path d="M238 346 Q256 354 274 346" stroke="#7c2d12" strokeWidth="9" fill="none" strokeLinecap="round" />;
    }
  })();

  const pupilR = bigPupil ? 17 : 13;
  const pupilY = lookUp ? 268 : 282;

  return (
    <div className="relative select-none" aria-label={`아바타 상태: ${state}`}>
      <svg viewBox="0 0 512 512" className="w-full max-w-sm mx-auto drop-shadow-xl">
        {/* 몸통 (셔츠) */}
        <path d="M256 400 L150 512 L362 512 Z" fill="#a78bfa" />
        <g key={state === 'speaking' ? nodTick : state} className={headClass} style={{ transformOrigin: '256px 400px' }}>
          {/* 머리카락 뒤판 */}
          <path
            d="M256 60 C150 60 90 140 96 240 C100 310 120 360 150 380 L150 250 C150 250 160 200 200 180 L312 180 C352 200 362 250 362 250 L362 380 C392 360 412 310 416 240 C422 140 362 60 256 60 Z"
            fill="#374151"
          />
          {/* 얼굴 */}
          <rect x="140" y="160" width="232" height="250" rx="64" fill="#f4b183" />
          {/* 앞머리 */}
          <path d="M256 100 L196 200 L316 200 Z" fill="#f4b183" />
          <path d="M150 230 C150 150 200 110 256 110 C312 110 362 150 362 230 L362 200 C340 150 300 140 256 140 C212 140 172 150 150 200 Z" fill="#374151" />
          {/* 눈 흰자 */}
          <ellipse cx="200" cy="284" rx="36" ry={state === 'idle' ? 36 : 38} fill="#ffffff" className={state === 'idle' ? 'anim-blink' : ''} />
          <ellipse cx="312" cy="284" rx="36" ry={state === 'idle' ? 36 : 38} fill="#ffffff" className={state === 'idle' ? 'anim-blink' : ''} />
          {/* 동공 */}
          <circle cx="200" cy={pupilY} r={pupilR} fill="#111827" />
          <circle cx="312" cy={pupilY} r={pupilR} fill="#111827" />
          {showSpark && (
            <>
              <circle cx="206" cy={pupilY - 5} r="4" fill="#fff" />
              <circle cx="318" cy={pupilY - 5} r="4" fill="#fff" />
            </>
          )}
          {/* 코 */}
          <path d="M256 300 L246 322 L266 322 Z" fill="#e2986a" />
          {/* 입 */}
          {mouth}
        </g>

        {/* 물음표 말풍선 */}
        {showQuestion && (
          <g className="anim-pop">
            <circle cx="420" cy="120" r="44" fill="#ffffff" />
            <text x="420" y="140" textAnchor="middle" fontSize="56" fontWeight="800" fill="#111827">?</text>
          </g>
        )}
        {/* 필기 연필 */}
        {showPencil && (
          <g className="anim-scribble" style={{ transformOrigin: '420px 470px' }}>
            <rect x="400" y="430" width="14" height="70" rx="6" fill="#fbbf24" transform="rotate(35 407 465)" />
            <path d="M436 500 L452 512 L444 486 Z" fill="#111827" />
          </g>
        )}
      </svg>
    </div>
  );
}
