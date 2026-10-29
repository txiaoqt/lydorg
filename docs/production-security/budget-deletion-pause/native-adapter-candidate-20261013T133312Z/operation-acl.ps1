param(
  [Parameter(Mandatory=$true)][ValidateSet('Protect','Verify','SelfTest')][string]$Action,
  [string]$Path
)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$script:selfTestStage = 'start'
$script:aclCheckStage = 'not-started'

function Get-SidValue([System.Security.Principal.IdentityReference]$Identity) {
  return $Identity.Translate([System.Security.Principal.SecurityIdentifier]).Value
}

function Get-AllowedSids {
  $current = [System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value
  return @($current, 'S-1-5-18', 'S-1-5-32-544') | Select-Object -Unique
}

function Assert-NoReparse([string]$TargetPath) {
  $full = [System.IO.Path]::GetFullPath($TargetPath)
  $cursor = $full
  while ($cursor) {
    if (Test-Path -LiteralPath $cursor) {
      $item = Get-Item -LiteralPath $cursor -Force
      if (($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) {
        throw 'STATE_PATH_REPARSE_POINT'
      }
    }
    $parent = [System.IO.Directory]::GetParent($cursor)
    if ($null -eq $parent) { break }
    $cursor = $parent.FullName
  }
}

function Set-ProtectedDirectoryAcl([string]$TargetPath) {
  Assert-NoReparse $TargetPath
  [System.IO.Directory]::CreateDirectory($TargetPath) | Out-Null
  Assert-NoReparse $TargetPath
  $currentSid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User
  $acl = Get-Acl -LiteralPath $TargetPath
  $acl.SetAccessRuleProtection($true, $false)
  foreach ($rule in @($acl.Access)) { [void]$acl.RemoveAccessRuleSpecific($rule) }
  $acl.SetOwner($currentSid)
  $inherit = [System.Security.AccessControl.InheritanceFlags]::ContainerInherit -bor [System.Security.AccessControl.InheritanceFlags]::ObjectInherit
  foreach ($sidText in (Get-AllowedSids)) {
    $sid = [System.Security.Principal.SecurityIdentifier]::new($sidText)
    $rule = [System.Security.AccessControl.FileSystemAccessRule]::new(
      $sid,
      [System.Security.AccessControl.FileSystemRights]::FullControl,
      $inherit,
      [System.Security.AccessControl.PropagationFlags]::None,
      [System.Security.AccessControl.AccessControlType]::Allow
    )
    $acl.AddAccessRule($rule)
  }
  Set-Acl -LiteralPath $TargetPath -AclObject $acl
}

function Assert-ProtectedPath([string]$TargetPath, [string]$ProtectedRoot, [switch]$SkipAncestorSafetyForSelfTest) {
  $script:aclCheckStage = 'target-exists'
  if (-not (Test-Path -LiteralPath $TargetPath)) { throw 'STATE_PATH_MISSING' }
  $script:aclCheckStage = 'target-no-reparse'
  Assert-NoReparse $TargetPath
  $rootFull = Get-CanonicalStatePath $ProtectedRoot
  $pathFull = Get-CanonicalStatePath $TargetPath
  $sameRoot = [string]::Equals($pathFull, $rootFull, [System.StringComparison]::OrdinalIgnoreCase)
  $script:aclCheckStage = 'target-contained'
  if (-not $sameRoot -and -not $pathFull.StartsWith($rootFull + '\', [System.StringComparison]::OrdinalIgnoreCase)) {
    throw 'STATE_PATH_OUTSIDE_PROTECTED_ROOT'
  }
  if (-not (Get-Item -LiteralPath $rootFull -Force).PSIsContainer) { throw 'STATE_ROOT_NOT_DIRECTORY' }
  if (-not $sameRoot -and (Get-Item -LiteralPath $pathFull -Force).PSIsContainer) {
    throw 'STATE_ARTIFACT_NOT_FILE'
  }
  $script:aclCheckStage = 'get-root-acl'
  $rootAcl = Get-Acl -LiteralPath $rootFull
  $script:aclCheckStage = 'root-dacl-protected'
  if (-not $rootAcl.AreAccessRulesProtected) { throw 'STATE_DIRECTORY_DACL_INHERITS' }
  $script:aclCheckStage = 'root-owner'
  $rootOwner = Get-SidValue ($rootAcl.GetOwner([System.Security.Principal.SecurityIdentifier]))
  $currentSid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value
  if ($rootOwner -ne $currentSid) { throw 'STATE_DIRECTORY_OWNER_MISMATCH' }
  if (-not $SkipAncestorSafetyForSelfTest) { Assert-NoUntrustedAncestorMutation $rootFull }
  $allowed = Get-AllowedSids
  $checkPaths = @($rootFull)
  if (-not $sameRoot) { $checkPaths += $pathFull }
  foreach ($checkPath in $checkPaths) {
    $script:aclCheckStage = 'get-access-rules'
    $acl = Get-Acl -LiteralPath $checkPath
    if (-not [string]::Equals($checkPath, $rootFull, [System.StringComparison]::OrdinalIgnoreCase)) {
      $artifactOwner = Get-SidValue ($acl.GetOwner([System.Security.Principal.SecurityIdentifier]))
      if ($artifactOwner -ne $currentSid) { throw 'STATE_ARTIFACT_OWNER_MISMATCH' }
    }
    foreach ($rule in @($acl.GetAccessRules($true, $true, [System.Security.Principal.SecurityIdentifier]))) {
      $script:aclCheckStage = 'check-access-rule'
      $sid = $rule.IdentityReference.Value
      $rights = [System.Security.AccessControl.FileSystemRights]$rule.FileSystemRights
      if ($sid -notin $allowed) { throw 'STATE_DACL_HAS_UNAPPROVED_PRINCIPAL' }
      if ($rule.AccessControlType -ne [System.Security.AccessControl.AccessControlType]::Allow) { throw 'STATE_DACL_HAS_DENY_RULE' }
      if (($rights -band [System.Security.AccessControl.FileSystemRights]::FullControl) -ne [System.Security.AccessControl.FileSystemRights]::FullControl) { throw 'STATE_DACL_RIGHTS_INCOMPLETE' }
    }
    $ruleSids = @($acl.GetAccessRules($true, $true, [System.Security.Principal.SecurityIdentifier]) | Where-Object { $_.AccessControlType -eq [System.Security.AccessControl.AccessControlType]::Allow -and (($_.FileSystemRights -band [System.Security.AccessControl.FileSystemRights]::FullControl) -eq [System.Security.AccessControl.FileSystemRights]::FullControl) } | ForEach-Object { $_.IdentityReference.Value } | Select-Object -Unique)
    foreach ($requiredSid in $allowed) {
      if ($requiredSid -notin $ruleSids) { throw 'STATE_TRUSTED_PRINCIPAL_MISSING' }
    }
  }
  $script:aclCheckStage = 'check-owner-control'
  $rootRules = @($rootAcl.GetAccessRules($true, $true, [System.Security.Principal.SecurityIdentifier]))
  $ownerFull = $rootRules | Where-Object { $_.IdentityReference.Value -eq $currentSid -and $_.AccessControlType -eq [System.Security.AccessControl.AccessControlType]::Allow -and (($_.FileSystemRights -band [System.Security.AccessControl.FileSystemRights]::FullControl) -eq [System.Security.AccessControl.FileSystemRights]::FullControl) }
  if (-not $ownerFull) { throw 'STATE_CURRENT_USER_FULL_CONTROL_MISSING' }
  $script:aclCheckStage = 'complete'
  return $true
}

function Assert-NoUntrustedAncestorMutation([string]$ProtectedRoot) {
  $cursor = [System.IO.Directory]::GetParent($ProtectedRoot)
  while ($null -ne $cursor) {
    $script:aclCheckStage = 'ancestor-acl'
    Assert-NoUntrustedMutationOnDirectory $cursor.FullName
    $cursor = $cursor.Parent
  }
}

function Assert-NoUntrustedMutationOnDirectory([string]$DirectoryPath) {
  $allowed = Get-AllowedSids
  # These rights can delete/replace a path component or take over its DACL.
  # Avoid composite Modify/Write masks because they also include read bits.
  $mutationRights = [System.Security.AccessControl.FileSystemRights]::DeleteSubdirectoriesAndFiles -bor
    [System.Security.AccessControl.FileSystemRights]::Delete -bor
    [System.Security.AccessControl.FileSystemRights]::ChangePermissions -bor
    [System.Security.AccessControl.FileSystemRights]::TakeOwnership
  $acl = Get-Acl -LiteralPath $DirectoryPath
  foreach ($rule in @($acl.GetAccessRules($true, $true, [System.Security.Principal.SecurityIdentifier]))) {
    if ($rule.AccessControlType -ne [System.Security.AccessControl.AccessControlType]::Allow) { continue }
    if (($rule.PropagationFlags -band [System.Security.AccessControl.PropagationFlags]::InheritOnly) -ne 0) { continue }
    if ($rule.IdentityReference.Value -in $allowed) { continue }
    $rights = [System.Security.AccessControl.FileSystemRights]$rule.FileSystemRights
    if (($rights -band $mutationRights) -ne 0) { throw 'STATE_ANCESTOR_MUTABLE_BY_UNAPPROVED_PRINCIPAL' }
  }
}

function Get-CanonicalStatePath([string]$TargetPath) {
  # Reject aliases that Windows may normalize before opening a different target.
  if ([string]::IsNullOrWhiteSpace($TargetPath) -or $TargetPath -notmatch '^[A-Za-z]:[\\/]') { throw 'STATE_PATH_MUST_BE_ABSOLUTE_LOCAL' }
  $windowsPath = $TargetPath.Replace('/', '\')
  if ($windowsPath -match '(^|\\)\.{1,2}(\\|$)') { throw 'STATE_PATH_TRAVERSAL_NOT_ALLOWED' }
  if ($windowsPath.Substring(2).Contains(':')) { throw 'STATE_PATH_STREAM_NOT_ALLOWED' }
  foreach ($segment in $windowsPath.Substring(3).Split('\', [System.StringSplitOptions]::RemoveEmptyEntries)) {
    if ($segment.EndsWith('.') -or $segment.EndsWith(' ')) { throw 'STATE_PATH_AMBIGUOUS_SEGMENT' }
  }
  return [System.IO.Path]::GetFullPath($windowsPath).TrimEnd('\')
}

function Assert-TargetIsFixed([string]$TargetPath, [string]$StateRoot) {
  $targetFull = Get-CanonicalStatePath $TargetPath
  $rootFull = Get-CanonicalStatePath $StateRoot
  if (-not [string]::Equals($targetFull, $rootFull, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw 'ONLY_FIXED_BUDGET_STATE_PATH_ALLOWED'
  }
  return $targetFull
}

function Assert-VerifyTargetIsApproved([string]$TargetPath, [string]$StateRoot) {
  $targetFull = Get-CanonicalStatePath $TargetPath
  $rootFull = Get-CanonicalStatePath $StateRoot
  if ([string]::Equals($targetFull, $rootFull, [System.StringComparison]::OrdinalIgnoreCase)) { return $targetFull }
  if (-not [string]::Equals([System.IO.Path]::GetDirectoryName($targetFull), $rootFull, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw 'STATE_PATH_OUTSIDE_PROTECTED_ROOT'
  }
  $leaf = [System.IO.Path]::GetFileName($targetFull)
  $fixedNames = @('control-plane-proof.json', 'authorization.json', 'approved-preflight.json', 'budget-deletion-pause.operation.lock.json', 'budget-deletion-pause.attempt.json')
  $fixedAllowed = $false
  foreach ($name in $fixedNames) {
    if ([string]::Equals($leaf, $name, [System.StringComparison]::OrdinalIgnoreCase)) { $fixedAllowed = $true; break }
  }
  $uuid = '[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}'
  $generated = '^(?:control-plane-proof-history-[0-9a-f]{64}\.json|preflight-[0-9]{8}T[0-9]{9}Z-' + $uuid + '\.json|install-preflight-' + $uuid + '\.json|execution-' + $uuid + '\.jsonl|reconciliation-[0-9]{8}T[0-9]{9}Z-' + $uuid + '\.json)$'
  if (-not $fixedAllowed -and -not [regex]::IsMatch($leaf, $generated, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase -bor [System.Text.RegularExpressions.RegexOptions]::CultureInvariant)) {
    throw 'STATE_ARTIFACT_NAME_NOT_ALLOWED'
  }
  return $targetFull
}

try {
  $userProfile = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::UserProfile)
  if (-not $userProfile) { throw 'SECURE_USER_PROFILE_UNAVAILABLE' }
  $stateRoot = [System.IO.Path]::GetFullPath((Join-Path $userProfile '.ytrace-production-budget-deletion-pause'))
  if ($Action -eq 'SelfTest') {
    if ($Path) { throw 'SELFTEST_DOES_NOT_ACCEPT_PATH' }
    $tempRoot = $PSScriptRoot
    $testRoot = Join-Path $tempRoot ('selftest-ytrace-budget-pause-acl-' + [Guid]::NewGuid().ToString('N'))
    try {
      $script:selfTestStage = 'protect-directory'
      Set-ProtectedDirectoryAcl $testRoot
      $script:selfTestStage = 'verify-directory'
      Assert-ProtectedPath $testRoot $testRoot -SkipAncestorSafetyForSelfTest | Out-Null
      $script:selfTestStage = 'create-child-file'
      $lockPath = Join-Path $testRoot 'test.operation.lock.json'
      [System.IO.File]::WriteAllText($lockPath, '{"selfTest":true}')
      $script:selfTestStage = 'verify-inherited-file'
      Assert-ProtectedPath $lockPath $testRoot -SkipAncestorSafetyForSelfTest | Out-Null
      $script:selfTestStage = 'reject-broad-users-rule'
      $acl = Get-Acl -LiteralPath $lockPath
      $users = [System.Security.Principal.SecurityIdentifier]::new('S-1-5-32-545')
      $bad = [System.Security.AccessControl.FileSystemAccessRule]::new($users, [System.Security.AccessControl.FileSystemRights]::FullControl, [System.Security.AccessControl.AccessControlType]::Allow)
      $acl.AddAccessRule($bad)
      Set-Acl -LiteralPath $lockPath -AclObject $acl
      $rejected = $false
      try { Assert-ProtectedPath $lockPath $testRoot -SkipAncestorSafetyForSelfTest | Out-Null } catch { $rejected = $true }
      if (-not $rejected) { throw 'SELFTEST_BROAD_GROUP_ACE_NOT_REJECTED' }
      $script:selfTestStage = 'reject-untrusted-mutation-right'
      $untrustedMutationRightRejected = $false
      try { Assert-NoUntrustedMutationOnDirectory $lockPath } catch { $untrustedMutationRightRejected = $_.Exception.Message -eq 'STATE_ANCESTOR_MUTABLE_BY_UNAPPROVED_PRINCIPAL' }
      if (-not $untrustedMutationRightRejected) { throw 'SELFTEST_UNTRUSTED_MUTATION_RIGHT_NOT_REJECTED' }
      $script:selfTestStage = 'verify-fixed-profile-parent'
      Assert-NoUntrustedAncestorMutation $stateRoot
      $script:selfTestStage = 'complete'
      [pscustomobject]@{status='PASS';checks=5;directoryProtected=$true;childInheritsRestrictedAcl=$true;broadUsersGrantRejected=$true;untrustedMutationRightRejected=$true;fixedProfileParentSafe=$true;productionStateTouched=$false} | ConvertTo-Json -Compress
    } finally {
      if ($testRoot -and (Test-Path -LiteralPath $testRoot)) {
        $resolvedTemp = [System.IO.Path]::GetFullPath($tempRoot).TrimEnd('\') + '\'
        $resolvedTest = [System.IO.Path]::GetFullPath($testRoot)
        if ($resolvedTest.StartsWith($resolvedTemp, [System.StringComparison]::OrdinalIgnoreCase) -and $resolvedTest -match 'selftest-ytrace-budget-pause-acl-[0-9a-f]{32}$') {
          Remove-Item -LiteralPath $resolvedTest -Recurse -Force
        }
      }
    }
    exit 0
  }
  if (-not $Path) { throw 'FIXED_STATE_PATH_REQUIRED' }
  if ($Action -eq 'Protect') {
    $approvedPath = Assert-TargetIsFixed $Path $stateRoot
    Set-ProtectedDirectoryAcl $approvedPath
    Assert-ProtectedPath $approvedPath $stateRoot | Out-Null
  } else {
    $approvedPath = Assert-VerifyTargetIsApproved $Path $stateRoot
    Assert-ProtectedPath $approvedPath $stateRoot | Out-Null
  }
  [pscustomobject]@{status='PASS';action=$Action;effectiveAclVerified=$true;secretValuesRead=$false} | ConvertTo-Json -Compress
  exit 0
} catch {
  $code = 'ACL_CHECK_FAILED'
  if ($_.Exception.Message -match '^[A-Z0-9_]+$') { $code = $_.Exception.Message }
  $result = @{status='BLOCKED';code=$code;secretValuesRead=$false}
  if ($Action -eq 'SelfTest') { $result.stage = $script:selfTestStage + ':' + $script:aclCheckStage; $result.exceptionType = $_.Exception.GetType().FullName; $result.line = $_.InvocationInfo.ScriptLineNumber }
  [pscustomobject]$result | ConvertTo-Json -Compress
  exit 2
}
