# start-nodes.ps1
# Starts 3 storage nodes in separate PowerShell windows on Windows.
# Run from the project root: .\start-nodes.ps1

Write-Host "Starting 3 DFS storage nodes..." -ForegroundColor Cyan

Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$env:PORT='4001'; `$env:NODE_ID='node1'; node storage-node/server.js" -WorkingDirectory $PSScriptRoot

Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$env:PORT='4002'; `$env:NODE_ID='node2'; node storage-node/server.js" -WorkingDirectory $PSScriptRoot

Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$env:PORT='4003'; `$env:NODE_ID='node3'; node storage-node/server.js" -WorkingDirectory $PSScriptRoot

Write-Host "Storage nodes starting on ports 4001, 4002, 4003" -ForegroundColor Green
Write-Host "Now run: cd backend; npm run dev" -ForegroundColor Yellow
