const url = "https://wctcuuftrcqrfaqgkoxc.supabase.co/pg-meta/default/query";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjdGN1dWZ0cmNxcmZhcWdrb3hjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjQ5ODMxMSwiZXhwIjoyMDkyMDc0MzExfQ.qPYjo74FI8ug1hDv08VYEKjXYWzKdmbGQmOCd2-JslQ";

fetch(url, { 
  method: 'POST',
  headers: { 
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ query: 'SELECT 1;' })
})
  .then(async (res) => {
    console.log("Status:", res.status);
    console.log(await res.text());
  })
  .catch(console.error);
