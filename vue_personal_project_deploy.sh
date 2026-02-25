#!/bin/bash
# ──────────────────────────────────────────────────────────────────────────────
# 프론트엔드 수동 배포 스크립트 (레지스트리 pull 방식)
# GitHub Actions가 자동 배포하지만, 수동으로 재배포가 필요할 때 사용
#
# 사용법:
#   GHCR_PAT=<토큰> GITHUB_ACTOR=<깃허브아이디> ./vue_personal_project_deploy.sh
# ──────────────────────────────────────────────────────────────────────────────

set -e

IMAGE_NAME="${IMAGE_NAME:-ghcr.io/parkhyunchang/my-vue-project:latest}"

echo "🚀 프론트엔드 배포 시작..."

# GHCR 로그인 (환경변수로 토큰 전달)
if [ -n "$GHCR_PAT" ] && [ -n "$GITHUB_ACTOR" ]; then
    echo "🔐 GHCR 로그인 중..."
    echo "$GHCR_PAT" | docker login ghcr.io -u "$GITHUB_ACTOR" --password-stdin
else
    echo "⚠️  GHCR_PAT 또는 GITHUB_ACTOR 환경변수가 설정되지 않았습니다."
    echo "   이미 로그인되어 있다면 계속 진행합니다..."
fi

echo "📦 이미지 pull 중: $IMAGE_NAME"
docker pull "$IMAGE_NAME"

echo "🔄 컨테이너 재시작 중..."
docker stop vue_personal_project 2>/dev/null || true
docker rm vue_personal_project 2>/dev/null || true

docker run -d \
  --name vue_personal_project \
  --restart unless-stopped \
  -p 3100:80 \
  "$IMAGE_NAME"

docker image prune -f

echo ""
echo "🎉 배포가 완료되었습니다!"
echo "🌐 http://$(hostname -I | awk '{print $1}'):3100 에서 확인하세요."
echo ""
echo "📊 컨테이너 상태:"
docker ps | grep vue_personal_project
