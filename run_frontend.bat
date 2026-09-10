@echo off
chcp 65001 > nul
echo ====================================================
echo  Запуск веб-интерфейса «Отклик» (Next.js)
echo ====================================================

cd /d "%~dp0frontend"
call npm.cmd run dev
pause
