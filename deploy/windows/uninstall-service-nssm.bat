@echo off
setlocal

net session >nul 2>nul
if errorlevel 1 (
  echo Run this file as Administrator.
  exit /b 1
)

set NSSM_EXE=
if exist "%~dp0nssm.exe" set NSSM_EXE=%~dp0nssm.exe

if not defined NSSM_EXE (
  for /f "delims=" %%I in ('where nssm 2^>nul') do (
    if not defined NSSM_EXE set NSSM_EXE=%%I
  )
)

if not defined NSSM_EXE (
  echo nssm.exe was not found.
  exit /b 1
)

"%NSSM_EXE%" stop ExamList
"%NSSM_EXE%" remove ExamList confirm

echo ExamList service removed.
