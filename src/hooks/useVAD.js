import { useEffect, useRef, useState } from 'react';
import { VAD } from '../config/tuning';

/**
 * 1층: 볼륨 기반 음성 활동 감지.
 * stream(getUserMedia)을 받아 vadState를 돌려준다.
 *   'speaking'      말하는 중
 *   'silence_short' 짧은 정적 (SHORT_SILENCE_MS 경과)
 *   'silence_long'  긴 정적 (LONG_SILENCE_MS 경과)
 *   'idle'          말 끝난 직후 ~ SHORT 이전의 중립 구간
 * AI·네트워크 없이 동작. 오프라인 보장 층.
 */
export function useVAD(stream, active) {
  const [vadState, setVadState] = useState('idle');
  const [level, setLevel] = useState(0); // 디버그 표시용 RMS
  const ctxRef = useRef(null);

  useEffect(() => {
    if (!stream || !active) {
      setVadState('idle');
      return;
    }

    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    ctxRef.current = ctx;
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);
    const buf = new Float32Array(analyser.fftSize);

    let speaking = false;
    let loudSince = null;   // 소리가 임계값을 넘기 시작한 시각
    let quietSince = null;  // 조용해지기 시작한 시각
    let silenceStart = null; // '정적 확정' 시각

    const timer = setInterval(() => {
      analyser.getFloatTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
      const rms = Math.sqrt(sum / buf.length);
      setLevel(rms);
      const now = performance.now();
      const loud = rms > VAD.SPEAKING_THRESHOLD;

      if (loud) {
        quietSince = null;
        if (loudSince === null) loudSince = now;
        if (!speaking && now - loudSince >= VAD.ATTACK_MS) {
          speaking = true;
          silenceStart = null;
          setVadState('speaking');
        }
      } else {
        loudSince = null;
        if (quietSince === null) quietSince = now;
        if (speaking && now - quietSince >= VAD.RELEASE_MS) {
          speaking = false;
          silenceStart = now;
          setVadState('idle');
        }
      }

      // 정적 단계 승급
      if (!speaking && silenceStart !== null) {
        const dur = now - silenceStart;
        if (dur >= VAD.LONG_SILENCE_MS) setVadState('silence_long');
        else if (dur >= VAD.SHORT_SILENCE_MS) setVadState('silence_short');
      }
    }, VAD.POLL_MS);

    return () => {
      clearInterval(timer);
      source.disconnect();
      ctx.close().catch(() => {});
    };
  }, [stream, active]);

  return { vadState, level };
}
