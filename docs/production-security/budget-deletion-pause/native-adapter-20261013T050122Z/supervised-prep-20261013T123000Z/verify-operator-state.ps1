$ErrorActionPreference='Stop'
$taskRoot='C:\Users\Christopher x Angel\.ytrace-production-budget-deletion-pause'
$taskHelper=Join-Path $PSScriptRoot '..\operation-acl.ps1'
$taskExpected=@('control-plane-proof-history-0435d3d45351ed5879a40ad3d5e1c3f48b33e2de667e14ac1550bca46dff40fd.json','control-plane-proof-history-2c5c494289aec3af41befb52ced87eb962f83e7b8177abd5801dfba079fb66cf.json','control-plane-proof.json','preflight-20261013T104229359Z-a0bcdc9b-9465-4b70-8cbd-ae2f9a76058e.json') | Sort-Object
$taskHashes=@{'control-plane-proof-history-0435d3d45351ed5879a40ad3d5e1c3f48b33e2de667e14ac1550bca46dff40fd.json'='0435d3d45351ed5879a40ad3d5e1c3f48b33e2de667e14ac1550bca46dff40fd';'control-plane-proof-history-2c5c494289aec3af41befb52ced87eb962f83e7b8177abd5801dfba079fb66cf.json'='2c5c494289aec3af41befb52ced87eb962f83e7b8177abd5801dfba079fb66cf';'control-plane-proof.json'='79a508950d5a04eda66634e9ef8bb17eb51756abdcd979b6b996866a9077ced1';'preflight-20261013T104229359Z-a0bcdc9b-9465-4b70-8cbd-ae2f9a76058e.json'='6e5869fcde18f45edfef0ba0a9709d4d0530204d89c6dfd548f55dc719dece81'}
try{
  $actualRoot=[IO.Path]::GetFullPath((Join-Path $env:USERPROFILE '.ytrace-production-budget-deletion-pause'))
  if(-not $actualRoot.Equals($taskRoot,[StringComparison]::OrdinalIgnoreCase)){throw 'FIXED_OPERATOR_ROOT_MISMATCH'}
  $taskChildren=@(Get-ChildItem -LiteralPath $taskRoot -Force)
  if((($taskChildren.Name | Sort-Object) -join ',') -ne ($taskExpected -join ',')){throw 'UNEXPECTED_FOUR_FILE_OPERATOR_STATE'}
  foreach($absent in @('authorization.json','approved-preflight.json','control-plane-proof-history-79a508950d5a04eda66634e9ef8bb17eb51756abdcd979b6b996866a9077ced1.json')){if(Test-Path -LiteralPath (Join-Path $taskRoot $absent)){throw 'UNEXPECTED_PRESENT_FILE'}}
  $reference=Get-Content -LiteralPath (Join-Path $PSScriptRoot '..\installation-readiness-20261013T112300Z\operator-state-after.json') -Raw | ConvertFrom-Json
  $sha=[Security.Cryptography.SHA256]::Create()
  try{
    $rows=foreach($taskPath in @($taskRoot)+@($taskChildren.FullName | Sort-Object)){
      $item=Get-Item -LiteralPath $taskPath -Force
      if($item.Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'OPERATOR_STATE_REPARSE_POINT'}
      $aclHash=([BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes((Get-Acl -LiteralPath $taskPath).Sddl)))).Replace('-','').ToLowerInvariant()
      $expected=@($reference.metadata | Where-Object {$_.name -eq $item.Name})
      if($expected.Count -ne 1){throw 'OPERATOR_REFERENCE_METADATA_MISSING'}
      $e=$expected[0]
      $bytes=if($item.PSIsContainer){$null}else{$item.Length}
      if($bytes -ne $e.bytes -or $item.Attributes.ToString() -ne $e.attributes -or $aclHash -ne $e.aclSha256){throw 'OPERATOR_PROTECTED_PROPERTY_MISMATCH'}
      if($item.CreationTimeUtc.ToString('o') -ne [string]$e.createdAt -or $item.LastWriteTimeUtc.ToString('o') -ne [string]$e.lastWriteAt){throw 'OPERATOR_PROTECTED_TIMESTAMP_MISMATCH'}
      $contentHash=$null
      if(-not $item.PSIsContainer){$contentHash=(Get-FileHash -LiteralPath $taskPath -Algorithm SHA256).Hash.ToLowerInvariant();if($contentHash -ne $taskHashes[$item.Name]){throw 'OPERATOR_FILE_HASH_MISMATCH'}}
      $acl=& powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File $taskHelper -Action Verify -Path $taskPath
      if($LASTEXITCODE -ne 0 -or ($acl | ConvertFrom-Json).status -ne 'PASS'){throw 'OPERATOR_EFFECTIVE_ACL_CHECK_FAILED'}
      [ordered]@{name=$item.Name;directory=$item.PSIsContainer;bytes=$bytes;createdAt=$item.CreationTimeUtc.ToString('o');lastWriteAt=$item.LastWriteTimeUtc.ToString('o');lastAccessAt=$item.LastAccessTimeUtc.ToString('o');attributes=$item.Attributes.ToString();aclSha256=$aclHash;sha256=$contentHash;effectiveAclVerified=$true}
    }
  }finally{$sha.Dispose()}
  $others=@(Get-ChildItem -LiteralPath $taskRoot -Force | Where-Object {$_.Name -match 'lock|marker|attempt'})
  if($others.Count -ne 0){throw 'LOCK_OR_MARKER_PRESENT'}
  $result=[ordered]@{status='PASS';phase='before-archive';files=$taskExpected;metadata=$rows;authorizationExists=$false;approvedPreflightExists=$false;lockExists=$false;attemptMarkerExists=$false;archiveDestinationAbsent=$true;operatorStateModified=$false;verifiedAt=[DateTime]::UtcNow.ToString('o')}
  $bytesOut=[Text.Encoding]::UTF8.GetBytes(($result | ConvertTo-Json -Depth 8)+"`n")
  $stream=[IO.File]::Open((Join-Path $PSScriptRoot 'operator-state-before.json'),[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
  try{$stream.Write($bytesOut,0,$bytesOut.Length);$stream.Flush($true)}finally{$stream.Dispose()}
  [ordered]@{status='PASS';operatorFiles=4;hashesMatched=$true;timestampsAclsMatched=$true;authorizationLockMarkerAbsent=$true;operatorStateModified=$false} | ConvertTo-Json -Compress
}catch{
  $code=if($_.Exception.Message -match '^[A-Z0-9_]+$'){$_.Exception.Message}else{'OPERATOR_STATE_CHECK_FAILED'}
  [ordered]@{status='BLOCKED';code=$code;operatorStateModified=$false} | ConvertTo-Json -Compress
  exit 2
}
