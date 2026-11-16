; Inno Setup Script for SignBridge Offline Windows Installer (.exe)
[Setup]
AppName=SignBridge Offline Accessibility Translator
AppVersion=1.0.0
AppPublisher=SignBridge Open Accessibility
DefaultDirName={autopf}\SignBridgeOffline
DefaultGroupName=SignBridge Offline
OutputDir=dist
OutputBaseFilename=SignBridgeOfflineSetup-x64
Compression=lzma2
SolidCompression=yes
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible

[Files]
Source: "dist\SignBridgeOffline.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "models.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "README_WINDOWS.md"; DestDir: "{app}"; Flags: ignoreversion
Source: "USER_GUIDE.md"; DestDir: "{app}"; Flags: ignoreversion
Source: "MODEL_SWAPPING.md"; DestDir: "{app}"; Flags: ignoreversion
Source: "SUPPORTED_STANDARDS.md"; DestDir: "{app}"; Flags: ignoreversion
; Bundled local GGUF weights directory (includes README guide + any .gguf placed in models\ before build):
Source: "models\*"; DestDir: "{app}\models"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\SignBridge Offline Translator"; Filename: "{app}\SignBridgeOffline.exe"
Name: "{autodesktop}\SignBridge Offline Translator"; Filename: "{app}\SignBridgeOffline.exe"

[Run]
Filename: "{app}\SignBridgeOffline.exe"; Description: "Launch SignBridge Offline"; Flags: nowait postinstall skipifsilent
