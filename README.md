# vue_project

## Project setup
```
npm install
```

### Compiles and hot-reloads for development
```
npm run serve
```

### Compiles and minifies for production
```
npm run build
```

### Lints and fixes files
```
npm run lint
```

### git commit
```
git init
git add README.md
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/ParkHyunchang/vue_todoList.git
git push -u origin main


git add .
git commit -m "😤 뷰 첫 커밋 완료"
git push -u origin main
```

### Customize configuration
See [Configuration Reference](https://cli.vuejs.org/config/).

### 설치 패키지
```
npm install -g json-server
npm install axios
npm install vue-router
npm install lodash
npm install vuex@next --save
```

### 개발시 실행 명령어

1. 프론트엔드(Vue) 개발 서버 실행
    ```bash
    npm run serve
    ```

2. json-server(가짜 DB) 실행 (포트 3200)
    ```bash
    json-server --watch db.json --port 3200
    ```


### 로컬 실행
   
1. Docker 이미지 빌드를 실행
```bash
   docker build -t vue_personal_project .
```   
2. 만들어진 이미지 확인
```bash
   docker images
```   
3. 로컬에서 실행 테스트
```bash
   docker run -d -p 3100:80 vue_personal_project
```   
4. 브라우저
http://localhost:3100
접속해서 확인

### nas 초기 배포

1. 개발 툴 에서 루트경로에 tar 파일 생성
```bash
   docker save vue_personal_project -o vue_personal_project.tar
ex)
PS C:\Users\hyunc\personal_project\my-vue-project> docker save vue_personal_project -o vue_personal_project.tar
PS C:\Users\hyunc\personal_project\my-vue-project>

ex1)
PS C:\Users\hyunc\personal_project\my-vue-project> docker save vue_personal_project -o vue_personal_project.tar
error during connect: Get "http://%2F%2F.%2Fpipe%2FdockerDesktopLinuxEngine/v1.49/images/get?names=vue_personal_project": open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified.

이런 에러나면 desktop Docker 실행이 안되어 있어서 에러 난것임 
```

2. nas docker 에 tar 파일 업로드
```bash
   /volume1/docker$
   위 경로에! GUI에선 루트에 docker 폴더 있음
```

3. 업로드 후 ssh로 붙어서 이미지 로드
```bash
cd /volume1/docker
docker load -i vue_personal_project.tar
```

4. 컨테이너 실행
```bash
DSM 웹 → Docker 앱 실행

왼쪽 메뉴 [이미지] → vue_personal_project 확인

해당 이미지 선택 → [실행]

선택한 네트워크 사용
  birdge 선택 후 다음클릭

컨테이너 이름만 설정후 바로 다음클릭

포트설정
  로컬포트 : 3100
  컨테이너포트 : 80
  유형 : TCP

이제 쭉 다음 하면 완료


그 뒤 컨테이너 실행 후
http://시놀로지아이피:3100
접속해서 확인

실행 완료 후 접속 확인:
```


### nas 업데이트 판 배포

1. 로컬에서 업데이트 소스 빌드
```bash
npm run build
```

2. 도커이미지 다시 빌드
```bash
docker build -t vue_personal_project:latest .
```

3. 새 tar 파일로 저장
```bash
docker save vue_personal_project:latest -o vue_personal_project.tar
```


4. nas에 새 tar 파일 전송
```bash
방법 1: FileZilla FTP (평문)

방법 2: WinSCP

방법 3: CLI (scp)
```

5. NAS에서 기존 컨테이너 중지 및 삭제 (필수는 아님)

6. NAS에서 이미지 다시 로드
```bash
cd /volume1/docker
docker load -i vue_personal_project.tar
```

7. 컨테이너 삭제 후 재생성 (이게 일반적이고 안전함)
```bash
cd /volume1/docker
docker stop vue_personal_project
docker rm vue_personal_project
docker run -d --name vue_personal_project -p 3100:80 vue_personal_project:latest
```

7-1. DSM Docker GUI에서 컨테이너 새로 생성
```bash
또는 CLI로 직접 실행도 가능

docker run -d --name vue_personal_project_v2 -p 3100:80 vue_personal_project:latest
```