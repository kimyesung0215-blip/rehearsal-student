import { useEffect, useMemo, useRef, useState } from 'react';
import { listSessions, deleteSessions, storageEstimate } from '../lib/sessionDB';

function fmtDate(ts) {
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
function fmtDur(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m ? `${m}분 ${s}초` : `${s}초`;
}
function fmtSize(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
function fileStamp(ts) {
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
}
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // 연속 다운로드에서 URL이 먼저 해제되지 않도록 지연 후 정리
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
const extOf = (mime) => (mime?.includes('mp4') ? 'm4a' : mime?.includes('ogg') ? 'ogg' : 'webm');

export default function HistoryPanel() {
  const [sessions, setSessions] = useState(null); // null = 로딩 중
  const [selected, setSelected] = useState(new Set());
  const [playingId, setPlayingId] = useState(null);
  const [quota, setQuota] = useState(null);
  const audioRef = useRef(null);
  const playUrlRef = useRef(null);

  const reload = async () => {
    try {
      setSessions(await listSessions());
      setQuota(await storageEstimate());
    } catch {
      setSessions([]);
    }
  };
  useEffect(() => {
    reload();
    return () => stopPlay();
  }, []);

  const stopPlay = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (playUrlRef.current) {
      URL.revokeObjectURL(playUrlRef.current);
      playUrlRef.current = null;
    }
    setPlayingId(null);
  };

  const togglePlay = (s) => {
    if (playingId === s.id) { stopPlay(); return; }
    stopPlay();
    if (!s.audioBlob) return;
    const url = URL.createObjectURL(s.audioBlob);
    playUrlRef.current = url;
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onended = stopPlay;
    audio.play().catch(stopPlay);
    setPlayingId(s.id);
  };

  const toggleSel = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const allSelected = sessions?.length > 0 && selected.size === sessions.length;
  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(sessions.map((s) => s.id)));
  };

  const selectedSessions = useMemo(
    () => (sessions || []).filter((s) => selected.has(s.id)),
    [sessions, selected]
  );

  const downloadAudio = (s) => {
    if (s.audioBlob) downloadBlob(s.audioBlob, `rehearsal_${fileStamp(s.createdAt)}.${extOf(s.mimeType)}`);
  };
  const downloadText = (s) => {
    if (s.transcript?.trim()) {
      downloadBlob(
        new Blob([s.transcript], { type: 'text/plain;charset=utf-8' }),
        `rehearsal_${fileStamp(s.createdAt)}.txt`
      );
    }
  };
  const bulkDownload = (kind) => {
    // 브라우저가 연속 다운로드를 막지 않도록 간격을 둔다
    selectedSessions.forEach((s, i) => {
      setTimeout(() => (kind === 'audio' ? downloadAudio(s) : downloadText(s)), i * 600);
    });
  };
  const bulkDelete = async () => {
    if (selected.size === 0) return;
    if (!window.confirm(`선택한 ${selected.size}개 세션을 삭제할까요? 복구할 수 없어요.`)) return;
    stopPlay();
    await deleteSessions([...selected]);
    setSelected(new Set());
    reload();
  };

  if (sessions === null) {
    return <p className="text-sm text-slate-500 py-8 text-center">기록 불러오는 중…</p>;
  }
  if (sessions.length === 0) {
    return (
      <p className="text-sm text-slate-500 py-8 text-center">
        아직 저장된 세션이 없어요.<br />수업을 마치면 여기 자동으로 쌓여요.
      </p>
    );
  }

  return (
    <div className="w-full flex flex-col gap-3">
      {/* 상단 바: 전체 선택 + 일괄 작업 */}
      <div className="flex items-center justify-between text-sm">
        <label className="flex items-center gap-2 text-slate-400 cursor-pointer">
          <input type="checkbox" checked={allSelected} onChange={toggleAll} className="accent-violet-500" />
          전체 선택
        </label>
        {selected.size > 0 && (
          <div className="flex gap-1.5">
            <button onClick={() => bulkDownload('audio')} className="px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs">
              🎙 {selected.size}개 받기
            </button>
            <button onClick={() => bulkDownload('text')} className="px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs">
              📝 {selected.size}개 받기
            </button>
            <button onClick={bulkDelete} className="px-2.5 py-1.5 rounded-lg bg-red-900/60 hover:bg-red-800 text-xs">
              삭제
            </button>
          </div>
        )}
      </div>

      {/* 세션 목록 (최신순) */}
      <ul className="flex flex-col gap-2">
        {sessions.map((s) => (
          <li key={s.id} className="rounded-xl bg-slate-800/70 p-3 flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={selected.has(s.id)}
                onChange={() => toggleSel(s.id)}
                className="accent-violet-500 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{fmtDate(s.createdAt)}</p>
                <p className="text-xs text-slate-500">
                  {fmtDur(s.durationSec)} · {fmtSize(s.size)}
                  {s.transcript?.trim() ? ' · 전사 있음' : ' · 전사 없음'}
                </p>
              </div>
              <button
                onClick={() => togglePlay(s)}
                className={`w-9 h-9 rounded-full shrink-0 text-sm ${playingId === s.id ? 'bg-violet-500' : 'bg-slate-700 hover:bg-slate-600'}`}
                aria-label={playingId === s.id ? '정지' : '재생'}
              >
                {playingId === s.id ? '■' : '▶'}
              </button>
            </div>
            <div className="flex gap-1.5 pl-7">
              <button onClick={() => downloadAudio(s)} className="px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs">
                🎙 녹음
              </button>
              <button
                onClick={() => downloadText(s)}
                disabled={!s.transcript?.trim()}
                className="px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs disabled:opacity-30 disabled:cursor-not-allowed"
              >
                📝 전사
              </button>
              <button
                onClick={async () => {
                  if (!window.confirm('이 세션을 삭제할까요? 복구할 수 없어요.')) return;
                  if (playingId === s.id) stopPlay();
                  await deleteSessions([s.id]);
                  setSelected((prev) => { const n = new Set(prev); n.delete(s.id); return n; });
                  reload();
                }}
                className="px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-red-900/70 text-xs ml-auto"
              >
                삭제
              </button>
            </div>
          </li>
        ))}
      </ul>

      {/* 저장 공간 안내 */}
      <p className="text-[10px] text-slate-600 text-center">
        이 기기·브라우저에만 저장돼요. 브라우저 데이터를 지우면 함께 사라져요.
        {quota?.usage != null && ` (사용 중: ${fmtSize(quota.usage)})`}
      </p>
    </div>
  );
}
