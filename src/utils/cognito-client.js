/**
 * CLIENT-SIDE CODE - Calls Cognito DIRECTLY. No custom backend API for auth.
 * 
 * Uses amazon-cognito-identity-js (works in browser or React Native).
 * npm install amazon-cognito-identity-js
 * 
 * Flow:
 *   1. signUp()          -> client calls Cognito directly
 *   2. confirmSignUp()   -> client calls Cognito directly
 *                           (Cognito internally fires Post Confirmation trigger,
 *                            which generates the reg number and writes it to
 *                            preferred_username - all server-side, invisible to client)
 *   3. login()           -> client calls Cognito directly using EITHER email
 *                           OR the registration number as username (both work,
 *                           because preferred_username is aliased)
 *   4. getRegistrationNumber() -> client calls Cognito directly to read it back
 */

import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute
} from 'amazon-cognito-identity-js';

const poolData = {
  UserPoolId: 'ap-south-1_nUUpexOF8',   // Your User Pool ID (derived from .env)
  ClientId: '4kd4ni8ebhhu4l0v3iv0rl2prm' // Your App Client ID (derived from .env)
};

const userPool = new CognitoUserPool(poolData);

/**
 * Step 1: Sign up directly against Cognito.
 * examId is passed as clientMetadata so the Pre Sign-up / Post Confirmation
 * Lambda triggers can read it via event.request.clientMetadata.
 */
function signUp(email, password, examId) {
  return new Promise((resolve, reject) => {
    const attributeList = [
      new CognitoUserAttribute({ Name: 'email', Value: email })
    ];

    userPool.signUp(
      email,           // Cognito username = email at creation time
      password,
      attributeList,
      null,
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      },
      { examId } // clientMetadata - read by Lambda triggers
    );
  });
}

/**
 * Step 2: Confirm the email verification code.
 * This single call is what triggers Cognito's Post Confirmation Lambda
 * server-side - the client has no idea that DB writes are happening.
 */
function confirmSignUp(email, confirmationCode) {
  return new Promise((resolve, reject) => {
    const cognitoUser = new CognitoUser({ Username: email, Pool: userPool });

    cognitoUser.confirmRegistration(confirmationCode, true, (err, result) => {
      if (err) return reject(err);
      resolve(result); // by the time this resolves, reg number already exists
    });
  });
}

/**
 * Step 3: Login using EITHER email or the registration number.
 * Works unmodified for both because preferred_username is an alias attribute.
 */
function login(usernameOrRegNumber, password) {
  return new Promise((resolve, reject) => {
    const authDetails = new AuthenticationDetails({
      Username: usernameOrRegNumber,
      Password: password
    });

    const cognitoUser = new CognitoUser({
      Username: usernameOrRegNumber,
      Pool: userPool
    });

    cognitoUser.authenticateUser(authDetails, {
      onSuccess: (session) => {
        resolve({
          accessToken: session.getAccessToken().getJwtToken(),
          idToken: session.getIdToken().getJwtToken(),
          refreshToken: session.getRefreshToken().getToken()
        });
      },
      onFailure: (err) => reject(err),
      // Handle NEW_PASSWORD_REQUIRED etc. here if relevant
    });
  });
}

/**
 * Step 4: Read the registration number back, directly from Cognito,
 * using the current session (no DB call from the client - ever).
 */
function getRegistrationNumber(cognitoUser) {
  return new Promise((resolve, reject) => {
    cognitoUser.getSession((err, session) => {
      if (err) return reject(err);
      if (!session.isValid()) return reject(new Error('Session invalid'));

      cognitoUser.getUserAttributes((err, attributes) => {
        if (err) return reject(err);
        // Fallback-friendly lookup to support either registration_number or registration_no custom attribute
        const regAttr = attributes.find(a => a.Name === 'custom:registration_number' || a.Name === 'custom:registration_no');
        resolve(regAttr ? regAttr.Value : null);
      });
    });
  });
}

function getCurrentUser() {
  return userPool.getCurrentUser();
}

function logout() {
  const cognitoUser = userPool.getCurrentUser();
  if (cognitoUser) cognitoUser.signOut();
}

export {
  signUp,
  confirmSignUp,
  login,
  getRegistrationNumber,
  getCurrentUser,
  logout
};
