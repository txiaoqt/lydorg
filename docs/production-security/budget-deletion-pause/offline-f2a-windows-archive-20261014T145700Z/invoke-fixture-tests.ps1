# OFFLINE F2-A FIXTURE TESTS ONLY. Not a preflight or production entrypoint.
[CmdletBinding()]
param([switch]$CrashFixtureOnly,[ValidateSet('A','B')][string]$RaceFixtureOnly)
$ErrorActionPreference='Stop'
$expected='C:\Users\Christopher x Angel\Documents\lydo-connect-org-focused\docs\production-security\budget-deletion-pause\offline-f2a-windows-archive-20261014T145700Z'
if(-not [String]::Equals($PSScriptRoot,$expected,[StringComparison]::OrdinalIgnoreCase)){throw 'FIXED_CANDIDATE_DIRECTORY_REQUIRED'}
if($CrashFixtureOnly -and $RaceFixtureOnly){throw 'ONE_FIXTURE_MODE_ONLY'}
Add-Type -Path @((Join-Path $PSScriptRoot 'windows-archive-fixture.cs'),(Join-Path $PSScriptRoot 'windows-archive-fixture.tests.cs')) -ErrorAction Stop
if($CrashFixtureOnly){[YTraceF2A.FixtureTests]::CrashChildOnly();throw 'CRASH_CHILD_RETURNED'}
if($RaceFixtureOnly){[YTraceF2A.FixtureTests]::RaceChildOnly($RaceFixtureOnly);exit 0}
function New-FixtureChild([string[]]$ExtraArgs){
    $start=[Diagnostics.ProcessStartInfo]::new()
    $start.FileName='C:\Users\Christopher x Angel\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\powershell\pwsh.exe'
    $start.UseShellExecute=$false;$start.CreateNoWindow=$true
    $start.RedirectStandardOutput=$true;$start.RedirectStandardError=$true;$start.RedirectStandardInput=$true
    foreach($arg in @('-NoLogo','-NoProfile','-NonInteractive','-File',(Join-Path $PSScriptRoot 'invoke-fixture-tests.ps1'))+$ExtraArgs){$start.ArgumentList.Add($arg)}
    $start.WorkingDirectory=$PSScriptRoot
    $start.Environment.Clear()
    $start.Environment['SystemRoot']='C:\Windows';$start.Environment['WINDIR']='C:\Windows'
    $start.Environment['TEMP']=(Join-Path $PSScriptRoot 'compiler-temp');$start.Environment['TMP']=(Join-Path $PSScriptRoot 'compiler-temp')
    $child=[Diagnostics.Process]::new();$child.StartInfo=$start
    $null=$child.Start()
    return $child
}
Write-Output '# Actual Windows NTFS disposable-fixture suite; no production I/O'
[YTraceF2A.FixtureTests]::RunMainCases()
[YTraceF2A.FixtureTests]::RunDirectoryDestinationCase()
$session=[YTraceF2A.FixtureTests]::Session
# Preserve real Access-is-denied evidence from the two earlier revisions.
# No retry via an alternate API or privilege escalation; these properties remain BLOCKED.
Write-Output '# BLOCKED: actual junction/redirection and hardlink fixtures; creation was denied in preserved prior runs. No alternate attempt.'
[YTraceF2A.FixtureTests]::PrepareProcessRace()
$a=New-FixtureChild -ExtraArgs @('-RaceFixtureOnly','A')
$b=New-FixtureChild -ExtraArgs @('-RaceFixtureOnly','B')
$ea=$a.StandardError.ReadToEndAsync();$eb=$b.StandardError.ReadToEndAsync()
$readyA=$a.StandardOutput.ReadLineAsync();$readyB=$b.StandardOutput.ReadLineAsync()
if(-not $readyA.Wait(15000) -or -not $readyB.Wait(15000)){throw 'PROCESS_RACE_READY_TIMEOUT_UNRESOLVED_RETAIN_FIXTURES_NO_RETRY'}
if($readyA.Result -ne 'READY' -or $readyB.Result -ne 'READY'){throw 'PROCESS_RACE_READY_MISMATCH'}
$a.StandardInput.WriteLine('GO');$a.StandardInput.Flush();$a.StandardInput.Close()
$b.StandardInput.WriteLine('GO');$b.StandardInput.Flush();$b.StandardInput.Close()
$oa=$a.StandardOutput.ReadToEndAsync();$ob=$b.StandardOutput.ReadToEndAsync()
if(-not $a.WaitForExit(15000) -or -not $b.WaitForExit(15000)){throw 'PROCESS_RACE_EXIT_TIMEOUT_UNRESOLVED_RETAIN_FIXTURES_NO_RETRY'}
if($a.ExitCode -ne 0 -or $b.ExitCode -ne 0 -or $ea.GetAwaiter().GetResult().Length -ne 0 -or $eb.GetAwaiter().GetResult().Length -ne 0){throw 'PROCESS_RACE_CHILD_FAILED'}
[YTraceF2A.FixtureTests]::CheckProcessRace($oa.GetAwaiter().GetResult().Trim(),$ob.GetAwaiter().GetResult().Trim())
[YTraceF2A.FixtureTests]::PrepareCrashFixture()
$child=New-FixtureChild -ExtraArgs @('-CrashFixtureOnly')
$out=$child.StandardOutput.ReadToEndAsync();$err=$child.StandardError.ReadToEndAsync()
if(-not $child.WaitForExit(15000)){throw 'OFFLINE_CRASH_CHILD_TIMEOUT_UNRESOLVED_RETAIN_FIXTURES_NO_RETRY'}
$childOut=$out.GetAwaiter().GetResult();$childErr=$err.GetAwaiter().GetResult()
if($childErr.Length -ne 0){throw 'OFFLINE_CRASH_CHILD_STDERR_NONEMPTY'}
[YTraceF2A.FixtureTests]::CheckCrashResult($child.ExitCode,$childOut)
Write-Output ('1..'+[YTraceF2A.FixtureTests]::Total)
Write-Output ('# pass='+[YTraceF2A.FixtureTests]::Passed+' fail='+[YTraceF2A.FixtureTests]::Failed+' blockedProperties=2 fixtures-retained=true')
if([YTraceF2A.FixtureTests]::Failed -ne 0){exit 1}
exit 0
