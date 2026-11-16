# SignBridge Offline Windows .exe + Installer Build Script
# Run inside PowerShell on Windows 10/11 x64 after placing desired GGUF weights in .\models\

$ErrorActionPreference = "Stop"

Write-Host "==> 1. Creating Python virtual environment"
python -m venv .venv
.\.venv\Scripts\Activate.ps1

Write-Host "==> 2. Installing offline dependencies (preferring prebuilt CPU wheels)"
python -m pip install --upgrade pip
pip install --prefer-binary --extra-index-url https://abetlen.github.io/llama-cpp-python/whl/cpu "llama-cpp-python>=0.3.1"
pip install --prefer-binary -r requirements.txt

Write-Host "==> 3. Running offline acceptance test suite"
python -m unittest discover -s tests -v

Write-Host "==> 4. Building portable Windows executable (dist\SignBridgeOffline.exe)"
pyinstaller --clean --noconfirm signbridge.spec

Write-Host "==> 5. Assembling portable release folder (dist\portable\)"
New-Item -ItemType Directory -Force -Path dist\portable\models | Out-Null
Copy-Item dist\SignBridgeOffline.exe dist\portable\
Copy-Item models.json, README_WINDOWS.md, USER_GUIDE.md, MODEL_SWAPPING.md, SUPPORTED_STANDARDS.md dist\portable\
if (Test-Path models) {
    Copy-Item models\* dist\portable\models\ -Recurse -Force
}

$iscc = "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe"
if (Test-Path $iscc) {
    Write-Host "==> 6. Compiling Windows Setup Installer (dist\SignBridgeOfflineSetup-x64.exe)"
    & $iscc installer.iss
} else {
    Write-Host "==> Skipping Inno Setup: install Inno Setup 6 to generate SignBridgeOfflineSetup-x64.exe"
}

Write-Host "Build completed. Output artifacts in .\dist\ and .\dist\portable\"
