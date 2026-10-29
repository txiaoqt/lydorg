param([Parameter(Mandatory=$true)][ValidateSet('before','after')][string]$Phase)
$ErrorActionPreference='Stop'
$taskRoot='C:\Users\Christopher x Angel\.ytrace-production-budget-deletion-pause'
$taskExpected=@('control-plane-proof-history-0435d3d45351ed5879a40ad3d5e1c3f48b33e2de667e14ac1550bca46dff40fd.json','control-plane-proof-history-2c5c494289aec3af41befb52ced87eb962f83e7b8177abd5801dfba079fb66cf.json','control-plane-proof.json','preflight-20261013T104229359Z-a0bcdc9b-9465-4b70-8cbd-ae2f9a76058e.json') | Sort-Object
$taskChildren=@(Get-ChildItem -LiteralPath $taskRoot -Force)
if((($taskChildren.Name | Sort-Object) -join ',') -ne ($taskExpected -join ',')){throw 'UNEXPECTED_FOUR_FILE_OPERATOR_STATE'}
$taskSha=[Security.Cryptography.SHA256]::Create()
try{
  $taskRows=foreach($taskPath in @($taskRoot)+@($taskChildren.FullName | Sort-Object)){
    $taskItem=Get-Item -LiteralPath $taskPath -Force
    if($taskItem.Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'OPERATOR_STATE_REPARSE_POINT'}
    $taskAcl=Get-Acl -LiteralPath $taskPath
    [ordered]@{name=$taskItem.Name;directory=$taskItem.PSIsContainer;bytes=if($taskItem.PSIsContainer){$null}else{$taskItem.Length};createdAt=$taskItem.CreationTimeUtc.ToString('o');lastWriteAt=$taskItem.LastWriteTimeUtc.ToString('o');lastAccessAt=$taskItem.LastAccessTimeUtc.ToString('o');attributes=$taskItem.Attributes.ToString();aclSha256=([BitConverter]::ToString($taskSha.ComputeHash([Text.Encoding]::UTF8.GetBytes($taskAcl.Sddl)))).Replace('-','').ToLowerInvariant()}
  }
}finally{$taskSha.Dispose()}
$taskOutput=Join-Path $PSScriptRoot ('operator-state-'+$Phase+'.json')
$taskBytes=[Text.Encoding]::UTF8.GetBytes(([ordered]@{mode='METADATA_ONLY';files=$taskExpected;metadata=$taskRows;operatorFileContentsRead=$false;operatorStateModified=$false} | ConvertTo-Json -Depth 8)+"`n")
$taskStream=[IO.File]::Open($taskOutput,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
try{$taskStream.Write($taskBytes,0,$taskBytes.Length);$taskStream.Flush($true)}finally{$taskStream.Dispose()}
[ordered]@{status='PASS';phase=$Phase;operatorFiles=4;operatorStateModified=$false} | ConvertTo-Json -Compress
