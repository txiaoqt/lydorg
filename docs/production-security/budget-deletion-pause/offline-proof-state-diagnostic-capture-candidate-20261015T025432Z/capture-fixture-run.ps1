# NON-RUNNABLE — NOT AUTHORIZED. Intended for one future, separately authorized
# local synthetic-fixture run through run-sanitized-capture.cmd only.
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$script:failureCode = 40
$script:phaseCode = 40
$script:fixtureDirectory = $null
$script:fixtureCreated = $false
$script:child = $null
$script:sourceStream = $null
$script:harnessStream = $null
$script:helperStream = $null
$script:cleanupPassed = $true
$script:sourceHashBefore = $null
$script:harnessHashBefore = $null
$script:sourceHashAfter = $null
$script:harnessHashAfter = $null
$script:filteredLines = @()
$script:stdoutSuppressed = 0
$script:stderrSuppressed = 0
$script:filterRejected = $false
$script:tapFailCount = 0
$script:runId = [Guid]::NewGuid().ToString('N')
$script:startedAtUtc = $null
$script:endedAtUtc = $null

function Assert-ExistingPathHasNoReparseComponents([string]$Path) {
  $cursor = [IO.Path]::GetFullPath($Path)
  while ($true) {
    if (-not ([IO.File]::Exists($cursor) -or [IO.Directory]::Exists($cursor))) {
      throw 'PATH_COMPONENT_MISSING'
    }
    $item = Get-Item -LiteralPath $cursor -Force
    if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
      throw 'PATH_REPARSE_POINT'
    }
    $parent = [IO.Path]::GetDirectoryName($cursor)
    if ([string]::IsNullOrEmpty($parent) -or $parent -eq $cursor) { break }
    $cursor = $parent
  }
}

function Assert-ContainedPath([string]$Path, [string]$Parent) {
  $full = [IO.Path]::GetFullPath($Path)
  $parentFull = [IO.Path]::GetFullPath($Parent).TrimEnd('\') + '\'
  if (-not $full.StartsWith($parentFull, [StringComparison]::OrdinalIgnoreCase)) {
    throw 'PATH_OUTSIDE_FIXED_PACKAGE'
  }
  return $full
}

function Get-StreamSha256([IO.FileStream]$Stream) {
  $Stream.Position = 0
  $sha = [Security.Cryptography.SHA256]::Create()
  try {
    $bytes = $sha.ComputeHash($Stream)
    return ([BitConverter]::ToString($bytes).Replace('-', '').ToLowerInvariant())
  } finally {
    $sha.Dispose()
    $Stream.Position = 0
  }
}

function Get-UtcStamp {
  return [DateTimeOffset]::UtcNow.ToString("yyyy-MM-dd'T'HH:mm:ss.fff'Z'", [Globalization.CultureInfo]::InvariantCulture)
}

function Get-FilteredHarnessLines([string[]]$RawLines) {
  $knownCases = @(
    'per-run root is generated beneath Temp',
    'archive preserves bytes identity ACL owner and times',
    'pre-existing archive destination is retained',
    'changed source identity is rejected before submission',
    'binding from a different parent is rejected',
    'replacement parent identity is rejected',
    'concurrent no-overwrite contenders preserve exactly one winner',
    'pre-submit stop leaves source and performs zero submissions',
    'post-kernel ambiguity is retained and never retried',
    'hardlink source rejected when unprivileged fixture is available',
    'reparse directory rejected when unprivileged fixture is available',
    'proof accepts exact five fields and inherits fixture ACL read-only',
    'exact 300-second proof age is accepted',
    '301-second proof age is rejected',
    'future proof timestamp is rejected',
    'timezone-free proof timestamp is rejected',
    'additional credential-like field is rejected before file creation',
    'create-new collision retains existing proof bytes',
    'pre-create stop writes nothing and has zero attempts',
    'failure after exclusive create retains empty file without retry',
    'partial proof write remains present and unresolved',
    'post-flush uncertainty retains complete proof without claiming success'
  )
  $accepted = [Collections.Generic.List[string]]::new()
  $taps = [Collections.Generic.List[object]]::new()
  $suppressed = 0
  $rejected = $false
  $planCount = 0
  $planNumber = -1
  $summaryCount = 0
  $summary = $null

  foreach ($line in $RawLines) {
    $m = [regex]::Match($line, '^(ok|not ok) ([0-9]{1,2}) - (.+)$')
    if ($m.Success) {
      $number = [int]$m.Groups[2].Value
      $tail = $m.Groups[3].Value
      $caseName = $null
      $isSkip = $false
      $isFailure = $false
      if ($m.Groups[1].Value -ceq 'ok') {
        $skipMatch = [regex]::Match($tail, '^(.+) # SKIP .+$')
        if ($skipMatch.Success) {
          $caseName = $skipMatch.Groups[1].Value
          $isSkip = $true
        } else {
          $caseName = $tail
        }
      } else {
        $failureMatch = [regex]::Match($tail, '^(.+) \[ASSERTION_FAILED\] .+$')
        if ($failureMatch.Success) {
          $caseName = $failureMatch.Groups[1].Value
          $isFailure = $true
        }
      }
      if ($number -ge 1 -and $number -le 22 -and $knownCases -ccontains $caseName) {
        if ($m.Groups[1].Value -ceq 'ok' -and -not $isSkip) {
          $accepted.Add(('ok {0} - {1}' -f $number, $caseName))
          $taps.Add([pscustomobject]@{ Number = $number; Kind = 'pass' })
        } elseif ($isSkip) {
          $accepted.Add(('ok {0} - {1} # SKIP [REASON_SUPPRESSED]' -f $number, $caseName))
          $taps.Add([pscustomobject]@{ Number = $number; Kind = 'blocked' })
        } elseif ($isFailure) {
          $accepted.Add(('not ok {0} - {1} [ASSERTION_FAILED] [DETAILS_SUPPRESSED]' -f $number, $caseName))
          $taps.Add([pscustomobject]@{ Number = $number; Kind = 'fail' })
        } else {
          $suppressed++
          $rejected = $true
        }
        continue
      }
    }

    if ($line -ceq '1..22') {
      $planCount++
      $planNumber = 22
      $accepted.Add($line)
      continue
    }
    $summaryMatch = [regex]::Match($line, '^# SUMMARY pass=([0-9]{1,2}) fail=([0-9]{1,2}) blocked=([0-9]{1,2})$')
    if ($summaryMatch.Success) {
      $summaryCount++
      $summary = [pscustomobject]@{
        Pass = [int]$summaryMatch.Groups[1].Value
        Fail = [int]$summaryMatch.Groups[2].Value
        Blocked = [int]$summaryMatch.Groups[3].Value
      }
      $accepted.Add($line)
      continue
    }

    if ($line -match '^not ok - harness \[(HARNESS_FAILED|CLEANUP_FAILED)\] .+$') {
      $code = [regex]::Match($line, '^not ok - harness \[([A-Z_]+)\]').Groups[1].Value
      $accepted.Add(('not ok - harness [{0}] [DETAILS_SUPPRESSED]' -f $code))
      $suppressed++
      continue
    }

    if ($line -match '^# (EXPECTED_FAULT_DIAG|ARCHIVE_DIAG|RACE_DIAG|PRE_SUBMIT_DIAG|UNCERTAIN_DIAG|FAILURE_CODES|retained synthetic fixture cases:|FIXTURE_ROOT_ENTRY_COUNT |FIXTURE_ROOT_ENTRIES )') {
      $suppressed++
      continue
    }

    $suppressed++
    $rejected = $true
  }

  $ordered = @($taps | Sort-Object Number)
  if ($planCount -ne 1 -or $summaryCount -ne 1 -or $null -eq $summary) { $rejected = $true }
  if ($planCount -eq 1) {
    if ($ordered.Count -ne $planNumber) { $rejected = $true }
    for ($i = 0; $i -lt $ordered.Count; $i++) {
      if ($ordered[$i].Number -ne ($i + 1)) { $rejected = $true }
    }
    if ($summaryCount -eq 1) {
      $passTaps = @($ordered | Where-Object { $_.Kind -eq 'pass' }).Count
      $failTaps = @($ordered | Where-Object { $_.Kind -eq 'fail' }).Count
      $blockedTaps = @($ordered | Where-Object { $_.Kind -eq 'blocked' }).Count
      if ($summary.Pass -ne $passTaps -or $summary.Fail -ne $failTaps -or $summary.Blocked -ne $blockedTaps) { $rejected = $true }
    }
  }
  if ($summaryCount -eq 1 -and ($summary.Pass + $summary.Fail + $summary.Blocked) -ne $planNumber) { $rejected = $true }

  return [pscustomobject]@{
    Lines = @($accepted.ToArray())
    Suppressed = $suppressed
    Rejected = $rejected
    PlanCount = $planCount
    PlanNumber = $planNumber
    SummaryCount = $summaryCount
    Summary = $summary
  }
}

try {
  $script:phaseCode = 40
  if ($args.Count -ne 0) { throw 'ARGUMENTS_NOT_ACCEPTED' }

  $packageRoot = [IO.Path]::GetFullPath($PSScriptRoot)
  Assert-ExistingPathHasNoReparseComponents $packageRoot
  $scriptPath = [IO.Path]::GetFullPath($MyInvocation.MyCommand.Path)
  $helperPath = [IO.Path]::GetFullPath([IO.Path]::Combine($packageRoot, 'bounded-child-capture.cs'))
  $sourcePath = [IO.Path]::GetFullPath([IO.Path]::Combine($packageRoot, 'proof-file-fixtures.cs'))
  $harnessPath = [IO.Path]::GetFullPath([IO.Path]::Combine($packageRoot, 'invoke-fixture-tests.ps1'))
  foreach ($fixedPath in @($scriptPath, $helperPath, $sourcePath, $harnessPath)) {
    Assert-ContainedPath $fixedPath $packageRoot | Out-Null
    Assert-ExistingPathHasNoReparseComponents $fixedPath
  }

  $script:phaseCode = 41
  $script:helperStream = [IO.File]::Open($helperPath, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::Read)
  $helperHash = Get-StreamSha256 $script:helperStream
  if ($helperHash -cne '2fcac2deb296b66e45eb15912972acb1c30cf6266b3ad64fa40eae8890074418') { throw 'HELPER_HASH_MISMATCH' }

  $script:sourceStream = [IO.File]::Open($sourcePath, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::Read)
  $script:harnessStream = [IO.File]::Open($harnessPath, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::Read)
  $script:sourceHashBefore = Get-StreamSha256 $script:sourceStream
  $script:harnessHashBefore = Get-StreamSha256 $script:harnessStream
  if ($script:sourceHashBefore -cne '275e4f8e40b94d19ae1f275d73f652ee04be98715c2a98fa78914b34bcb89476' -or
      $script:harnessHashBefore -cne 'aa0b260aafeb763e0daa82e7a711317c2db2e4c81b8923e368cb4fa47d6bb33f') {
    throw 'PINNED_INPUT_HASH_MISMATCH'
  }

  Add-Type -Path $helperPath -ErrorAction Stop | Out-Null
  $script:phaseCode = 42
  $windowsDirectory = [IO.Path]::GetFullPath([Environment]::GetFolderPath([Environment+SpecialFolder]::Windows))
  $powershellHome = [IO.Path]::GetFullPath([IO.Path]::Combine($windowsDirectory, 'System32\WindowsPowerShell\v1.0'))
  $executable = [IO.Path]::Combine($powershellHome, 'powershell.exe')
  if (-not [string]::Equals([IO.Path]::GetFullPath($PSHOME), $powershellHome, [StringComparison]::OrdinalIgnoreCase)) { throw 'HOST_IDENTITY_MISMATCH' }
  foreach ($fixedPath in @($windowsDirectory, $powershellHome, $executable)) { Assert-ExistingPathHasNoReparseComponents $fixedPath }

  $fixtureRoot = [IO.Path]::Combine($packageRoot, 'test-fixtures')
  Assert-ContainedPath $fixtureRoot $packageRoot | Out-Null
  if (-not [IO.Directory]::Exists($fixtureRoot)) {
    if ([IO.File]::Exists($fixtureRoot) -or -not [YTraceOfflineCapture.BoundedChildCapture]::CreateDirectoryExclusive($fixtureRoot)) {
      throw 'FIXTURE_PARENT_CREATE_FAILED'
    }
  }
  Assert-ExistingPathHasNoReparseComponents $fixtureRoot
  if (-not [IO.Directory]::Exists($fixtureRoot)) { throw 'FIXTURE_PARENT_MISSING' }

  $script:fixtureDirectory = [IO.Path]::GetFullPath([IO.Path]::Combine($fixtureRoot, $script:runId))
  Assert-ContainedPath $script:fixtureDirectory $fixtureRoot | Out-Null
  if ([IO.Directory]::Exists($script:fixtureDirectory) -or [IO.File]::Exists($script:fixtureDirectory)) { throw 'FIXTURE_DESTINATION_EXISTS' }
  if (-not [YTraceOfflineCapture.BoundedChildCapture]::CreateDirectoryExclusive($script:fixtureDirectory)) { throw 'FIXTURE_CREATE_NEW_FAILED' }
  $script:fixtureCreated = $true
  Assert-ExistingPathHasNoReparseComponents $script:fixtureDirectory
  if (@([IO.Directory]::GetFileSystemEntries($script:fixtureDirectory)).Count -ne 0) { throw 'FIXTURE_NOT_EMPTY_AFTER_CREATE' }

  $script:phaseCode = 43
  $script:startedAtUtc = Get-UtcStamp
  $script:child = [YTraceOfflineCapture.BoundedChildCapture]::Run(
    $executable, $harnessPath, $packageRoot, $script:fixtureDirectory, $windowsDirectory, $powershellHome)
  if ($null -eq $script:child -or -not $script:child.CaptureComplete -or -not $script:child.HasExitCode) { throw 'CHILD_CAPTURE_INCOMPLETE' }
  $script:sourceHashAfter = Get-StreamSha256 $script:sourceStream
  $script:harnessHashAfter = Get-StreamSha256 $script:harnessStream
  if ($script:sourceHashAfter -cne $script:sourceHashBefore -or $script:harnessHashAfter -cne $script:harnessHashBefore) { throw 'INPUT_CHANGED_DURING_CAPTURE' }

  $script:phaseCode = 44
  $filtered = Get-FilteredHarnessLines $script:child.StandardOutput.Lines
  $script:filteredLines = $filtered.Lines
  $script:stdoutSuppressed = $script:child.StandardOutput.SuppressedLineCount + $filtered.Suppressed
  $script:stderrSuppressed = $script:child.StandardError.SuppressedLineCount
  $script:filterRejected = $filtered.Rejected
  if ($filtered.SummaryCount -eq 1) { $script:tapFailCount = [int]$filtered.Summary.Fail }
  $script:failureCode = 0
} catch {
  $script:failureCode = $script:phaseCode
} finally {
  if ($null -ne $script:sourceStream) { try { $script:sourceStream.Dispose() } catch { $script:cleanupPassed = $false } }
  if ($null -ne $script:harnessStream) { try { $script:harnessStream.Dispose() } catch { $script:cleanupPassed = $false } }
  if ($null -ne $script:helperStream) { try { $script:helperStream.Dispose() } catch { $script:cleanupPassed = $false } }

  if ($script:fixtureCreated) {
    try {
      if ($null -eq $script:child -or -not $script:child.ProcessTerminated -or -not $script:child.CaptureComplete -or $script:child.TimedOut) {
        $script:cleanupPassed = $false
      } else {
        Assert-ContainedPath $script:fixtureDirectory ([IO.Path]::Combine($PSScriptRoot, 'test-fixtures')) | Out-Null
        Assert-ExistingPathHasNoReparseComponents $script:fixtureDirectory
        $entries = @([IO.Directory]::GetFileSystemEntries($script:fixtureDirectory))
        if ($entries.Count -ne 0) {
          $script:cleanupPassed = $false
        } else {
          [IO.Directory]::Delete($script:fixtureDirectory, $false)
          if ([IO.Directory]::Exists($script:fixtureDirectory) -or [IO.File]::Exists($script:fixtureDirectory)) { $script:cleanupPassed = $false }
        }
      }
    } catch {
      $script:cleanupPassed = $false
    }
  }
}

if (-not $script:cleanupPassed) { exit 47 }
if ($script:failureCode -ne 0) { exit $script:failureCode }
if ($null -eq $script:child -or -not $script:child.ProcessTerminated -or $script:child.TimedOut) { exit 45 }

$script:phaseCode = 48
try {
  $script:endedAtUtc = Get-UtcStamp
  $evidenceRoot = [IO.Path]::GetFullPath([IO.Path]::Combine($PSScriptRoot, 'capture-evidence'))
  Assert-ContainedPath $evidenceRoot $PSScriptRoot | Out-Null
  if (-not [IO.Directory]::Exists($evidenceRoot)) { $null = [IO.Directory]::CreateDirectory($evidenceRoot) }
  Assert-ExistingPathHasNoReparseComponents $evidenceRoot
  $evidencePath = [IO.Path]::Combine($evidenceRoot, $script:runId + '.json')
  if ([IO.File]::Exists($evidencePath) -or [IO.Directory]::Exists($evidencePath)) { throw 'EVIDENCE_DESTINATION_EXISTS' }
  $evidence = [ordered]@{
    runId = $script:runId
    startedAtUtc = $script:startedAtUtc
    endedAtUtc = $script:endedAtUtc
    childExitCode = [int]$script:child.ExitCode
    filteredHarnessOutput = @($script:filteredLines)
    stderrPresent = [bool]$script:child.StandardError.HadData
    suppressedStdoutLines = [int]$script:stdoutSuppressed
    suppressedStderrLines = [int]$script:stderrSuppressed
    sourceSha256Before = $script:sourceHashBefore
    sourceSha256After = $script:sourceHashAfter
    harnessSha256Before = $script:harnessHashBefore
    harnessSha256After = $script:harnessHashAfter
  }
  $json = ConvertTo-Json -InputObject $evidence -Depth 4 -Compress
  $bytes = [Text.UTF8Encoding]::new($false).GetBytes($json)
  $sha = [Security.Cryptography.SHA256]::Create()
  try { $expectedEvidenceHash = [BitConverter]::ToString($sha.ComputeHash($bytes)).Replace('-', '').ToLowerInvariant() }
  finally { $sha.Dispose() }
  $stream = [IO.File]::Open($evidencePath, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
  try { $stream.Write($bytes, 0, $bytes.Length); $stream.Flush($true) } finally { $stream.Dispose() }
  if ((Get-FileHash -LiteralPath $evidencePath -Algorithm SHA256).Hash.ToLowerInvariant() -cne $expectedEvidenceHash) { throw 'EVIDENCE_VERIFY_FAILED' }
} catch {
  exit 48
}

if ($script:filterRejected) { exit 44 }
if ($script:child.StandardError.HadData) { exit 46 }
if ($script:child.ExitCode -ne 0 -or $script:tapFailCount -ne 0) { exit 49 }
exit 0
