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
$body = @{
  email = $adminEmail
  password = $adminPassword
} | ConvertTo-Json -Compress

$loginResponse = Invoke-WebRequest `
  -Uri "$baseUrl/api/auth/login" `
  -Method Post `
  -ContentType 'application/json' `
  -Body $body `
  -UseBasicParsing

$cookie = Get-CookiePair $loginResponse.Headers
$adminPassword = $null
$body = $null

try {
  $usersResponse = Invoke-WebRequest `
    -Uri "$baseUrl/api/admin/users" `
    -Headers @{ Cookie = $cookie } `
    -UseBasicParsing

  $usersResponse.Content
}
catch {
  if ($_.ErrorDetails.Message) {
    $_.ErrorDetails.Message
  }
  else {
    $_.Exception.Message
  }
}
finally {
  $cookie = $null
}