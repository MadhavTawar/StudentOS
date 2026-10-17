$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$venvPython = Join-Path $root ".venv\Scripts\python.exe"

if (Test-Path $venvPython) {
    $python = $venvPython
} else {
    $pythonCommand = Get-Command python -ErrorAction SilentlyContinue
    if (-not $pythonCommand) {
        throw "Python was not found. Install Python 3.12+ and reopen PowerShell."
    }
    $python = $pythonCommand.Source
}

& $python -c "import pytest" 2>$null
if ($LASTEXITCODE -ne 0) {
    throw "pytest is not installed for $python. Run: $python -m pip install -r backend\requirements.txt"
}

Push-Location $root
try {
    & $python -m pytest -o pythonpath=. -v backend\app\tests
    exit $LASTEXITCODE
} finally {
    Pop-Location
}
