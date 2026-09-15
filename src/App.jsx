import { useCallback, useEffect, useRef, useState } from 'react';
import Avatar from './components/Avatar';
import { useVAD } from './hooks/useVAD';
import { useSpeechCues } from './hooks/useSpeechCues';
import { useRecorder } from './hooks/useRecorder';
import { CUE } from './config/tuning';

const DEBUG_STATES = [
  'idle', 'speaking', 'silence_short', 'silence_long',
  'thinking', 'bignod', 'writing', 'focus',
];

export default function App() {
  const [session, setSession] = useState(false);
  const [stream, setStream] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [cueOverride, setCueOverride] = useState(null); // { state, label }
  const [lastCueLabel, setLastCueLabel] = useState(null);
  const [downloads, setDownloads] = useState(null); // { audio, transcript }
  const [debugState, setDebugState] = useState(null);
  const [showDebug, setShowDebug] = useState(false);
  const [error, setError] = useState(null);
  const cueTimerRef = useRef(null);

  const { vadState, level } = useVAD(stream, session);
  const { recording, start: startRec, stop: stopRec } = useRecorder();

  const handleCue = useCallback((cue) => {
    clearTimeout(cueTimerRef.current);
    setCueOverride(cue);
    setLastCueLabel(cue.label);
    cueTimerRef.current = setTimeout(() => setCueOverride(null), CUE.DURATION_MS);
  }, []);

  const { supported: sttSupported, listening, getTranscript, resetTranscript } =
    useSpeechCues(session, handleCue);

  // 세션 타이머
  useEffect(() => {
    if (!session) return;
    const t0 = Date.now();
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 500);
    return () => clearInterval(t);
  }, [session]);

  const startSession = async () => {
    setError(null);
    setDownloads(null);
    resetTranscript();
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      setStream(s);
      startRec(s);
      setElapsed(0);
      setSession(true);
    } catch {
      setError('마이크 권한이 필요해요. 브라우저 설정에서 허용해주세요.');
    }
  };

  const endSession = async () => {
    setSession(false);
    const audio = await stopRec();
    const text = getTranscript();
    let transcript = null;
    if (text.trim()) {
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      transcript = URL.createObjectURL(blob);
    }
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
    setCueOverride(null);
    setDownloads({ audio, transcript });
  };

  // 최종 아바타 상태: 디버그 > 2층 큐 > 1층 VAD
  const avatarState = debugState ?? cueOverride?.state ?? vadState;

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');
  const stamp = () => new Date().toISOString().slice(0, 16).replace('T', '_').replaceAll(':', '');

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center px-4 py-6">
      <header className="w-full max-w-md flex items-center justify-between mb-2">
        <h1 className="text-lg font-bold tracking-tight">리허설 학생</h1>
        <button
          onClick={() => { setShowDebug((v) => !v); setDebugState(null); }}
          className="text-xs text-slate-500 hover:text-slate-300"
        >
          {showDebug ? '디버그 끄기' : '디버그'}
        </button>
      </header>

      <main className="w-full max-w-md flex-1 flex flex-col items-center justify-center gap-4">
        <Avatar state={avatarState} />

        {/* 상태 표시줄 */}
        <div className="h-6 text-sm text-slate-400">
          {session ? (
            cueOverride ? (
              <span className="text-amber-300">✨ {cueOverride.label}</span>
            ) : (
              { speaking: '듣고 있어요', idle: '…', silence_short: '멈추셨네요?', silence_long: '계속해 주세요…?' }[vadState]
            )
          ) : (
            downloads ? '수고했어요! 파일을 저장하세요' : '시작을 누르면 수업이 시작돼요'
          )}
        </div>

        {/* 컨트롤 */}
        {!session ? (
          <button
            onClick={startSession}
            className="px-8 py-3 rounded-2xl bg-violet-500 hover:bg-violet-400 font-bold text-lg shadow-lg shadow-violet-900/50 transition"
          >
            ▶ 수업 시작
          </button>
        ) : (
          <div className="flex items-center gap-4">
            <span className="font-mono text-xl tabular-nums">{mm}:{ss}</span>
            <span className={`w-3 h-3 rounded-full ${recording ? 'bg-red-500 animate-pulse' : 'bg-slate-600'}`} />
            <button
              onClick={endSession}
              className="px-6 py-2.5 rounded-2xl bg-slate-700 hover:bg-slate-600 font-bold transition"
            >
              ■ 종료
            </button>
          </div>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}

        {/* 세션 종료 후 다운로드 */}
        {downloads && (
          <div className="flex flex-col gap-2 w-full">
            {downloads.audio && (
              <a
                href={downloads.audio.url}
                download={`rehearsal_${stamp()}.webm`}
                className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-center font-medium transition"
              >
                🎙 녹음 저장 ({(downloads.audio.size / 1024 / 1024).toFixed(1)} MB)
              </a>
            )}
            {downloads.transcript && (
              <a
                href={downloads.transcript}
                download={`rehearsal_${stamp()}.txt`}
                className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-center font-medium transition"
              >
                📝 러프 전사 저장 (정밀 전사는 녹음 → 클로바노트)
              </a>
            )}
          </div>
        )}

        {/* 2층 상태 안내 */}
        {session && (
          <p className="text-xs text-slate-600">
            {sttSupported
              ? listening ? '내용 반응 켜짐' : '내용 반응 연결 중…'
              : '이 브라우저는 음성 인식 미지원 — 기본 반응만 동작 (크롬 권장)'}
          </p>
        )}
        {lastCueLabel && session && (
          <p className="text-xs text-slate-600">최근 반응: {lastCueLabel}</p>
        )}
      </main>

      {/* 디버그 패널: 애니메이션 수동 확인 + VAD 레벨 */}
      {showDebug && (
        <footer className="w-full max-w-md mt-4 p-3 rounded-xl bg-slate-800/60">
          <div className="flex flex-wrap gap-1.5 mb-2">
            {DEBUG_STATES.map((s) => (
              <button
                key={s}
                onClick={() => setDebugState((cur) => (cur === s ? null : s))}
                className={`px-2 py-1 rounded text-xs ${debugState === s ? 'bg-violet-500' : 'bg-slate-700'}`}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="h-2 bg-slate-700 rounded overflow-hidden">
            <div
              className="h-full bg-emerald-400 transition-all"
              style={{ width: `${Math.min(100, level * 1500)}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            VAD: {vadState} / RMS {level.toFixed(4)} — 임계값 조정은 src/config/tuning.js
          </p>
        </footer>
      )}
    </div>
  );
}
