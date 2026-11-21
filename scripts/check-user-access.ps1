$ErrorActionPreference = 'Stop'
$baseUrl = 'http://localhost:3000'

function Read-SecretText([string]$prompt) {
  $secure = Read-Host -Prompt $prompt -AsSecureString
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)

  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  }
  finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
  }
}

function Get-CookiePair($headers) {
  $setCookie = [string](@($headers['Set-Cookie'])[0])

  if ([string]::IsNullOrWhiteSpace($setCookie)) {
    throw 'A resposta não trouxe o cookie de sessão.'
  }

  return $setCookie.Split(';')[0]
}

function Invoke-Login([string]$email, [string]$password) {
  $body = @{
    email = $email
    password = $password
  } | ConvertTo-Json -Compress

  $response = Invoke-WebRequest `
    -Uri "$baseUrl/api/auth/login" `
    -Method Post `
    -ContentType 'application/json' `
    -Body $body `
    -UseBasicParsing

  return [PSCustomObject]@{
    Cookie = Get-CookiePair $response.Headers
    User = ($response.Content | ConvertFrom-Json).user
  }
}

function Assert-Unauthorized([string]$cookie) {
  try {
    Invoke-RestMethod `
      -Uri "$baseUrl/api/auth/me" `
      -Headers @{ Cookie = $cookie } | Out-Null

    throw 'Esperava 401, mas a sessão continuou válida.'
  }
  catch {
    if (
      $_.Exception.Response -and
      [int]$_.Exception.Response.StatusCode -eq 401
    ) {
      return
    }

    throw
  }
}

$adminEmail = Read-Host 'E-mail do admin'
$adminPassword = Read-SecretText 'Senha do admin'
$adminLogin = Invoke-Login $adminEmail $adminPassword
$adminPassword = $null

if ($adminLogin.User.role -ne 'admin') {
  throw 'A conta informada não é admin.'
}

$testEmail = Read-Host 'E-mail do usuário de teste'
$testPassword = Read-SecretText 'Senha do usuário de teste'
$userLogin = Invoke-Login $testEmail $testPassword
$testPassword = $null

if ($userLogin.User.role -ne 'user') {
  throw 'A conta informada não é um usuário comum.'
}

$usersResult = Invoke-RestMethod `
  -Uri "$baseUrl/api/admin/users" `
  -Headers @{ Cookie = $adminLogin.Cookie }

$target = $usersResult.users |
  Where-Object { $_.email -eq $testEmail.ToLower() } |
  Select-Object -First 1

if (-not $target) {
  throw 'O usuário de teste não apareceu na lista do admin.'
}

$originalStatus = $target.status

if ($originalStatus -ne 'active') {
  throw 'O usuário de teste precisa estar ativo para executar este fluxo.'
}

try {
  $disableBody = @{
    userId = $target.id
    status = 'disabled'
  } | ConvertTo-Json -Compress

  Invoke-RestMethod `
    -Uri "$baseUrl/api/admin/users" `
    -Method Patch `
    -ContentType 'application/json' `
    -Headers @{ Cookie = $adminLogin.Cookie } `
    -Body $disableBody | Out-Null

  Assert-Unauthorized $userLogin.Cookie

  $enableBody = @{
    userId = $target.id
    status = 'active'
  } | ConvertTo-Json -Compress

  Invoke-RestMethod `
    -Uri "$baseUrl/api/admin/users" `
    -Method Patch `
    -ContentType 'application/json' `
    -Headers @{ Cookie = $adminLogin.Cookie } `
    -Body $enableBody | Out-Null

  $freshUserLogin = Invoke-Login $testEmail (
    Read-SecretText 'Digite novamente a senha do usuário de teste'
  )

  Invoke-WebRequest `
    -Uri "$baseUrl/api/auth/logout" `
    -Method Post `
    -Headers @{ Cookie = $freshUserLogin.Cookie } `
    -UseBasicParsing | Out-Null

  Assert-Unauthorized $freshUserLogin.Cookie

  Write-Host 'OK: desativação revogou a sessão do usuário.'
  Write-Host 'OK: reativação permitiu novo login.'
  Write-Host 'OK: logout encerrou a nova sessão.'
}
finally {
  $restoreBody = @{
    userId = $target.id
    status = $originalStatus
  } | ConvertTo-Json -Compress

  try {
    Invoke-RestMethod `
      -Uri "$baseUrl/api/admin/users" `
      -Method Patch `
      -ContentType 'application/json' `
      -Headers @{ Cookie = $adminLogin.Cookie } `
      -Body $restoreBody | Out-Null
  }
  catch {
    Write-Warning 'Não consegui restaurar o estado original. Confira o usuário no Atlas.'
  }
}