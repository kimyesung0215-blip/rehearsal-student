import { useRef, useState } from 'react';

/**
 * 세션 녹음. VAD와 같은 getUserMedia 스트림을 공유해서 마이크 충돌 방지.
 * 종료 시 webm(또는 브라우저 기본 컨테이너) Blob URL 반환.
 */
export function useRecorder() {
  const recRef = useRef(null);
  const chunksRef = useRef([]);
  const [recording, setRecording] = useState(false);

  const start = (stream) => {
    chunksRef.current = [];
    const mime = MediaRecorder.isTypeSupported('audio/webm')
      ? 'audio/webm'
      : undefined; // Safari 등은 브라우저 기본값 사용
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    recRef.current = rec;
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.start(1000); // 1초 단위로 청크 수집 (탭 크래시 대비)
    setRecording(true);
  };

  const stop = () =>
    new Promise((resolve) => {
      const rec = recRef.current;
      if (!rec || rec.state === 'inactive') {
        setRecording(false);
        resolve(null);
        return;
      }
      rec.onstop = () => {
        setRecording(false);
        const type = rec.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type });
        resolve({ blob, url: URL.createObjectURL(blob), type, size: blob.size });
      };
      rec.stop();
    });

  return { recording, start, stop };
}
