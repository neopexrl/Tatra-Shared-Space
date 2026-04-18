const url = "https://wctcuuftrcqrfaqgkoxc.supabase.co/rest/v1/";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjdGN1dWZ0cmNxcmZhcWdrb3hjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjQ5ODMxMSwiZXhwIjoyMDkyMDc0MzExfQ.qPYjo74FI8ug1hDv08VYEKjXYWzKdmbGQmOCd2-JslQ";
fetch(url, { headers: { apikey: key } })
  .then(res => res.json())
  .then(data => {
    console.log("check_list:", data.definitions.check_list);
    console.log("checks:", data.definitions.checks);
    console.log("reminders (if any):", data.definitions.reminders || "none");
  })
  .catch(console.error);
