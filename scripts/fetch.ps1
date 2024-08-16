$scriptPath = split-path -parent $PSScriptRoot
$targetPath = $scriptPath;
"build", "openfly.extend.dict.yaml" | ForEach-Object -Process { $targetPath = Join-Path -Path $targetPath $_ }
$url="https://github.com/Yiklek/oh-my-rime/releases/download/latest/openfly.extend.dict.yaml"
curl.exe -L $url -o $targetPath
