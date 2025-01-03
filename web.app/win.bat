set BAT_FILE_PATH=%~dp0
cd %BAT_FILE_PATH%
set MSYS2_BASH=C:\Program Files\Git\bin\bash.exe
"%MSYS2_BASH%" -c "bash update_win.sh"

cd %BAT_FILE_PATH%
call npm install
call npx vite build
cd %BAT_FILE_PATH%
"%MSYS2_BASH%" -c "bash win.sh"