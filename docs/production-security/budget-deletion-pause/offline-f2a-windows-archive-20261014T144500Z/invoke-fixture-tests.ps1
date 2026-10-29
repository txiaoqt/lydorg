# OFFLINE F2-A FIXTURE TESTS ONLY. Not a preflight or production entrypoint.
[CmdletBinding()]
param([switch]$CrashFixtureOnly)
$ErrorActionPreference='Stop'
$expected='C:\Users\Christopher x Angel\Documents\lydo-connect-org-focused\docs\production-security\budget-deletion-pause\offline-f2a-windows-archive-20261014T144500Z'
if(-not [String]::Equals($PSScriptRoot,$expected,[StringComparison]::OrdinalIgnoreCase)){throw 'FIXED_CANDIDATE_DIRECTORY_REQUIRED'}
Add-Type -Path @((Join-Path $PSScriptRoot 'windows-archive-fixture.cs'),(Join-Path $PSScriptRoot 'windows-archive-fixture.tests.cs')) -ErrorAction Stop
if($CrashFixtureOnly){[YTraceF2A.FixtureTests]::CrashChildOnly();throw 'CRASH_CHILD_RETURNED'}
Write-Output '# Actual Windows NTFS disposable-fixture suite; no production I/O'
[YTraceF2A.FixtureTests]::RunMainCases()
$redirect=[YTraceF2A.FixtureTests]::PrepareRedirectedDirectoryFixture()
$session=[YTraceF2A.FixtureTests]::Session
$null=New-Item -ItemType Junction -Path (Join-Path $session 'redirected-parent') -Value (Join-Path $session 'redirect-target') -ErrorAction Stop
[YTraceF2A.FixtureTests]::CheckRedirectedDirectory($redirect)
$destination=[YTraceF2A.FixtureTests]::PrepareDestinationJunctionFixture()
$null=New-Item -ItemType Junction -Path (Join-Path $session 'destination-junction\archive.bin') -Value (Join-Path $session 'destination-junction-target') -ErrorAction Stop
[YTraceF2A.FixtureTests]::CheckDestinationJunction($destination)
$hardlink=[YTraceF2A.FixtureTests]::PrepareHardlinkFixture()
$null=New-Item -ItemType HardLink -Path (Join-Path $session 'hardlink-source\alias.bin') -Value (Join-Path $session 'hardlink-source\source.bin') -ErrorAction Stop
[YTraceF2A.FixtureTests]::CheckHardlink($hardlink)
[YTraceF2A.FixtureTests]::PrepareCrashFixture()
$start=[Diagnostics.ProcessStartInfo]::new()
$start.FileName='C:\Users\Christopher x Angel\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\powershell\pwsh.exe'
$start.UseShellExecute=$false
$start.CreateNoWindow=$true
$start.RedirectStandardOutput=$true
$start.RedirectStandardError=$true
foreach($arg in @('-NoLogo','-NoProfile','-NonInteractive','-File',(Join-Path $PSScriptRoot 'invoke-fixture-tests.ps1'),'-CrashFixtureOnly')){$start.ArgumentList.Add($arg)}
$start.WorkingDirectory=$PSScriptRoot
$start.Environment.Clear()
$start.Environment['SystemRoot']='C:\Windows'
$start.Environment['WINDIR']='C:\Windows'
$start.Environment['TEMP']=(Join-Path $PSScriptRoot 'compiler-temp')
$start.Environment['TMP']=(Join-Path $PSScriptRoot 'compiler-temp')
$child=[Diagnostics.Process]::new()
$child.StartInfo=$start
$null=$child.Start()
$out=$child.StandardOutput.ReadToEndAsync()
$err=$child.StandardError.ReadToEndAsync()
if(-not $child.WaitForExit(20000)){
    $child.Kill($true)
    throw 'OFFLINE_CRASH_CHILD_TIMEOUT_UNRESOLVED_NO_RETRY_FIXTURES_RETAINED'
}
$childOut=$out.GetAwaiter().GetResult()
$childErr=$err.GetAwaiter().GetResult()
if($childErr.Length -ne 0){throw 'OFFLINE_CRASH_CHILD_STDERR_NONEMPTY'}
[YTraceF2A.FixtureTests]::CheckCrashResult($child.ExitCode,$childOut)
Write-Output ('1..'+[YTraceF2A.FixtureTests]::Total)
Write-Output ('# pass='+[YTraceF2A.FixtureTests]::Passed+' fail='+[YTraceF2A.FixtureTests]::Failed+' fixtures-retained=true')
if([YTraceF2A.FixtureTests]::Failed -ne 0){exit 1}
exit 0
