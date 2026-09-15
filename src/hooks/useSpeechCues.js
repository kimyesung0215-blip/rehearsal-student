import { useEffect, useRef, useState } from 'react';
import { CUE, CUE_PATTERNS } from '../config/tuning';

/**
 * 2층: Web Speech API 중간 인식 결과 → 패턴 매칭 → 반응 이벤트.
 * 정식 전사 담당이 아니라 반응 트리거 전용. 실패하면 조용히 1층만 남는다.
 * 부산물로 세션 전체의 러프 전사(finalTranscript)를 모아 다운로드에 쓴다.
 */
export function useSpeechCues(active, onCue) {
  const [supported, setSupported] = useState(true);
  const [listening, setListening] = useState(false);
  const recRef = useRef(null);
  const activeRef = useRef(false);
  const onCueRef = useRef(onCue);
  const finalRef = useRef('');       // 러프 전사 누적
  const lastCueAtRef = useRef({});   // 큐별 쿨다운
  const wordLogRef = useRef([]);     // 반복 단어 감지용 [{word, t}]

  onCueRef.current = onCue;
  activeRef.current = active;

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setSupported(false);
      return;
    }
    if (!active) return;

    const rec = new SR();
    recRef.current = rec;
    rec.lang = 'ko-KR';
    rec.continuous = true;
    rec.interimResults = true;

    const fireCue = (pattern) => {
      const now = Date.now();
      const last = lastCueAtRef.current[pattern.id] || 0;
      if (now - last < CUE.COOLDOWN_MS) return;
      lastCueAtRef.current[pattern.id] = now;
      onCueRef.current?.({ id: pattern.id, label: pattern.label, state: pattern.state });
    };

    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const text = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          finalRef.current += text.trim() + '\n';
          // 반복 단어 로그 갱신
          const now = Date.now();
          const words = text.split(/\s+/).filter((w) => w.length >= 2);
          wordLogRef.current.push(...words.map((w) => ({ w, t: now })));
          wordLogRef.current = wordLogRef.current.filter(
            (x) => now - x.t < CUE.REPEAT_WINDOW_MS
          );
          const counts = {};
          for (const { w } of wordLogRef.current) counts[w] = (counts[w] || 0) + 1;
          if (Object.values(counts).some((c) => c >= CUE.REPEAT_COUNT)) {
            fireCue({ id: 'repeat', label: '반복 강조 감지', state: 'focus' });
            wordLogRef.current = [];
          }
        } else {
          interim += text;
        }
      }
      const target = interim.trim();
      if (!target) return;
      for (const p of CUE_PATTERNS) {
        if (p.regex.test(target)) {
          fireCue(p);
          break;
        }
      }
    };

    rec.onstart = () => setListening(true);
    rec.onend = () => {
      setListening(false);
      // 침묵/네트워크로 끊기면 세션이 살아있는 동안 자동 재시작
      if (activeRef.current) {
        try { rec.start(); } catch { /* 이미 시작된 경우 무시 */ }
      }
    };
    rec.onerror = (e) => {
      // not-allowed 등 복구 불가 오류면 재시작 포기 → 1층만 동작
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        activeRef.current = false;
        setSupported(false);
      }
    };

    try { rec.start(); } catch { /* noop */ }

    return () => {
      activeRef.current = false;
      rec.onend = null;
      try { rec.stop(); } catch { /* noop */ }
      setListening(false);
    };
  }, [active]);

  const getTranscript = () => finalRef.current;
  const resetTranscript = () => { finalRef.current = ''; };

  return { supported, listening, getTranscript, resetTranscript };
}
