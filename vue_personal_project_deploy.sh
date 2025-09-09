#!/bin/bash

echo "🚀 NAS 서버 배포 시작..."

# tar 파일 찾기 (날짜가 붙은 파일 포함)
TAR_FILE=$(ls vue_personal_project*.tar 2>/dev/null | head -1)

if [ -z "$TAR_FILE" ]; then
    echo "❌ vue_personal_project*.tar 파일을 찾을 수 없습니다!"
    echo "📁 현재 디렉토리에 tar 파일이 있는지 확인해주세요."
    exit 1
fi

echo "📦 발견된 tar 파일: $TAR_FILE"

# 5. NAS 경로로 이동하여 tar 파일 로드
echo "📦 5단계: Docker 이미지 로드 중..."
docker load -i "$TAR_FILE"

if [ $? -ne 0 ]; then
    echo "❌ Docker 이미지 로드 실패!"
    exit 1
fi
echo "✅ Docker 이미지 로드 완료!"

# 6. 이전 컨테이너 제거 후 컨테이너 실행 (포트 지정 포함)
echo "🔄 6단계: 컨테이너 재시작 중..."

# 기존 컨테이너 중지 및 제거
echo "⏹️  기존 컨테이너 중지..."
docker stop vue_personal_project 2>/dev/null || true
echo "🗑️  기존 컨테이너 제거..."
docker rm vue_personal_project 2>/dev/null || true

# 새 컨테이너 실행
echo "▶️  새 컨테이너 실행..."
docker run -d --name vue_personal_project -p 3100:80 vue_personal_project:latest

if [ $? -ne 0 ]; then
    echo "❌ 컨테이너 실행 실패!"
    exit 1
fi
echo "✅ 컨테이너 실행 완료!"

echo ""
echo "🎉 배포가 완료되었습니다!"
echo "🌐 http://your-nas-ip:3100 에서 확인하세요."
echo "📊 컨테이너 상태:"
docker ps | grep vue_personal_project 


