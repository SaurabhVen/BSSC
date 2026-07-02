const AWS = require('aws-sdk');
const crypto = require('crypto');

const clientId = '4d7mif0h3qqgqs8l1drq8gg32m';
const clientSecret = '1ad0ph66bcscp80eip0c6tb5anq2bnlhaj4ob1pckbsvriegj5mk';
const username = 'shivam+H389@vensysco.in';
const password = 'Shivam@12345';
const region = 'ap-south-1';

AWS.config.update({ region: region });
const cognito = new AWS.CognitoIdentityServiceProvider();

const message = username + clientId;
const secretHash = crypto.createHmac('SHA256', clientSecret).update(message).digest('base64');

const params = {
    AuthFlow: 'USER_PASSWORD_AUTH',
    ClientId: clientId,
    AuthParameters: {
        USERNAME: username,
        PASSWORD: password
    }
};

cognito.initiateAuth(params, function(err, data) {
    if (err) console.log(err, err.stack);
    else {
        console.log("IdToken:\n" + data.AuthenticationResult.IdToken);
        console.log("\nAccessToken:\n" + data.AuthenticationResult.AccessToken);
    }
});
