param([Parameter(Mandatory=$true)][ValidateSet('before','after')][string]$Phase)
$ErrorActionPreference='Stop'
$taskRoot=Join-Path $env:USERPROFILE '.ytrace-production-budget-deletion-pause'
$taskExpected=@('control-plane-proof-history-0435d3d45351ed5879a40ad3d5e1c3f48b33e2de667e14ac1550bca46dff40fd.json','control-plane-proof.json') | Sort-Object
$taskChildren=@(Get-ChildItem -LiteralPath $taskRoot -Force)
if((($taskChildren.Name | Sort-Object) -join ',') -ne ($taskExpected -join ',')){throw 'UNEXPECTED_OPERATOR_STATE'}
$taskSha=[Security.Cryptography.SHA256]::Create()
try {
  $taskRows=foreach($taskPath in @($taskRoot)+@($taskChildren.FullName | Sort-Object)) {
    $taskItem=Get-Item -LiteralPath $taskPath -Force
    if($taskItem.Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'OPERATOR_STATE_REPARSE_POINT'}
    $taskAcl=Get-Acl -LiteralPath $taskPath
    $taskSddlBytes=[Text.Encoding]::UTF8.GetBytes($taskAcl.Sddl)
    [ordered]@{name=$taskItem.Name;directory=$taskItem.PSIsContainer;bytes=if($taskItem.PSIsContainer){$null}else{$taskItem.Length};createdAt=$taskItem.CreationTimeUtc.ToString('o');lastWriteAt=$taskItem.LastWriteTimeUtc.ToString('o');lastAccessAt=$taskItem.LastAccessTimeUtc.ToString('o');attributes=$taskItem.Attributes.ToString();aclSha256=([BitConverter]::ToString($taskSha.ComputeHash($taskSddlBytes))).Replace('-','').ToLowerInvariant()}
  }
} finally {$taskSha.Dispose()}
$taskEvidence=[ordered]@{mode='METADATA_ONLY_NO_PROOF_CONTENT_READ';stateFiles=$taskExpected;properties=$taskRows;knownProofHashesFromPriorReceipts=[ordered]@{archive='0435d3d45351ed5879a40ad3d5e1c3f48b33e2de667e14ac1550bca46dff40fd';active='2c5c494289aec3af41befb52ced87eb962f83e7b8177abd5801dfba079fb66cf'};hashesRecomputedInThisTask=$false}
$taskOutput=Join-Path $PSScriptRoot ('operator-metadata-'+$Phase+'.json')
if(Test-Path -LiteralPath $taskOutput){throw 'METADATA_EVIDENCE_ALREADY_EXISTS'}
[IO.File]::WriteAllText($taskOutput,($taskEvidence | ConvertTo-Json -Depth 8)+"`n",[Text.UTF8Encoding]::new($false))
[ordered]@{status='PASS';phase=$Phase;operatorFiles=$taskChildren.Count;proofContentsRead=$false;operatorStateModified=$false} | ConvertTo-Json -Compress
