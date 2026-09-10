@echo off
chcp 65001 > nul
echo ====================================================
echo  Запуск бэкенда платформы «Отклик» (FastAPI)
echo ====================================================

cd /d "%~dp0backend"
if exist "..\venv\Scripts\python.exe" (
    ..\venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
) else (
    python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
)
pause
