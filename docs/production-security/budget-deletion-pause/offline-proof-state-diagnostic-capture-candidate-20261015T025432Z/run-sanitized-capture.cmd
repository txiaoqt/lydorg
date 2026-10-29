@echo off
setlocal DisableDelayedExpansion
set "CAPTURE_SCRIPT=%~dp0capture-fixture-run.ps1"
"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoLogo -NoProfile -NonInteractive -File "%CAPTURE_SCRIPT%" >NUL 2>&1
set "CAPTURE_EXIT=%ERRORLEVEL%"
endlocal & exit /b %CAPTURE_EXIT%
