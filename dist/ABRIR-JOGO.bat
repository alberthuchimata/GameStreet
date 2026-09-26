@echo off
title Miami Fighter - Servidor Local
start "" /b node server.cjs
timeout /t 1 /nobreak >nul
start "" http://127.0.0.1:8787
echo Deixe esta janela aberta enquanto estiver jogando.
pause
