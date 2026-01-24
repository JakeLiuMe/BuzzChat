@echo off
setlocal enabledelayedexpansion

:: BuzzChat MCP Native Host Installer for Windows
:: This script registers the native messaging host with Chrome

echo =========================================
echo BuzzChat MCP Native Host Installer
echo =========================================
echo.

:: Get the directory where this script is located
set "SCRIPT_DIR=%~dp0"
set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"

:: Path to the bridge executable (relative to script)
set "BRIDGE_PATH=%SCRIPT_DIR%\..\mcp-server\build\index.js"

:: Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed or not in PATH.
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: Create the host manifest with correct path
set "MANIFEST_PATH=%SCRIPT_DIR%\com.buzzchat.mcp.json"
set "NODE_PATH="
for /f "delims=" %%i in ('where node') do set "NODE_PATH=%%i"

:: Prompt for Chrome extension ID
set /p EXTENSION_ID="Enter your BuzzChat Chrome extension ID: "

:: Create the manifest file
echo Creating native messaging host manifest...
(
echo {
echo   "name": "com.buzzchat.mcp",
echo   "description": "BuzzChat MCP Bridge - Enables AI assistant communication with BuzzChat Chrome extension",
echo   "path": "%NODE_PATH:\=\\%",
echo   "args": ["%BRIDGE_PATH:\=\\%"],
echo   "type": "stdio",
echo   "allowed_origins": [
echo     "chrome-extension://%EXTENSION_ID%/"
echo   ]
echo }
) > "%MANIFEST_PATH%"

echo Manifest created at: %MANIFEST_PATH%

:: Register with Chrome
echo.
echo Registering native messaging host with Chrome...

:: Check for Chrome registry key
reg query "HKCU\Software\Google\Chrome" >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    set "CHROME_KEY=HKCU\Software\Google\Chrome\NativeMessagingHosts\com.buzzchat.mcp"
) else (
    set "CHROME_KEY=HKCU\Software\Chromium\NativeMessagingHosts\com.buzzchat.mcp"
)

:: Add registry entry
reg add "%CHROME_KEY%" /ve /t REG_SZ /d "%MANIFEST_PATH%" /f

if %ERRORLEVEL% EQU 0 (
    echo.
    echo =========================================
    echo SUCCESS! Native messaging host installed.
    echo =========================================
    echo.
    echo The BuzzChat MCP server can now communicate
    echo with your Chrome extension.
    echo.
    echo Next steps:
    echo 1. Make sure the MCP server is built: cd mcp-server ^&^& npm install ^&^& npm run build
    echo 2. Restart Chrome
    echo 3. Configure your AI assistant to use buzzchat-mcp
) else (
    echo.
    echo ERROR: Failed to register native messaging host.
    echo You may need to run this script as Administrator.
)

echo.
pause
