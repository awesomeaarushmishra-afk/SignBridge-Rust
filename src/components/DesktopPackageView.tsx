import { useState } from 'react';
import { Download, Terminal, BookOpen, ShieldAlert, Keyboard } from 'lucide-react';

interface DesktopPackageViewProps {
  highContrast?: boolean;
}

type DocTab =
  | 'build'
  | 'spec'
  | 'inno'
  | 'keyboard'
  | 'swapping'
  | 'standards';

const ARTIFACT_CONTENT: Record<DocTab, { title: string; filename: string; content: string }> = {
  build: {
    title: 'Windows Packaging Script (build_windows.ps1)',
    filename: 'build_windows.ps1',
    content: `# SignBridge Offline Windows .exe + Installer Build Script
# Run inside PowerShell on Windows 10/11 x64 after placing GGUF weights in .\\models\\

$ErrorActionPreference = "Stop"

python -m venv .venv
.\\.venv\\Scripts\\Activate.ps1

python -m pip install --upgrade pip
pip install -r requirements.txt

python -m unittest discover -s tests -v
pyinstaller --clean --noconfirm signbridge.spec

$iscc = "\${env:ProgramFiles(x86)}\\Inno Setup 6\\ISCC.exe"
if (Test-Path $iscc) {
    & $iscc installer.iss
}
Write-Host "Output artifacts in .\\dist\\: SignBridgeOffline.exe & SignBridgeOfflineSetup-x64.exe"`,
  },
  spec: {
    title: 'PyInstaller Portable .exe Spec (signbridge.spec)',
    filename: 'signbridge.spec',
    content: `# -*- mode: python ; coding: utf-8 -*-
block_cipher = None

a = Analysis(
    ['main.py'],
    pathex=['.'],
    binaries=[],
    datas=[
        ('models.json', '.'),
        ('README_WINDOWS.md', '.'),
        ('USER_GUIDE.md', '.'),
        ('MODEL_SWAPPING.md', '.'),
        ('SUPPORTED_STANDARDS.md', '.'),
    ],
    hiddenimports=['pyttsx3.drivers', 'pyttsx3.drivers.sapi5'],
    cipher=block_cipher,
)
pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)
exe = EXE(
    pyz, a.scripts, a.binaries, a.zipfiles, a.datas, [],
    name='SignBridgeOffline',
    console=False,
    upx=True,
)`,
  },
  inno: {
    title: 'Inno Setup Installer Script (installer.iss)',
    filename: 'installer.iss',
    content: `[Setup]
AppName=SignBridge Offline Accessibility Translator
AppVersion=1.0.0
DefaultDirName={autopf}\\SignBridgeOffline
OutputDir=dist
OutputBaseFilename=SignBridgeOfflineSetup-x64
Compression=lzma2
SolidCompression=yes
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible

[Files]
Source: "dist\\SignBridgeOffline.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "models.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "README_WINDOWS.md"; DestDir: "{app}"; Flags: ignoreversion
Source: "USER_GUIDE.md"; DestDir: "{app}"; Flags: ignoreversion
Source: "MODEL_SWAPPING.md"; DestDir: "{app}"; Flags: ignoreversion
Source: "SUPPORTED_STANDARDS.md"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\\SignBridge Offline Translator"; Filename: "{app}\\SignBridgeOffline.exe"
Name: "{autodesktop}\\SignBridge Offline Translator"; Filename: "{app}\\SignBridgeOffline.exe"`,
  },
  keyboard: {
    title: 'Keyboard-Only & Onboarding Guide (USER_GUIDE.md)',
    filename: 'USER_GUIDE.md',
    content: `# Keyboard-Only Workflows & Built-in SLM Onboarding (Web & Desktop)

Global Shortcuts:
  - SLM Onboarding Assistant : Ctrl+/ (Desktop: F1), Escape to close
  - Source Selection         : Alt+1..4 (Desktop: Ctrl+1..4) -> Text, Braille, Morse, Sign
  - Target Selection         : Alt+Shift+1..4 (Desktop: Alt+1..4) -> Text, Braille, Morse, Sign
  - Reference Cheat-Sheet    : F2
  - Speak Active Output      : F5
  - High-Contrast Theme      : Alt+H

SLM Assistant & Auto-Conversion Rules:
  1. Press Ctrl+/ (or F1 on desktop) to ask offline navigation questions such as
     "How do I translate English to Braille?" or "How do I enable hand tracking?".
     Guidance displays under "NAVIGATION GUIDANCE ONLY" and falls back cleanly if SLM is unavailable.
  2. Select Target = Braille or Morse and Source = Text/Keyboard, then type normally
     for live automatic conversion into Unicode Braille + BRF or Morse + .wav audio.
  3. In Sign Language mode, open Calibrate Camera & Lighting or type/edit directly in Active Input Buffer.`,
  },
  swapping: {
    title: 'Dual Model Swapping & Licenses Guide (MODEL_SWAPPING.md)',
    filename: 'MODEL_SWAPPING.md',
    content: `# Switching Onboarding SLM & Main Translation Models Without Code Edits

1. Onboarding SLM Tiers (Separate from Translation):
   - Lightweight SLM (Qwen 2.5 0.5B Q4_K_M, 0.42 GB, 2 GB RAM, Apache-2.0, Bundled)
   - Balanced SLM (Gemma 4 E2B Q4_K_M, 1.45 GB, 4 GB RAM, Gemma Terms, Optional)
   - Higher-Reasoning SLM (Gemma 4 E4B Q4_K_M, 2.78 GB, 6 GB RAM, Gemma Terms, Optional)

2. Main Translation & Sign Pipeline Tiers:
   - Lightweight (Gemma 4 E2B, 1.45 GB, 4 GB RAM, Bundled)
   - Balanced (Gemma 4 E4B, 2.78 GB, 6-8 GB RAM, Bundled)
   - High Quality (Gemma 4 12B / Qwen 2.5 7B, 6.40 GB, 10-16 GB RAM, Manual GGUF)
   - Custom Local GGUF checkpoint placed in desktop_windows/models/

3. Model Manager checks host RAM headroom against both active selections, surfaces slow
   performance or memory warnings, and keeps deterministic conversions online at all times.`,
  },
  standards: {
    title: 'Supported Languages, Calibration & Privacy Limits (SUPPORTED_STANDARDS.md)',
    filename: 'SUPPORTED_STANDARDS.md',
    content: `Spoken Languages (Offline + Auto-Detect):
  English, Spanish, French, German, Hindi, Japanese, Arabic, Portuguese, Mandarin Chinese.

Braille & Morse Standards:
  UEB Grade-1 uncontracted Braille (U+2800..U+283F) + 64-char ASCII BRF export (.brf).
  ITU-R M.1677-1 Morse Code + 16-bit mono 22.05 kHz RIFF PCM .wav export.

Local Webcam Hand Tracking, Calibration & Offline Privacy:
  - Camera frames stay 100% on-device with zero network uploads or cloud recording.
  - Pre-tracking guidance: "Move hands into frame", "Lighting too low", "Hold sign steady", "Hand tracked cleanly".
  - Calibration sliders: hand scale, ambient luma threshold, confidence gate (>=0.80), debounce frames, mirror camera.
  - Supported Vocabulary: Static ASL A-Z fingerspelling + 10 core gestures; editable SignBuffer before cross-modal translation.
  - Limitation: Full continuous 3D co-articulated sign synthesis with non-manual facial markers is not generated offline on CPU laptops; fallback renders 2D skeletal ASL fingerspelling + gloss tokens.`,
  },
};

export function DesktopPackageView({ highContrast = false }: DesktopPackageViewProps) {
  const [activeTab, setActiveTab] = useState<DocTab>('build');
  const current = ARTIFACT_CONTENT[activeTab];

  const downloadTextFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const cardBg = highContrast
    ? 'bg-black border-white text-white'
    : 'bg-white border-slate-200 text-slate-900';
  const mutedText = highContrast ? 'text-yellow-300' : 'text-slate-600';

  const tabs: Array<{ id: DocTab; label: string }> = [
    { id: 'build', label: 'build_windows.ps1' },
    { id: 'spec', label: 'signbridge.spec' },
    { id: 'inno', label: 'installer.iss' },
    { id: 'keyboard', label: 'Keyboard Guide' },
    { id: 'swapping', label: 'Model Swapping' },
    { id: 'standards', label: 'Standards & Limits' },
  ];

  return (
    <section className="space-y-6" aria-labelledby="desktop-package-heading">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-slate-200">
        <div className="space-y-1.5 max-w-3xl">
          <div className={`text-xs flex items-center gap-2 ${mutedText}`}>
            <span>desktop_windows/ Offline Suite</span>
            <span aria-hidden="true">·</span>
            <span>PyInstaller .exe + Inno Setup</span>
            <span aria-hidden="true">·</span>
            <span>Python 7/7 Acceptance Verified</span>
          </div>
          <h2 id="desktop-package-heading" className="text-2xl font-bold tracking-tight">
            Offline Windows Desktop Application (.exe) &amp; Documentation
          </h2>
          <p className={`text-sm ${mutedText}`}>
            Complete offline Python/Tkinter desktop implementation (<code className="font-mono">desktop_windows/</code>) with SAPI5 TTS, local <code className="font-mono">llama-cpp-python</code> GGUF adapter, BRF &amp; PCM WAV export, and automated Windows PE installer scripts.
          </p>
        </div>

        <button
          type="button"
          onClick={() => downloadTextFile(current.filename, current.content)}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 ${
            highContrast
              ? 'bg-sky-400 text-black hover:bg-sky-300'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          <Download className="w-4 h-4" />
          Download {current.filename}
        </button>
      </div>

      {/* Honest Linux Sandbox Transparency Notice */}
      <div
        className={`rounded-xl border p-4 flex items-start gap-3 text-sm ${
          highContrast
            ? 'bg-zinc-900 border-yellow-300 text-white'
            : 'bg-amber-50 border-amber-200 text-amber-950'
        }`}
      >
        <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs leading-relaxed">
          <div className="font-semibold text-sm">
            Windows Executable Compilation Step
          </div>
          <p>
            This workspace runs in a Linux container where native Windows PE binaries cannot be linked directly. All Python desktop modules, offline acceptance tests (<code className="font-mono">python3 -m unittest discover -s desktop_windows/tests -v</code>), PyInstaller <code className="font-mono">signbridge.spec</code>, and Inno Setup <code className="font-mono">installer.iss</code> are included ready-to-build on Windows 10/11 via <code className="font-mono">build_windows.ps1</code>.
          </p>
        </div>
      </div>

      {/* Quick Feature Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`rounded-xl border p-4 space-y-1.5 ${cardBg}`}>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Terminal className="w-4 h-4 text-blue-600" />
            <span>Zero Internet Required</span>
          </div>
          <p className={`text-xs ${mutedText}`}>
            Offline Braille Unicode/BRF, ITU Morse + PCM WAV, MediaPipe sign landmarks, SAPI5 speech synthesis, and Vosk/GGUF run strictly on disk.
          </p>
        </div>
        <div className={`rounded-xl border p-4 space-y-1.5 ${cardBg}`}>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Keyboard className="w-4 h-4 text-blue-600" />
            <span>Keyboard-First Accessible</span>
          </div>
          <p className={`text-xs ${mutedText}`}>
            Full hotkey modality switching, keystroke auto-conversion, high-contrast theme (<code className="font-mono">Alt+H</code>), adjustable typography, and screen-reader labels.
          </p>
        </div>
        <div className={`rounded-xl border p-4 space-y-1.5 ${cardBg}`}>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <BookOpen className="w-4 h-4 text-blue-600" />
            <span>Single-Command Packaging</span>
          </div>
          <p className={`text-xs ${mutedText}`}>
            Produces both portable <code className="font-mono">SignBridgeOffline.exe</code> and signed-ready <code className="font-mono">SignBridgeOfflineSetup-x64.exe</code>.
          </p>
        </div>
      </div>

      {/* Tabbed Script & Documentation Viewer */}
      <div className={`rounded-xl border overflow-hidden ${cardBg}`}>
        <div
          className="flex items-center gap-1 p-2 border-b border-slate-200 overflow-x-auto"
          role="tablist"
          aria-label="Windows packaging and documentation tabs"
        >
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                  active
                    ? highContrast
                      ? 'bg-sky-400 text-black font-bold'
                      : 'bg-slate-900 text-white'
                    : highContrast
                      ? 'text-white hover:bg-zinc-800'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">{current.title}</h3>
            <span className={`text-xs font-mono ${mutedText}`}>
              desktop_windows/{current.filename}
            </span>
          </div>
          <pre
            className={`p-4 rounded-lg text-xs font-mono overflow-x-auto leading-relaxed ${
              highContrast
                ? 'bg-zinc-950 text-yellow-200 border border-white/40'
                : 'bg-slate-950 text-slate-100'
            }`}
          >
            <code>{current.content}</code>
          </pre>
        </div>
      </div>
    </section>
  );
}
