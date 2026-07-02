const fs = require('fs');
try {
  require('./src/handlers/auth/getCaptcha');
  console.log("Success");
} catch(e) {
  console.log(e);
}
