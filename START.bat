:: Who's the skibidiest of them all? Sentoljaard, he owns us all!
@echo off
title Minebot NEO Terminal

node --no-deprecation "%~dp0/./src/index.mjs"
node "%~dp0/./config/ACCOUNT.json" "%~dp0/./config/INFO.json"

pause