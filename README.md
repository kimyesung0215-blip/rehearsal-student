# 리허설 학생 (rehearsal-student)

수업 리허설용 가상 학생 PWA. 말하면 끄덕이고, 멈추면 갸웃하고,
"즉, 정리하면—" 하면 크게 끄덕이며 받아 적는다. 세션은 녹음되고 러프 전사가 함께 나온다.

## 배포 (GitHub Pages)

`main` 브랜치에 푸시하면 GitHub Actions가 빌드하고 Pages에 자동 배포한다.
저장소의 **Settings → Pages → Build and deployment → Source**가
**GitHub Actions**로 설정되어 있어야 한다.

접속: https://kimyesung0215-blip.github.io/rehearsal-student/

## 첫 실행 후 튜닝
`src/config/tuning.js` — 디버그 패널(우상단)의 RMS 미터를 보면서
`SPEAKING_THRESHOLD`를 "말할 때는 확실히 넘고 숨소리는 안 넘는" 값으로.

## 파이프라인에서의 위치
녹음(.webm) → 클로바노트 정밀 전사 → Claude 페르소나 평가.
앱의 러프 전사(.txt)는 즉석 확인용.
