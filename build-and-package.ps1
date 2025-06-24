# PowerShell script for Vue project build and packaging (English messages)

chcp 65001 > $null
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "🚀 Starting Vue project build and packaging..."

# 1. Vue app build
Write-Host "📦 Step 1: Building Vue app..."
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!"
    exit 1
}
Write-Host "✅ Build complete!"

# 2. Docker image build and container run
Write-Host "🐳 Step 2: Building Docker image and running container..."
docker-compose up -d --build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker build failed!"
    exit 1
}
Write-Host "✅ Docker build complete!"

# 3. Create tar file
Write-Host "📦 Step 3: Creating tar file..."
docker save vue_personal_project:latest -o vue_personal_project.tar
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Tar file creation failed!"
    exit 1
}
Write-Host "✅ Tar file created!"

Write-Host ""
Write-Host "🎉 All steps completed!"
Write-Host "📁 Please transfer vue_personal_project.tar to your NAS."
Write-Host "📋 Next: Run deploy.sh on your NAS." 