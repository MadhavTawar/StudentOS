$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontend = Join-Path $root "frontend"
$envFile = Join-Path $root ".env"
$venvPython = Join-Path $root ".venv\Scripts\python.exe"
$processes = @()

function Stop-ProcessTree {
    param([int]$ProcessId)

    $children = Get-CimInstance Win32_Process -Filter "ParentProcessId = $ProcessId" -ErrorAction SilentlyContinue
    foreach ($child in $children) {
        Stop-ProcessTree -ProcessId $child.ProcessId
    }
    Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
}

if (-not (Test-Path $envFile)) {
    throw "Missing .env. From the repository root, run: Copy-Item .env.example .env"
}

$hasGoogleClientId = Select-String -Path $envFile -Pattern '^\s*GOOGLE_CLIENT_ID\s*=\s*[^#\s].*$' -Quiet
$hasGoogleClientSecret = Select-String -Path $envFile -Pattern '^\s*GOOGLE_CLIENT_SECRET\s*=\s*[^#\s].*$' -Quiet
if ($hasGoogleClientId -ne $hasGoogleClientSecret) {
    throw "Google OAuth is partially configured. Set both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env, or leave both empty for local mock mode."
}

if (-not (Test-Path $frontend)) {
    throw "Missing frontend directory: $frontend"
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    throw "Node.js/npm was not found. Install Node.js 20+ and reopen PowerShell."
}

if (Test-Path $venvPython) {
    $python = $venvPython
} else {
    $pythonCommand = Get-Command python -ErrorAction SilentlyContinue
    if (-not $pythonCommand) {
        throw "Python was not found. Install Python 3.12+ and reopen PowerShell."
    }
    $python = $pythonCommand.Source
}

& $python -c "import fastapi, uvicorn" 2>$null
if ($LASTEXITCODE -ne 0) {
    throw "Backend dependencies are missing. Run: $python -m pip install -r backend\requirements.txt"
}

if (-not (Test-Path (Join-Path $frontend "node_modules"))) {
    Write-Host "Frontend dependencies missing. Running npm install..."
    $npmInstall = Start-Process -FilePath $env:ComSpec `
        -ArgumentList @("/d", "/c", "npm install") `
        -WorkingDirectory $frontend -PassThru -Wait
    if ($npmInstall.ExitCode -ne 0) {
        throw "npm install failed in frontend directory."
    }
}

try {
    $backendProcess = Start-Process -FilePath $python `
        -ArgumentList @("-m", "uvicorn", "backend.app.main:app", "--host", "127.0.0.1", "--port", "8000", "--reload") `
        -WorkingDirectory $root -PassThru
    $processes += $backendProcess

    $frontendCommand = "npm run dev -- --host 127.0.0.1 --port 5173"
    $frontendProcess = Start-Process -FilePath $env:ComSpec `
        -ArgumentList @("/d", "/c", $frontendCommand) `
        -WorkingDirectory $frontend -PassThru
    $processes += $frontendProcess

    Write-Host "Backend:  http://127.0.0.1:8000 (logs in its process window)"
    Write-Host "Frontend: http://127.0.0.1:5173 (logs in its process window)"
    Write-Host "Press Ctrl+C here to stop both services."

    while ($true) {
        foreach ($process in $processes) {
            $process.Refresh()
            if ($process.HasExited) {
                throw "A development service exited with code $($process.ExitCode). Check its process window."
            }
        }
        Start-Sleep -Seconds 1
    }
} finally {
    foreach ($process in $processes) {
        Stop-ProcessTree -ProcessId $process.Id
    }
}
