const jwt = require('jsonwebtoken');
const jwksRsa = require('jwks-rsa');

const token = 'eyJraWQiOiJXUk5aNU56SjBIL0YvbU42MUhiNVhMUE1ZT09tNkdmeVczKzNiaDRsbS9BPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiIyMWMzN2Q1YS05MDkxLTcwYjUtNjgyZC1kMTRlZDRhNTllOWUiLCJpc3MiOiJodHRwczovL2NvZ25pdG8taWRwLmFwLXNvdXRoLTEuYW1hem9uYXdzLmNvbS9hcC1zb3V0aC0xX0FEamw2YWhWZyIsImNsaWVudF9pZCI6IjNmM3FnZjRoOXFwcHZzMHZiaDQxMW83b3RiIiwib3JpZ2luX2p0aSI6IjY4YmNlMGVlLTZiN2ItNDhjNC05Yjk1LWEwYzhmZWNkMTk1ZiIsImV2ZW50X2lkIjoiZDBkN2M0MjItOTQzMi00Y2VjLTk3ZDktYmVlNTcxNGQzM2VlIiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTc4MDczMTMyMiwiZXhwIjoxNzgwNzM0OTIyLCJpYXQiOjE3ODA3MzEzMjIsImp0aSI6IjBkYmRlMTYyLTRkZjItNDVlOS1hMjhkLWY0NGI2ZGUxNWJiYyIsInVzZXJuYW1lIjoic2hpdmFtIn0.rkwvPLXRwV8oSlayKSVyBq_qMAE5CjLSXWF9ASRiuudKICxyTlo-AkivCi6ibY4gDuuT4liUvdN3SCZG3-yruKVEeiOEQ61ESwI9ZdU6DJl12ZtJ24oReXTJZ9tde2GqkcrV9eeX4FQF7-3yoD-osZIRa0cbKDkaRp3WQksyKM3ibFBvrFj3dE6v-aSttyug5O8sN9EWhCA9MAcMgO92VTBeDqGLw8lzytljliMiN0saeYLx7RwOA-I5lIzcJ-c4rehjgvAG9Czfty21m7PL7AruiADTKDhtHb-MVgJMgPzoFPAfOo--1Ikvpg5Wem-YevKlBMAegFN9PwP45Vb50Q';

const decoded = jwt.decode(token, { complete: true });
console.log('Decoded Token Header:', decoded.header);
console.log('Decoded Token Payload:', decoded.payload);

// Test local verification with secret
try {
  jwt.verify(token, 'c807e8068945233498906c2158e63747ab9cdc6f8146ed280a9b81b768f7867e');
  console.log('Verification with JWT_SECRET succeeded!');
} catch (e) {
  console.error('Verification with JWT_SECRET failed:', e.message);
}

// Test verification using JWKS from Cognito Issuer in Token
const client = jwksRsa({
  jwksUri: `${decoded.payload.iss}/.well-known/jwks.json`
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, function(err, key) {
    if (err) {
      callback(err);
    } else {
      const signingKey = key.publicKey || key.rsaPublicKey;
      callback(null, signingKey);
    }
  });
}

jwt.verify(token, getKey, { issuer: decoded.payload.iss }, (err, verified) => {
  if (err) {
    console.error('JWKS Verification failed:', err);
  } else {
    console.log('JWKS Verification succeeded! Verified payload:', verified);
  }
});
