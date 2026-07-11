async function runTest() {
  const token = 'eyJraWQiOiJVcHNWbTkrMVBDZUJRb3J1M3NrbEQ0My9TWFpsV3FSdm50ZGJlUXhPSFBBPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiI4MTgzZWQ5YS05MDExLTcwODktNzRiNi01NzAzMzRhMTkzMGEiLCJpc3MiOiJodHRwczovL2NvZ25pdG8taWRwLmFwLXNvdXRoLTEuYW1hem9uYXdzLmNvbS9hcC1zb3V0aC0xX25VVXBleE9GOCIsImNsaWVudF9pZCI6IjRrZDRuaThlYmhodTRsMHYzaXYwcmwycHJtIiwib3JpZ2luX2p0aSI6ImJhZTNjODk2LTFjNjgtNDk2OS05NDE3LTZiY2NhYzBlYWZlMiIsImV2ZW50X2lkIjoiMzc5MTMyZDEtNDU3Yy00YjRlLThjNzgtZjliN2E2Zjg3YWYwIiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTc4MzY2MTY4OCwiZXhwIjoxNzgzNjY1Mjg4LCJpYXQiOjE3ODM2NjE2ODgsImp0aSI6IjdmMGVkMGY1LTA0MGUtNGZhMi1iNTg4LTZiMDhjMDc3YTg0MSIsInVzZXJuYW1lIjoic2F1cmFiaCs5QHZlbnN5c2NvLmluIn0.DSCyNHTgk8qpjSHxVazG4uvtY6M0wNpBlST7vg87xwmMehMgDNa6DMpDKm6xBdshD7o1wxSNRGbFtfAn0NQOno_1ilAtaO6xOx7cn8V67bpmvHoV4uBqm8PDzP8ffko_D9z5fx8Mdp6CJM-wbavcj1G1QDeLyN4AXwvufwy5F-Ku8w4ePEq03cNjiouWf3JNq5q-B4SySEZk3ETE5AzEIlk7CUluC1tI8y8ir5zFAXCkOkZiXmvBhobpwn1j_tAI1hJJPMvHL23wniKW036E-ckjVmv4MeAC_eVHpx20i-2vECAovWq8tNDJl3Gsrthz55G25NGi3emMBMDC9IAJEQ';
  console.log('Testing GET http://127.0.0.1:3000/api/v1/application/steps/all...');
  try {
    const res = await fetch('http://127.0.0.1:3000/api/v1/application/steps/all', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    console.log('Status:', res.status);
    const json = await res.json();
    console.log('Response body:', JSON.stringify(json, null, 2));
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

runTest();
