import { verifyJwt } from '../src/utils/cognito';

async function test() {
  const rawToken = `eyJraWQiOiJVcHNWbTkrMVBDZUJRb3J1M3NrbEQ0My9TWFpsV3FSdm50ZGJlUX
hPSFBBPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiI4MTgzZWQ5YS05MDExLTcwODktNzRiNi01NzAzMz
RhMTkzMGEiLCJpc3MiOiJodHRwczovL2NvZ25pdG8taWRwLmFwLXNvdXRoLTEuYW1hem9uYXdzLmNvbS
9hcC1zb3V0aC0xX25VVXBleE9GOCIsImNsaWVudF9pZCI6IjRrZDRuaThlYmhodTRsMHYzaXYwcmwycH
JtIiwib3JpZ2luX2p0aSI6ImJhZTNjODk2LTFjNjgtNDk2OS05NDE3LTZiY2NhYzBlYWZlMiIsImV2ZW
50X2lkIjoiMzc5MTMyZDEtNDU3Yy00YjRlLThjNzgtZjliN2E2Zjg3YWYwIiwidG9rZW5fdXNlIjoiYW
NjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MT
c4MzY2MTY4OCwiZXhwIjoxNzgzNjY1Mjg4LCJpYXQiOjE3ODM2NjE2ODgsImp0aSI6IjdmMGVkMGY1LT
A0MGUtNGZhMi1iNTg4LTZiMDhjMDc3YTg0MSIsInVzZXJuYW1lIjoic2F1cmFiaCs5QHZlbnN5c2NvLm
luIn0.DSCyNHTgk8qpjSHxVazG4uvtY6M0wNpBlST7vg87xwmMehMgDNa6DMpDKm6xBdshD7o1wxSNRG
bFtfAn0NQOno_1ilAtaO6xOx7cn8V67bpmvHoV4uBqm8PDzP8ffko_D9z5fx8Mdp6CJM-wbavcj1G1QD
eLyN4AXwvufwy5F-Ku8w4ePEq03cNjiouWf3JNq5q-B4SySEZk3ETE5AzEIlk7CUluC1tI8y8ir5zFAX
CQOkZiXmvBhobpwn1j_tAI1hJJPMvHL23wniKW036E-ckjVmv4MeAC_eVHpx20i-2vECAovWq8tNDJl3
Gsrthz55G25NGi3emMBMDC9IAJEQ`;

  const token = rawToken.replace(/\s+/g, '');
  try {
    const payload = await verifyJwt(token);
    console.log('Verification Success! Payload:', payload);
  } catch (err: any) {
    console.error('Verification Failed!');
    console.error('Error message:', err.message);
  }
}

test();
