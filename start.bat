@echo off
cd /d "%~dp0"
start "Yahtzee Server" cmd /k "node server.js"
