# vue_project

## Project setup
```bash
npm install
```

### Compiles and hot-reloads for development
```bash
npm run serve
```

### Compiles and minifies for production
```bash
npm run build
```

### Lints and fixes files
```bash
npm run lint
```

### git commit
```bash
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
```bash
npm install axios
npm install vue-router
npm install lodash
npm install vuex@next --save
npm install @studio-freight/lenis
```

### 개발시 실행 명령어

1. 백엔드 서버 실행 (Spring Boot)
```bash
# my-vue-project-backend 디렉토리에서
./mvnw spring-boot:run
```
   
2. 프론트엔드(Vue) 개발 서버 실행
```bash
npm run serve
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

docker-compose.yml 만들어서 아래 명령어로 해결

```bash
# 1. 최신 빌드 -> Vue 앱을 정적 파일로 컴파일 (dist/ 생성)
npm run build
   
# 2. 컨테이너 재시작 포함 빌드 -> dist 폴더를 포함해 Docker 이미지 생성 + 컨테이너 실행
docker-compose up -d --build
   
# 3. tar 파일 생성
docker save vue_personal_project:latest -o vue_personal_project.tar

# 4. 생성한 tar 파일 nas 로 전송
   
# 5. NAS 경로로 이동하여 tar 파일 로드
cd /volume1/docker
docker load -i vue_personal_project.tar
   
# 6. 이전 컨테이너 제거 후 컨테이너 실행 (포트 지정 포함)
docker stop vue_personal_project
docker rm vue_personal_project
docker run -d --name vue_personal_project -p 3100:80 vue_personal_project:latest
```


### nas 업데이트 간략화화


```bash
# 1. 빌드 및 tar 파일 생성 쉘 실행 (단 도커데스크탑 실행하고 이거 실행해야 에러안남!)
./build-and-package.ps1

# 2. 생성된 tar 파일 서버로 전송 (서버경로 : cd /volume1/docker)

# 3. 서버에서 배포 쉘 실행 (서버경로 : cd /volume1/docker)
./vue_personal_project_deploy.sh
```