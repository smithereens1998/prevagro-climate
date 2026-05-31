$TaskName = "PrevagroDailyFull"
$ProjectPath = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$PythonExe = Join-Path $ProjectPath ".venv\Scripts\python.exe"
$ScriptPath = Join-Path $ProjectPath "scripts\run_daily_full.py"
$StartTime = "05:00"

if (!(Test-Path $PythonExe)) {
  Write-Error "Python virtual environment not found at $PythonExe"
  exit 1
}

$TaskCommand = "`"$PythonExe`" `"$ScriptPath`""

schtasks /Create `
  /TN $TaskName `
  /TR $TaskCommand `
  /SC DAILY `
  /ST $StartTime `
  /RL HIGHEST `
  /F

Write-Host "Task '$TaskName' created/updated to run daily at $StartTime."
