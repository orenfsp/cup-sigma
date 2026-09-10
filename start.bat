@echo off
chcp 65001 > nul
echo ====================================================
echo  Запуск платформы «Отклик» (FastAPI + Next.js)
echo ====================================================

start "Отклик - Бэкенд (FastAPI :8000)" cmd /k "%~dp0run_backend.bat"
timeout /t 2 > nul
start "Отклик - Фронтенд (Next.js :3000)" cmd /k "%~dp0run_frontend.bat"

echo.
echo Сервисы запускаются:
echo • Веб-приложение: http://localhost:3000
echo • Документация API: http://localhost:8000/docs
echo.
