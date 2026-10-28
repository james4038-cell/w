# 잇결 ITGYEOL — Render 배포판
Weave the Past, Create the Future

## 배포 방법
1. ZIP을 풀고 GitHub에서 새 저장소를 만듭니다.
2. `itgyeol-render` 폴더 **안의 파일 전체**를 저장소 최상위에 올립니다. 저장소 첫 화면에 `render.yaml`, `server.py`, `requirements.txt`, `public`이 보여야 합니다.
3. https://dashboard.render.com 에 로그인합니다.
4. New → Blueprint에서 해당 GitHub 저장소를 연결하고 배포합니다. 무료 플랜 사용 여부를 화면에서 확인하세요.
5. 배포 완료 후 표시되는 https://…onrender.com 주소를 엽니다.

Blueprint 대신 New → Web Service로 만드는 경우:
- Language: Python 3
- Root Directory: 비워 둠 (파일이 저장소 최상위에 있을 때)
- Build Command: `pip install -r requirements.txt`
- Start Command: `uvicorn server:app --host 0.0.0.0 --port $PORT --workers 1 --ws-max-size 4096`
- Health Check Path: `/healthz`
- 환경변수 PYTHON_VERSION: `3.12.8`
폴더 자체를 저장소에 올렸다면 Root Directory에 `itgyeol-render`를 입력합니다.

## 접속 확인
- `/healthz`와 `/api/config`에서 `multiplayer: true` 확인.
- `/style.css`는 CSS, `/app.js`는 JavaScript로 열려야 합니다.
- PC와 휴대폰에서 같은 주소로 입장하면 서로의 아바타가 보입니다.
- 별도 방은 `/?room=myroom`처럼 사용합니다. 같은 room 주소끼리 만납니다.
- 로그인, Redis, 외부 API 키 설정이 필요 없습니다.
- PC: WASD/방향키 이동, 드래그 시점, E 대화. 모바일: 조이스틱과 대화 버튼.

## 운영 범위
한 서버 프로세스에서 방마다 최대 24명입니다. `--workers 1`을 유지하고 여러 인스턴스로 늘리지 마세요. 접속 위치는 메모리에 있어 재시작 시 초기화되고, 학습 진행은 각 브라우저에 저장됩니다. 여러 서버로 확장하려면 공유 상태 서버가 추가로 필요합니다.
무료 Render 서버는 사용이 없으면 절전되므로 다음 첫 접속이 늦을 수 있습니다. 서버 재배포나 재시작 시 연결은 끊겼다가 클라이언트가 재연결합니다.

## 로컬 실행
Python 3.12 설치 후 이 폴더에서:
```
pip install -r requirements.txt
python -m uvicorn server:app --host 0.0.0.0 --port 8000 --workers 1
```
브라우저로 http://localhost:8000 접속. HTML 파일을 직접 더블클릭하면 모듈과 멀티플레이가 작동하지 않습니다.

기존 디자인과 학습 콘텐츠를 유지했습니다. 이 파일은 배포 준비본이며 실제 Render 계정 배포는 별도로 진행해야 합니다.
