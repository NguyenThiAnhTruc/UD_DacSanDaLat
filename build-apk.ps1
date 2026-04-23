# Build Android APK Script
param(
    [string]$buildType = "debug"  # debug hoặc release
)

Write-Host "🔨 Building Android APK ($buildType)..." -ForegroundColor Green

# Set Java home (adjust path if different)
$javaHome = "C:\Program Files\Java\jdk-17.0.12"
$env:JAVA_HOME = $javaHome
$env:Path += ";$javaHome\bin"

# Verify Java
Write-Host "📍 Checking Java..." -ForegroundColor Cyan
java -version

# Navigate to android folder
cd "$PSScriptRoot\android"

# Clean (optional)
# .\gradlew.bat clean

# Build
Write-Host "⏳ Building APK..." -ForegroundColor Yellow
if ($buildType -eq "release") {
    .\gradlew.bat assembleRelease
    $apkPath = ".\app\build\outputs\apk\release\app-release.apk"
} else {
    .\gradlew.bat assembleDebug
    $apkPath = ".\app\build\outputs\apk\debug\app-debug.apk"
}

# Check result
if (Test-Path $apkPath) {
    $size = (Get-Item $apkPath).Length / 1MB
    Write-Host "✅ APK built successfully!" -ForegroundColor Green
    Write-Host "📦 File: $apkPath" -ForegroundColor Green
    Write-Host "📊 Size: $([math]::Round($size, 2)) MB" -ForegroundColor Green
} else {
    Write-Host "❌ Build failed!" -ForegroundColor Red
}
