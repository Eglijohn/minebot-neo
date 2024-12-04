@echo off
title Creating Files...


if not exist config mkdir config

echo [ > config\ACCOUNT.json
echo     { >> config\ACCOUNT.json
echo         "username": "", >> config\ACCOUNT.json
echo         "auth": "" >> config\ACCOUNT.json
echo     } >> config\ACCOUNT.json
echo ] >> config\ACCOUNT.json

echo { > config\CONFIG.json
echo     "host": "", >> config\CONFIG.json
echo     "version": "", >> config\CONFIG.json
echo     "port": 6969, >> config\CONFIG.json
echo     "owner": "", >> config\CONFIG.json
echo     "customStartMsg": "", >> config\CONFIG.json
echo     "noChat": false, >> config\CONFIG.json
echo     "needsPort": false, >> config\CONFIG.json
echo     "experimentalFeatures": false, >> config\CONFIG.json
echo     "processquit": true, >> config\CONFIG.json
echo     "consoleCounter": true, >> config\CONFIG.json
echo     "autoLog": false, >> config\CONFIG.json
echo     "chatLogMethod": "normal" >> config\CONFIG.json
echo } >> config\CONFIG.json

del FIRSTRUN.bat