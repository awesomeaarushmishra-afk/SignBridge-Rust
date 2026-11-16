# -*- mode: python ; coding: utf-8 -*-
# PyInstaller spec to bundle SignBridge Offline Accessibility Translator into a Windows .exe

from PyInstaller.utils.hooks import collect_all

block_cipher = None

datas = [
    ('models.json', '.'),
    ('README_WINDOWS.md', '.'),
    ('USER_GUIDE.md', '.'),
    ('MODEL_SWAPPING.md', '.'),
    ('SUPPORTED_STANDARDS.md', '.'),
]
binaries = []
hiddenimports = ['pyttsx3.drivers', 'pyttsx3.drivers.sapi5']

for pkg in ('llama_cpp', 'mediapipe', 'vosk'):
    try:
        pkg_datas, pkg_binaries, pkg_hidden = collect_all(pkg)
        datas += pkg_datas
        binaries += pkg_binaries
        hiddenimports += pkg_hidden
    except Exception:
        pass

a = Analysis(
    ['main.py'],
    pathex=['.'],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='SignBridgeOffline',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    target_arch=None,
)
