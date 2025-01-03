set BAT_FILE_PATH=%~dp0
cd %BAT_FILE_PATH%

call .\web.app\win.bat

set BAT_FILE_PATH=%~dp0
echo CD: %BAT_FILE_PATH
cd %BAT_FILE_PATH%
echo Current directory: %CD%

docker build -t aurga/web.app:latest -f Dockerfile .