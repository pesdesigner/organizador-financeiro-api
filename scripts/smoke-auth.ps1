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

$adminEmail = Read-Host 'E-mail do admin'
$adminPassword = Read-SecretText 'Senha do admin'
$adminBody = @{
  email = $adminEmail
  password = $adminPassword
} | ConvertTo-Json -Compress

$adminResponse = Invoke-WebRequest `
  -Uri "$baseUrl/api/auth/login" `
  -Method Post `
  -ContentType 'application/json' `
  -Body $adminBody `
  -UseBasicParsing

$adminCookie = Get-CookiePair $adminResponse.Headers
$adminPassword = $null
$adminBody = $null

$adminMe = Invoke-RestMethod `
  -Uri "$baseUrl/api/auth/me" `
  -Headers @{ Cookie = $adminCookie }

if ($adminMe.user.role -ne 'admin') {
  throw 'A sessão não foi autenticada como admin.'
}

$inviteEmail = Read-Host 'E-mail de teste para convidar'
$inviteBody = @{ email = $inviteEmail } | ConvertTo-Json -Compress

$invite = Invoke-RestMethod `
  -Uri "$baseUrl/api/admin/invites" `
  -Method Post `
  -ContentType 'application/json' `
  -Headers @{ Cookie = $adminCookie } `
  -Body $inviteBody

$registerName = Read-Host 'Nome do usuário de teste'
$registerPassword = Read-SecretText 'Senha do usuário de teste'
$registerConfirmation = Read-SecretText 'Confirme a senha'

if ($registerPassword -ne $registerConfirmation) {
  throw 'As senhas do usuário de teste não conferem.'
}

$registerBody = @{
  token = $invite.invite.token
  name = $registerName
  password = $registerPassword
} | ConvertTo-Json -Compress

$registerResponse = Invoke-WebRequest `
  -Uri "$baseUrl/api/auth/register" `
  -Method Post `
  -ContentType 'application/json' `
  -Body $registerBody `
  -UseBasicParsing

$registerCookie = Get-CookiePair $registerResponse.Headers
$registerPassword = $null
$registerConfirmation = $null
$registerBody = $null

$registeredMe = Invoke-RestMethod `
  -Uri "$baseUrl/api/auth/me" `
  -Headers @{ Cookie = $registerCookie }

$adminUsers = Invoke-RestMethod `
  -Uri "$baseUrl/api/admin/users" `
  -Headers @{ Cookie = $adminCookie }

$foundUser = $adminUsers.users |
  Where-Object { $_.email -eq $inviteEmail.ToLower() } |
  Select-Object -First 1

[PSCustomObject]@{
  AdminLogin = $adminMe.user.role
  RegisteredUser = $registeredMe.user.email
  RegisteredRole = $registeredMe.user.role
  ListedByAdmin = [bool]$foundUser
} | Format-List

$adminCookie = $null
$registerCookie = $null
$invite = $null