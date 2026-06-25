$url = 'https://lukdttglyLgqcwyxrxxj.supabase.co/rest/v1/inventory_items?select=id&limit=1'
$key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1a2R0dGdseWxncWN3eXhyeHhqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMTQyMDkwMSwiZXhwIjoyMDQ2OTk2OTAxfQ.z5P-OfXjR6d4v5V_Vp5H9M8L9Q5L8N9U7V8L9Q5L8N9'
$headers = @{'Authorization'="Bearer $key"; 'Content-Type'='application/json'}

try {
  Write-Host "Attempting to connect to Supabase..."
  $result = Invoke-RestMethod -Uri $url -Headers $headers -TimeoutSec 10
  Write-Host "SUCCESS: Connected successfully"
  Write-Host "Response count: $($result.Count)"
} catch {
  Write-Host "FAILED: $($_.Exception.Message)"
}
