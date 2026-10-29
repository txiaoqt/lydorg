# OFFLINE DIAGNOSTIC COPY ONLY. NOT AUTHORIZED FOR EXECUTION.
# NON-RUNNABLE PRODUCTION-WISE: no parameters, no production root, no network.
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

function Get-SafeHarnessDiagnostic([string]$Stage, [System.Management.Automation.ErrorRecord]$Record) {
  $knownTypes = @(
    'System.Management.Automation.RuntimeException',
    'System.Management.Automation.MethodInvocationException',
    'System.ComponentModel.Win32Exception',
    'System.IO.IOException',
    'System.UnauthorizedAccessException',
    'System.ArgumentException',
    'System.ArgumentNullException',
    'System.IO.DirectoryNotFoundException',
    'System.IO.PathTooLongException',
    'System.InvalidOperationException',
    'System.Security.SecurityException',
    'System.TypeInitializationException',
    'System.Reflection.TargetInvocationException',
    'System.DllNotFoundException',
    'YTraceOfflineProofState.FixtureFault'
  )
  $safeSourceCodes = @('FIXTURE_SOURCE_MISSING')
  $chain = [System.Collections.Generic.List[string]]::new()
  $nativeWin32 = 'none'
  $fixtureStage = 'none'
  $fixtureCode = 'none'
  $cursor = $Record.Exception
  for ($depth = 0; $null -ne $cursor -and $depth -lt 8; $depth++) {
    $fullName = $cursor.GetType().FullName
    $typeName = if ($knownTypes -contains $fullName) { $fullName } else { 'OTHER_MANAGED_EXCEPTION' }
    $hresult = '0x{0:X8}' -f [int]$cursor.HResult
    $chain.Add($typeName + ':' + $hresult) | Out-Null

    if ($nativeWin32 -eq 'none' -and $cursor -is [System.ComponentModel.Win32Exception]) {
      $nativeWin32 = [string][int]$cursor.NativeErrorCode
    }
    if ($fullName -eq 'YTraceOfflineProofState.FixtureFault') {
      $type = $cursor.GetType()
      $stageField = $type.GetField('Stage')
      $codeField = $type.GetField('Code')
      $nativeField = $type.GetField('NativeErrorCode')
      if ($null -ne $stageField) {
        $value = [string]$stageField.GetValue($cursor)
        if ($value -match '^[A-Z0-9_]{1,64}$') { $fixtureStage = $value }
      }
      if ($null -ne $codeField) {
        $value = [string]$codeField.GetValue($cursor)
        if ($value -match '^[A-Z0-9_]{1,64}$') { $fixtureCode = $value }
      }
      if ($nativeWin32 -eq 'none' -and $null -ne $nativeField) {
        $value = $nativeField.GetValue($cursor)
        if ($null -ne $value) { $nativeWin32 = [string][int]$value }
      }
    }
    if ($fixtureCode -eq 'none' -and $safeSourceCodes -contains [string]$cursor.Message) {
      $fixtureCode = [string]$cursor.Message
    }
    $cursor = $cursor.InnerException
  }
  if ($chain.Count -eq 0) { $chain.Add('UNKNOWN_MANAGED_EXCEPTION') | Out-Null }
  if ($Stage -notmatch '^[A-Z0-9_]{1,64}$') { $Stage = 'UNKNOWN_STAGE' }
  return ('stage=' + $Stage + ' managed=' + ($chain -join '>') +
    ' fixtureStage=' + $fixtureStage + ' fixtureCode=' + $fixtureCode + ' nativeWin32=' + $nativeWin32)
}

function Write-SafeHarnessFailure([string]$Stage, [System.Management.Automation.ErrorRecord]$Record) {
  try {
    Write-Output ('not ok - harness [HARNESS_FAILED] ' + (Get-SafeHarnessDiagnostic $Stage $Record))
  } catch {
    Write-Output 'not ok - harness [HARNESS_FAILED] stage=DIAGNOSTIC_FORMAT_FAILED managed=UNAVAILABLE hresult=unavailable fixtureStage=none fixtureCode=none nativeWin32=none'
  }
}

$script:stage = 'HARNESS_INITIALIZATION'
try {
  $script:stage = 'SOURCE_PATH_RESOLVE'
  $candidateRoot = $PSScriptRoot
  $source = Join-Path $candidateRoot 'proof-file-fixtures.cs'
  $script:stage = 'SOURCE_FILE_CHECK'
  if (-not (Test-Path -LiteralPath $source -PathType Leaf)) { throw 'FIXTURE_SOURCE_MISSING' }
  $script:stage = 'FIXTURE_CODE_LOAD'
  Add-Type -Path $source -ErrorAction Stop
} catch {
  Write-SafeHarnessFailure -Stage $script:stage -Record $_
  Write-Output '1..1'
  Write-Output '# SUMMARY pass=0 fail=1 blocked=0'
  Write-Output '# FAILURE_CODES harness:HARNESS_FAILED'
  exit 1
}

$script:passed = 0
$script:failed = 0
$script:blocked = 0
$script:completed = 0
$script:caseOutcome = 'PASS'
$script:blockedReason = ''
$script:caseDirs = [System.Collections.Generic.List[string]]::new()
$script:retainCases = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
$script:failureCodes = [System.Collections.Generic.List[string]]::new()

function Add-Case([string]$Name, [scriptblock]$Run) {
  $script:caseOutcome = 'PASS'
  $script:blockedReason = ''
  try {
    & $Run
    $script:completed++
    if ($script:caseOutcome -eq 'BLOCKED') {
      $script:blocked++
      Write-Output ("ok " + $script:completed + " - " + $Name + " # SKIP " + $script:blockedReason)
    } else {
      $script:passed++
      Write-Output ("ok " + $script:completed + " - " + $Name)
    }
  } catch {
    $script:failed++
    $script:completed++
    $script:failureCodes.Add($Name + ':ASSERTION_FAILED')
    Write-Output ("not ok " + $script:completed + " - " + $Name + " [ASSERTION_FAILED] " +
      (Get-SafeHarnessDiagnostic 'FIXTURE_CASE_ASSERTION' $_))
  }
}

function Assert-True([bool]$Condition, [string]$Code) {
  if (-not $Condition) { throw $Code }
}

function New-Case([string]$Name) {
  [void]$script:scope.CreateCase($Name)
  $script:caseDirs.Add($Name)
}

function New-Bytes([string]$Text) {
  return [System.Text.Encoding]::UTF8.GetBytes($Text)
}

function Get-AclSnapshot([string]$Path) {
  $acl = Get-Acl -LiteralPath $Path
  $sections = [System.Security.AccessControl.AccessControlSections]::Owner -bor
    [System.Security.AccessControl.AccessControlSections]::Group -bor
    [System.Security.AccessControl.AccessControlSections]::Access
  [pscustomobject]@{
    Owner = $acl.Owner
    Sddl = $acl.GetSecurityDescriptorSddlForm($sections)
    Protected = $acl.AreAccessRulesProtected
    ExplicitRuleCount = @($acl.GetAccessRules($true, $false, [System.Security.Principal.SecurityIdentifier])).Count
    AllRulesInherited = @($acl.Access | Where-Object { -not $_.IsInherited }).Count -eq 0
  }
}

function Assert-NoReparseTree([string]$Directory) {
  $stack = [System.Collections.Generic.Stack[string]]::new()
  $stack.Push($Directory)
  while ($stack.Count -gt 0) {
    $current = $stack.Pop()
    foreach ($entry in [System.IO.Directory]::GetFileSystemEntries($current)) {
      $attributes = [System.IO.File]::GetAttributes($entry)
      if (($attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) { return $false }
      if (($attributes -band [System.IO.FileAttributes]::Directory) -ne 0) { $stack.Push($entry) }
    }
  }
  return $true
}

function Get-ProofJson([string]$VerifiedAt, [bool]$Extra = $false) {
  $item = [ordered]@{
    project = 'fixture-project-01'
    host = 'fixture-project-01.invalid'
    status = 'ACTIVE_HEALTHY'
    verifiedVia = 'supabase-control-plane-get-project'
    verifiedAt = $VerifiedAt
  }
  if ($Extra) { $item['access_token'] = 'synthetic-only-rejected' }
  return ($item | ConvertTo-Json -Compress)
}

function Expect-Fault([scriptblock]$Run, [string]$ExpectedCode) {
  $seen = $null
  try { & $Run } catch {
    $exception = $_.Exception
    while ($null -ne $exception) {
      if ($exception -is [YTraceOfflineProofState.FixtureFault]) {
        $seen = $exception.Code
        break
      }
      if ($exception.Message -ceq $ExpectedCode) { $seen = $ExpectedCode; break }
      $exception = $exception.InnerException
    }
  }
  if ($seen -ne $ExpectedCode) { Write-Output ('# EXPECTED_FAULT_DIAG expected=' + $ExpectedCode + ' actual=' + $(if ($null -eq $seen) { 'NO_TYPED_CODE' } else { $seen })) }
  Assert-True ($seen -eq $ExpectedCode) ('EXPECTED_' + $ExpectedCode)
}

$script:scope = $null
$script:stage = 'FIXTURE_SCOPE_CREATE'
try {
  $script:scope = [YTraceOfflineProofState.FixtureScope]::Create()
  $script:stage = 'TEMP_ROOT_RESOLVE'
  $tempRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath()).TrimEnd('\') + '\'
  $script:stage = 'FIXTURE_ROOT_RESOLVE'
  $rootFull = [System.IO.Path]::GetFullPath($script:scope.RootPath)
  $script:stage = 'FIXTURE_ROOT_BOUNDARY_ASSERTION'
  Add-Case 'per-run root is generated beneath Temp' {
    Assert-True ($rootFull.StartsWith($tempRoot, [StringComparison]::OrdinalIgnoreCase) -and
      [System.IO.Path]::GetFileName($rootFull) -match '^ytrace-proof-fixture-[0-9a-f]{32}$') 'TEMP_ROOT_BOUNDARY_FAILED'
  }

  Add-Case 'archive preserves bytes identity ACL owner and times' {
    New-Case 'archive-success'
    $source = $script:scope.FilePath('archive-success', 'control-plane-proof.json')
    $dest = $script:scope.FilePath('archive-success', 'control-plane-proof-history-fixture.json')
    $bytes = New-Bytes 'synthetic-stale-proof-payload'
    $script:scope.WriteNewFile('archive-success', 'control-plane-proof.json', $bytes)
    $binding = [YTraceOfflineProofState.ArchiveFixtureOps]::Capture($script:scope, 'archive-success', 'control-plane-proof.json')
    $beforeAcl = Get-AclSnapshot $source
    $beforeInfo = Get-Item -LiteralPath $source
    $beforeCreationTicks = $beforeInfo.CreationTimeUtc.Ticks
    $beforeLastWriteTicks = $beforeInfo.LastWriteTimeUtc.Ticks
    $op = [YTraceOfflineProofState.ArchiveFixtureOps]::Prepare($script:scope, 'archive-success',
      'control-plane-proof.json', 'control-plane-proof-history-fixture.json', $binding)
    try {
      $result = $op.SubmitAndVerify([YTraceOfflineProofState.FixtureFailure]::None)
      if ($result.Status -ne 'ARCHIVED_AND_VERIFIED' -or $result.Submissions -ne 1) {
        Write-Output ('# ARCHIVE_DIAG status=' + $result.Status + ' code=' + $result.Code +
          ' nativeError=' + $result.NativeErrorCode + ' submissions=' + $result.Submissions)
      }
      Assert-True ($result.Status -eq 'ARCHIVED_AND_VERIFIED' -and $result.Submissions -eq 1) 'ARCHIVE_SUCCESS_CONTRACT_FAILED'
      Assert-True (-not (Test-Path -LiteralPath $source) -and (Test-Path -LiteralPath $dest)) 'ARCHIVE_PATH_POSTCONDITION_FAILED'
      Assert-True ([Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([IO.File]::ReadAllBytes($dest))).ToLowerInvariant() -eq $binding.Sha256) 'ARCHIVE_BYTES_MISMATCH'
      $after = Get-Item -LiteralPath $dest
      Assert-True ($beforeCreationTicks -eq $after.CreationTimeUtc.Ticks -and
        $beforeLastWriteTicks -eq $after.LastWriteTimeUtc.Ticks) 'ARCHIVE_TIMESTAMPS_CHANGED'
      $afterAcl = Get-AclSnapshot $dest
      Assert-True ($beforeAcl.Owner -eq $afterAcl.Owner -and $beforeAcl.Sddl -eq $afterAcl.Sddl) 'ARCHIVE_SECURITY_DESCRIPTOR_CHANGED'
      $second = $op.SubmitAndVerify([YTraceOfflineProofState.FixtureFailure]::None)
      Assert-True ($second.Status -eq 'BLOCKED_ALREADY_ATTEMPTED' -and $op.Submissions -eq 1) 'ARCHIVE_SECOND_SUBMISSION_NOT_BLOCKED'
    } finally { $op.Dispose() }
  }

  Add-Case 'pre-existing archive destination is retained' {
    New-Case 'archive-existing'
    $script:scope.WriteNewFile('archive-existing', 'source.bin', (New-Bytes 'source'))
    $script:scope.WriteNewFile('archive-existing', 'archive.bin', (New-Bytes 'sentinel'))
    $binding = [YTraceOfflineProofState.ArchiveFixtureOps]::Capture($script:scope, 'archive-existing', 'source.bin')
    Expect-Fault { [YTraceOfflineProofState.ArchiveFixtureOps]::Prepare($script:scope, 'archive-existing', 'source.bin', 'archive.bin', $binding) | Out-Null } 'ARCHIVE_DESTINATION_ALREADY_EXISTS'
    Assert-True ([IO.File]::ReadAllText($script:scope.FilePath('archive-existing','source.bin')) -eq 'source') 'SOURCE_NOT_RETAINED'
    Assert-True ([IO.File]::ReadAllText($script:scope.FilePath('archive-existing','archive.bin')) -eq 'sentinel') 'DESTINATION_OVERWRITTEN'
  }

  Add-Case 'changed source identity is rejected before submission' {
    New-Case 'source-changed'
    $script:scope.WriteNewFile('source-changed', 'source.bin', (New-Bytes 'original'))
    $binding = [YTraceOfflineProofState.ArchiveFixtureOps]::Capture($script:scope, 'source-changed', 'source.bin')
    [IO.File]::WriteAllBytes($script:scope.FilePath('source-changed','source.bin'), (New-Bytes 'replacement'))
    Expect-Fault { [YTraceOfflineProofState.ArchiveFixtureOps]::Prepare($script:scope, 'source-changed', 'source.bin', 'archive.bin', $binding) | Out-Null } 'SOURCE_BINDING_MISMATCH'
    Assert-True (-not (Test-Path -LiteralPath $script:scope.FilePath('source-changed','archive.bin'))) 'UNEXPECTED_ARCHIVE_CREATED'
  }

  Add-Case 'binding from a different parent is rejected' {
    New-Case 'parent-a'
    New-Case 'parent-b'
    $script:scope.WriteNewFile('parent-a','source.bin',(New-Bytes 'same'))
    $script:scope.WriteNewFile('parent-b','source.bin',(New-Bytes 'same'))
    $binding = [YTraceOfflineProofState.ArchiveFixtureOps]::Capture($script:scope,'parent-a','source.bin')
    Expect-Fault { [YTraceOfflineProofState.ArchiveFixtureOps]::Prepare($script:scope,'parent-b','source.bin','archive.bin',$binding) | Out-Null } 'PARENT_BINDING_MISMATCH'
    Assert-True (-not (Test-Path -LiteralPath $script:scope.FilePath('parent-b','archive.bin'))) 'UNEXPECTED_ARCHIVE_CREATED'
  }

  Add-Case 'replacement parent identity is rejected' {
    New-Case 'parent-substitution'
    New-Case 'parent-substitution-new'
    $script:scope.WriteNewFile('parent-substitution','source.bin',(New-Bytes 'old-parent'))
    $script:scope.WriteNewFile('parent-substitution-new','source.bin',(New-Bytes 'new-parent'))
    $binding = [YTraceOfflineProofState.ArchiveFixtureOps]::Capture($script:scope,'parent-substitution','source.bin')
    $oldPath = $script:scope.CasePath('parent-substitution')
    $retainedPath = $script:scope.CasePath('parent-substitution-retained')
    $replacementPath = $script:scope.CasePath('parent-substitution-new')
    [IO.Directory]::Move($oldPath,$retainedPath)
    [IO.Directory]::Move($replacementPath,$oldPath)
    Expect-Fault { [YTraceOfflineProofState.ArchiveFixtureOps]::Prepare($script:scope,'parent-substitution','source.bin','archive.bin',$binding) | Out-Null } 'PARENT_BINDING_MISMATCH'
    Assert-True ([IO.File]::ReadAllText([IO.Path]::Combine($retainedPath,'source.bin')) -eq 'old-parent' -and
      [IO.File]::ReadAllText($script:scope.FilePath('parent-substitution','source.bin')) -eq 'new-parent') 'PARENT_FIXTURE_DATA_CHANGED'
    $script:caseDirs.Add('parent-substitution-retained')
  }

  Add-Case 'concurrent no-overwrite contenders preserve exactly one winner' {
    $race = [YTraceOfflineProofState.FixtureRaceTest]::Run($script:scope)
    if ($race.WinnerStatus -ne 'ARCHIVED_AND_VERIFIED' -or $race.LoserStatus -ne 'REJECTED_DESTINATION_EXISTS' -or
      $race.TotalSubmissions -ne 2 -or -not $race.DestinationMatchesWinner -or -not $race.LosingSourceRetained) {
      Write-Output ('# RACE_DIAG winner=' + $race.WinnerStatus + ' loser=' + $race.LoserStatus +
        ' submissions=' + $race.TotalSubmissions + ' destinationMatches=' + $race.DestinationMatchesWinner +
        ' losingSourceRetained=' + $race.LosingSourceRetained)
    }
    Assert-True ($race.WinnerStatus -eq 'ARCHIVED_AND_VERIFIED' -and $race.LoserStatus -eq 'REJECTED_DESTINATION_EXISTS') 'RACE_STATUS_MISMATCH'
    Assert-True ($race.TotalSubmissions -eq 2 -and $race.DestinationMatchesWinner -and $race.LosingSourceRetained) 'RACE_NO_REPLACE_FAILED'
    $script:caseDirs.Add('race')
  }

  Add-Case 'pre-submit stop leaves source and performs zero submissions' {
    New-Case 'archive-before-submit'
    $script:scope.WriteNewFile('archive-before-submit','source.bin',(New-Bytes 'untouched'))
    $binding = [YTraceOfflineProofState.ArchiveFixtureOps]::Capture($script:scope,'archive-before-submit','source.bin')
    $op = [YTraceOfflineProofState.ArchiveFixtureOps]::Prepare($script:scope,'archive-before-submit','source.bin','archive.bin',$binding)
    try {
      $result = $op.SubmitAndVerify([YTraceOfflineProofState.FixtureFailure]::BeforeArchiveSubmit)
      if ($result.Status -ne 'STOPPED_BEFORE_SUBMISSION' -or $result.Submissions -ne 0) {
        Write-Output ('# PRE_SUBMIT_DIAG status=' + $result.Status + ' code=' + $result.Code + ' submissions=' + $result.Submissions)
      }
      Assert-True ($result.Status -eq 'STOPPED_BEFORE_SUBMISSION' -and $result.Submissions -eq 0) 'PRE_SUBMIT_STOP_FAILED'
      $sourceStillThere = [IO.File]::ReadAllText($script:scope.FilePath('archive-before-submit','source.bin')) -eq 'untouched'
      $archiveAppeared = Test-Path -LiteralPath $script:scope.FilePath('archive-before-submit','archive.bin')
      if (-not $sourceStillThere -or $archiveAppeared) { Write-Output ('# PRE_SUBMIT_STATE_DIAG sourceOk=' + $sourceStillThere + ' archiveExists=' + $archiveAppeared) }
      Assert-True ($sourceStillThere -and -not $archiveAppeared) 'PRE_SUBMIT_STATE_CHANGED'
      $again = $op.SubmitAndVerify([YTraceOfflineProofState.FixtureFailure]::None)
      Assert-True ($again.Status -eq 'BLOCKED_ALREADY_ATTEMPTED' -and $op.Submissions -eq 0) 'PRE_SUBMIT_RETRY_NOT_BLOCKED'
    } finally { $op.Dispose() }
  }

  Add-Case 'post-kernel ambiguity is retained and never retried' {
    New-Case 'archive-uncertain'
    $script:scope.WriteNewFile('archive-uncertain','source.bin',(New-Bytes 'uncertain-archive'))
    $binding = [YTraceOfflineProofState.ArchiveFixtureOps]::Capture($script:scope,'archive-uncertain','source.bin')
    $op = [YTraceOfflineProofState.ArchiveFixtureOps]::Prepare($script:scope,'archive-uncertain','source.bin','archive.bin',$binding)
    try {
      $result = $op.SubmitAndVerify([YTraceOfflineProofState.FixtureFailure]::AfterArchiveNativeSuccess)
      if ($result.Status -ne 'UNRESOLVED_AFTER_SUBMISSION' -or $result.Submissions -ne 1) {
        Write-Output ('# UNCERTAIN_DIAG status=' + $result.Status + ' code=' + $result.Code +
          ' nativeError=' + $result.NativeErrorCode + ' submissions=' + $result.Submissions)
      }
      Assert-True ($result.Status -eq 'UNRESOLVED_AFTER_SUBMISSION' -and $result.Submissions -eq 1) 'ARCHIVE_AMBIGUITY_NOT_REPORTED'
      Assert-True ((Test-Path -LiteralPath $script:scope.FilePath('archive-uncertain','archive.bin')) -and
        -not (Test-Path -LiteralPath $script:scope.FilePath('archive-uncertain','source.bin'))) 'ARCHIVE_UNCERTAIN_STATE_NOT_RETAINED'
      $again = $op.SubmitAndVerify([YTraceOfflineProofState.FixtureFailure]::None)
      Assert-True ($again.Status -eq 'BLOCKED_ALREADY_ATTEMPTED' -and $op.Submissions -eq 1) 'ARCHIVE_AMBIGUITY_RETRIED'
    } finally { $op.Dispose() }
    $script:retainCases.Add('archive-uncertain') | Out-Null
  }

  Add-Case 'hardlink source rejected when unprivileged fixture is available' {
    New-Case 'hardlink'
    $script:scope.WriteNewFile('hardlink','source.bin',(New-Bytes 'hardlink-source'))
    $code = ''
    if (-not $script:scope.TryCreateHardLink('hardlink','alias.bin','source.bin',[ref]$code)) {
      $script:caseOutcome = 'BLOCKED'
      $script:blockedReason = 'hardlink fixture unavailable without privilege'
    } else {
      Expect-Fault { [YTraceOfflineProofState.ArchiveFixtureOps]::Capture($script:scope,'hardlink','source.bin') | Out-Null } 'HARDLINK_SOURCE_REJECTED'
    }
  }

  Add-Case 'reparse directory rejected when unprivileged fixture is available' {
    New-Case 'reparse-target'
    $script:scope.WriteNewFile('reparse-target','source.bin',(New-Bytes 'target'))
    $linkCode = ''
    if (-not $script:scope.TryCreateDirectoryLink('reparse-link','reparse-target',[ref]$linkCode)) {
      $script:caseOutcome = 'BLOCKED'
      $script:blockedReason = 'unprivileged directory-link fixture unavailable'
    } else {
      $script:caseDirs.Add('reparse-link')
      Expect-Fault { [YTraceOfflineProofState.ArchiveFixtureOps]::Capture($script:scope,'reparse-link','source.bin') | Out-Null } 'REPARSE_DIRECTORY_REJECTED'
      $script:retainCases.Add('reparse-link') | Out-Null
      $script:retainCases.Add('reparse-target') | Out-Null
    }
  }

  Add-Case 'proof accepts exact five fields and inherits fixture ACL read-only' {
    New-Case 'proof-success'
    $now = [DateTimeOffset]::ParseExact('2026-10-15T01:00:05.000Z','yyyy-MM-ddTHH:mm:ss.fffZ',[Globalization.CultureInfo]::InvariantCulture)
    $json = Get-ProofJson '2026-10-15T01:00:00.000Z'
    $parentAcl = Get-AclSnapshot $script:scope.CasePath('proof-success')
    $result = [YTraceOfflineProofState.FixtureProofWriter]::CreateOnce($script:scope,'proof-success',$json,$now,[YTraceOfflineProofState.FixtureFailure]::None)
    $path = $script:scope.FilePath('proof-success','control-plane-proof.json')
    Assert-True ($result.Status -eq 'CREATED_AND_VERIFIED' -and $result.CreateAttempts -eq 1) 'PROOF_CREATE_CONTRACT_FAILED'
    $bytes = [IO.File]::ReadAllBytes($path)
    Assert-True ($bytes.Length -gt 3 -and -not ($bytes[0] -eq 0xef -and $bytes[1] -eq 0xbb -and $bytes[2] -eq 0xbf)) 'PROOF_HAS_BOM_OR_EMPTY'
    $proof = Get-Content -LiteralPath $path -Raw | ConvertFrom-Json
    Assert-True (@($proof.PSObject.Properties.Name | Sort-Object) -join ',' -eq 'host,project,status,verifiedAt,verifiedVia') 'PROOF_FIELDS_NOT_EXACT'
    $proofAcl = Get-AclSnapshot $path
    Assert-True (-not $proofAcl.Protected -and $proofAcl.ExplicitRuleCount -eq 0 -and $proofAcl.AllRulesInherited) 'PROOF_ACL_NOT_INHERITED'
    Assert-True ($parentAcl.Owner -eq $proofAcl.Owner) 'PROOF_OWNER_MISMATCH'
  }

  Add-Case 'exact 300-second proof age is accepted' {
    $json = Get-ProofJson '2026-10-15T00:55:00.000Z'
    [YTraceOfflineProofState.FixtureProofWriter]::ValidateSyntheticProof($json,
      [DateTimeOffset]::ParseExact('2026-10-15T01:00:00.000Z','yyyy-MM-ddTHH:mm:ss.fffZ',[Globalization.CultureInfo]::InvariantCulture))
  }

  Add-Case '301-second proof age is rejected' {
    $json = Get-ProofJson '2026-10-15T00:54:59.000Z'
    Expect-Fault { [YTraceOfflineProofState.FixtureProofWriter]::ValidateSyntheticProof($json,
      [DateTimeOffset]::ParseExact('2026-10-15T01:00:00.000Z','yyyy-MM-ddTHH:mm:ss.fffZ',[Globalization.CultureInfo]::InvariantCulture)) } 'PROOF_TIMESTAMP_STALE_OR_FUTURE'
  }

  Add-Case 'future proof timestamp is rejected' {
    $json = Get-ProofJson '2026-10-15T01:00:01.000Z'
    Expect-Fault { [YTraceOfflineProofState.FixtureProofWriter]::ValidateSyntheticProof($json,
      [DateTimeOffset]::ParseExact('2026-10-15T01:00:00.000Z','yyyy-MM-ddTHH:mm:ss.fffZ',[Globalization.CultureInfo]::InvariantCulture)) } 'PROOF_TIMESTAMP_STALE_OR_FUTURE'
  }

  Add-Case 'timezone-free proof timestamp is rejected' {
    $json = Get-ProofJson '2026-10-15T01:00:00'
    Expect-Fault { [YTraceOfflineProofState.FixtureProofWriter]::ValidateSyntheticProof($json,
      [DateTimeOffset]::ParseExact('2026-10-15T01:00:00.000Z','yyyy-MM-ddTHH:mm:ss.fffZ',[Globalization.CultureInfo]::InvariantCulture)) } 'PROOF_TIMESTAMP_INVALID'
  }

  Add-Case 'additional credential-like field is rejected before file creation' {
    New-Case 'proof-extra-field'
    $json = Get-ProofJson '2026-10-15T01:00:00.000Z' $true
    $result = [YTraceOfflineProofState.FixtureProofWriter]::CreateOnce($script:scope,'proof-extra-field',$json,
      [DateTimeOffset]::ParseExact('2026-10-15T01:00:01.000Z','yyyy-MM-ddTHH:mm:ss.fffZ',[Globalization.CultureInfo]::InvariantCulture),
      [YTraceOfflineProofState.FixtureFailure]::None)
    Assert-True ($result.Status -eq 'REJECTED_BEFORE_CREATE' -and $result.CreateAttempts -eq 0) 'EXTRA_FIELD_NOT_REJECTED'
    Assert-True (-not (Test-Path -LiteralPath $script:scope.FilePath('proof-extra-field','control-plane-proof.json'))) 'INVALID_PROOF_FILE_CREATED'
  }

  Add-Case 'create-new collision retains existing proof bytes' {
    New-Case 'proof-collision'
    $sentinel = New-Bytes 'existing-proof-sentinel'
    $script:scope.WriteNewFile('proof-collision','control-plane-proof.json',$sentinel)
    $json = Get-ProofJson '2026-10-15T01:00:00.000Z'
    $result = [YTraceOfflineProofState.FixtureProofWriter]::CreateOnce($script:scope,'proof-collision',$json,
      [DateTimeOffset]::ParseExact('2026-10-15T01:00:01.000Z','yyyy-MM-ddTHH:mm:ss.fffZ',[Globalization.CultureInfo]::InvariantCulture),
      [YTraceOfflineProofState.FixtureFailure]::None)
    Assert-True ($result.Status -eq 'REJECTED_EXISTING_FILE' -and $result.CreateAttempts -eq 1) 'CREATE_NEW_COLLISION_NOT_REJECTED'
    Assert-True ([Convert]::ToBase64String([IO.File]::ReadAllBytes($script:scope.FilePath('proof-collision','control-plane-proof.json'))) -eq
      [Convert]::ToBase64String($sentinel)) 'EXISTING_PROOF_OVERWRITTEN'
  }

  Add-Case 'pre-create stop writes nothing and has zero attempts' {
    New-Case 'proof-before-create'
    $json = Get-ProofJson '2026-10-15T01:00:00.000Z'
    $result = [YTraceOfflineProofState.FixtureProofWriter]::CreateOnce($script:scope,'proof-before-create',$json,
      [DateTimeOffset]::ParseExact('2026-10-15T01:00:01.000Z','yyyy-MM-ddTHH:mm:ss.fffZ',[Globalization.CultureInfo]::InvariantCulture),
      [YTraceOfflineProofState.FixtureFailure]::BeforeProofCreate)
    Assert-True ($result.Status -eq 'STOPPED_BEFORE_CREATE' -and $result.CreateAttempts -eq 0) 'PROOF_PRECREATE_STOP_FAILED'
    Assert-True (-not (Test-Path -LiteralPath $script:scope.FilePath('proof-before-create','control-plane-proof.json'))) 'PROOF_PRECREATE_CREATED_FILE'
  }

  Add-Case 'failure after exclusive create retains empty file without retry' {
    New-Case 'proof-after-create'
    $json = Get-ProofJson '2026-10-15T01:00:00.000Z'
    $result = [YTraceOfflineProofState.FixtureProofWriter]::CreateOnce($script:scope,'proof-after-create',$json,
      [DateTimeOffset]::ParseExact('2026-10-15T01:00:01.000Z','yyyy-MM-ddTHH:mm:ss.fffZ',[Globalization.CultureInfo]::InvariantCulture),
      [YTraceOfflineProofState.FixtureFailure]::AfterProofCreate)
    $path = $script:scope.FilePath('proof-after-create','control-plane-proof.json')
    Assert-True ($result.Status -eq 'UNRESOLVED_AFTER_CREATE' -and $result.CreateAttempts -eq 1 -and (Test-Path -LiteralPath $path)) 'EMPTY_CREATE_NOT_RETAINED'
    Assert-True ((Get-Item -LiteralPath $path).Length -eq 0) 'EXPECTED_EMPTY_CREATE_CHANGED'
    $script:retainCases.Add('proof-after-create') | Out-Null
  }

  Add-Case 'partial proof write remains present and unresolved' {
    New-Case 'proof-partial'
    $json = Get-ProofJson '2026-10-15T01:00:00.000Z'
    $result = [YTraceOfflineProofState.FixtureProofWriter]::CreateOnce($script:scope,'proof-partial',$json,
      [DateTimeOffset]::ParseExact('2026-10-15T01:00:01.000Z','yyyy-MM-ddTHH:mm:ss.fffZ',[Globalization.CultureInfo]::InvariantCulture),
      [YTraceOfflineProofState.FixtureFailure]::AfterProofPartialWrite)
    $path = $script:scope.FilePath('proof-partial','control-plane-proof.json')
    Assert-True ($result.Status -eq 'UNRESOLVED_AFTER_CREATE' -and $result.CreateAttempts -eq 1) 'PARTIAL_CREATE_NOT_UNRESOLVED'
    Assert-True ((Get-Item -LiteralPath $path).Length -gt 0 -and (Get-Item -LiteralPath $path).Length -lt (New-Bytes $json).Length) 'PARTIAL_BYTES_NOT_RETAINED'
    $script:retainCases.Add('proof-partial') | Out-Null
  }

  Add-Case 'post-flush uncertainty retains complete proof without claiming success' {
    New-Case 'proof-after-flush'
    $json = Get-ProofJson '2026-10-15T01:00:00.000Z'
    $result = [YTraceOfflineProofState.FixtureProofWriter]::CreateOnce($script:scope,'proof-after-flush',$json,
      [DateTimeOffset]::ParseExact('2026-10-15T01:00:01.000Z','yyyy-MM-ddTHH:mm:ss.fffZ',[Globalization.CultureInfo]::InvariantCulture),
      [YTraceOfflineProofState.FixtureFailure]::AfterProofFlush)
    $path = $script:scope.FilePath('proof-after-flush','control-plane-proof.json')
    Assert-True ($result.Status -eq 'UNRESOLVED_AFTER_CREATE' -and $result.CreateAttempts -eq 1) 'POSTFLUSH_UNCERTAINTY_NOT_REPORTED'
    Assert-True ([IO.File]::ReadAllText($path).Contains('fixture-project-01')) 'POSTFLUSH_FILE_NOT_RETAINED'
    $script:retainCases.Add('proof-after-flush') | Out-Null
  }
}
catch {
  $script:failed++
  $script:completed++
  $script:failureCodes.Add('harness:HARNESS_FAILED')
  Write-SafeHarnessFailure -Stage $script:stage -Record $_
}
finally {
  if ($null -ne $script:scope) {
    try {
      $script:stage = 'FIXTURE_CLEANUP_ROOT_RESOLVE'
      $root = [System.IO.Path]::GetFullPath($script:scope.RootPath)
      $script:stage = 'FIXTURE_CLEANUP_TEMP_RESOLVE'
      $temp = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath()).TrimEnd('\') + '\'
      $script:stage = 'FIXTURE_CLEANUP_ROOT_VALIDATE'
      $safeRoot = $root.StartsWith($temp, [StringComparison]::OrdinalIgnoreCase) -and
        [System.IO.Path]::GetFileName($root) -match '^ytrace-proof-fixture-[0-9a-f]{32}$'
      if ($safeRoot -and $script:failed -eq 0) {
        foreach ($name in @($script:caseDirs | Select-Object -Unique)) {
          if ($script:retainCases.Contains($name)) { continue }
          $script:stage = 'FIXTURE_CLEANUP_CASE_VALIDATE'
          $casePath = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($root,$name))
          $inside = $casePath.StartsWith($root.TrimEnd('\') + '\',[StringComparison]::OrdinalIgnoreCase)
          if ($inside -and (Test-Path -LiteralPath $casePath) -and (Assert-NoReparseTree $casePath)) {
            $script:stage = 'FIXTURE_CLEANUP_CASE_REMOVE'
            Remove-Item -LiteralPath $casePath -Recurse -Force
          } else {
            $script:retainCases.Add($name) | Out-Null
          }
        }
      }
      $script:stage = 'FIXTURE_CLEANUP_ROOT_INSPECT'
      $remaining = @([System.IO.Directory]::GetFileSystemEntries($root))
      if ($remaining.Count -eq 0 -and $script:retainCases.Count -eq 0) {
        $script:stage = 'FIXTURE_CLEANUP_ROOT_REMOVE'
        Remove-Item -LiteralPath $root -Force
      }
      $script:stage = 'FIXTURE_CLEANUP_REPORT'
      if ($script:retainCases.Count -gt 0) {
        Write-Output ('# retained synthetic fixture cases: ' + (($script:retainCases | Sort-Object) -join ','))
      }
      if ($safeRoot -and (Test-Path -LiteralPath $root -PathType Container)) {
        $rootEntries = @([System.IO.Directory]::GetFileSystemEntries($root) | ForEach-Object { [System.IO.Path]::GetFileName($_) } | Sort-Object)
        Write-Output ('# FIXTURE_ROOT_ENTRY_COUNT ' + $rootEntries.Count)
        if ($rootEntries.Count -gt 0) { Write-Output ('# FIXTURE_ROOT_ENTRIES ' + ($rootEntries -join ',')) }
      }
    } catch {
      $script:failed++
      $script:completed++
      $script:failureCodes.Add('harness:CLEANUP_FAILED')
      try {
        Write-Output ('not ok - harness [CLEANUP_FAILED] ' + (Get-SafeHarnessDiagnostic $script:stage $_))
      } catch {
        Write-Output 'not ok - harness [CLEANUP_FAILED] stage=FIXTURE_CLEANUP_DIAGNOSTIC_FAILED managed=UNAVAILABLE hresult=unavailable fixtureStage=none fixtureCode=none nativeWin32=none'
      }
    }
  }
}

$total = $script:completed
Write-Output ('1..' + $total)
Write-Output ('# SUMMARY pass=' + $script:passed + ' fail=' + $script:failed + ' blocked=' + $script:blocked)
if ($script:failureCodes.Count -gt 0) { Write-Output ('# FAILURE_CODES ' + ($script:failureCodes -join ',')) }
if ($script:failed -gt 0) { exit 1 } else { exit 0 }
