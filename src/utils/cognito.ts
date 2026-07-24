import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  SignUpCommand,
  ConfirmSignUpCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
  GlobalSignOutCommand,
  ResendConfirmationCodeCommand,
  AdminGetUserCommand,
  AdminDeleteUserCommand,
  AdminUpdateUserAttributesCommand,
  type InitiateAuthCommandInput,
  type SignUpCommandInput,
  ListUsersCommand,
  ListUserPoolsCommand,
  AdminSetUserPasswordCommand,
  GetUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import jwt from 'jsonwebtoken';
import jwksRsa from 'jwks-rsa';
import { createHmac } from 'crypto';
import config from '../config';

export interface CognitoTokens {
  accessToken: string;
  refreshToken: string;
  idToken?: string;
  expiresIn: number;
}

export interface MockUser {
  userId: string;
  email: string;
  password: string;
  roles: string[];
}

const cognitoClient = new CognitoIdentityProviderClient({
  region: config.AWS_REGION,
});

const computeSecretHash = (username: string): string | undefined => {
  if (!config.COGNITO_CLIENT_SECRET || config.COGNITO_CLIENT_SECRET === 'mockClientSecret1234567890') {
    return undefined;
  }
  return createHmac('sha256', config.COGNITO_CLIENT_SECRET)
    .update(username + config.COGNITO_CLIENT_ID)
    .digest('base64');
};

const mockUsers: Map<string, MockUser> = new Map([
  [
    'admin@test.com',
    {
      userId: 'mock-admin-uuid-001',
      email: 'admin@test.com',
      password: 'Admin@12345',
      roles: ['admin'],
    },
  ],
  [
    'candidate@test.com',
    {
      userId: 'mock-candidate-uuid-001',
      email: 'candidate@test.com',
      password: 'Candidate@12345',
      roles: ['candidate'],
    },
  ],
]);

const generateMockTokens = (email: string, userId: string): CognitoTokens => ({
  accessToken: jwt.sign(
    { sub: userId, email, 'cognito:groups': ['Candidates'] },
    config.JWT_SECRET,
    { expiresIn: 3600 }
  ),
  refreshToken: jwt.sign({ sub: userId }, config.JWT_SECRET, {
    expiresIn: '30d',
  }),
  idToken: jwt.sign({ sub: userId, email }, config.JWT_SECRET, {
    expiresIn: 3600,
  }),
  expiresIn: 3600,
});

// ── Login ────────────────────────────────────────────────────

export const cognitoLogin = async (email: string, password: string): Promise<CognitoTokens> => {
  if (config.MOCK_COGNITO) {
    const { userRepository } = await import('../repositories/user.repository');
    const dbUser = await userRepository.findByEmail(email).catch(() => null);

    if (dbUser) {
      const userWithRole = await userRepository.findUserWithRole(dbUser.id).catch(() => null);
      const roleName = userWithRole?.roleName ?? 'candidate';
      const roleGroup = roleName.charAt(0).toUpperCase() + roleName.slice(1) + 's';
      return {
        accessToken: jwt.sign(
          { sub: dbUser.id, email: dbUser.email, 'cognito:groups': [roleGroup] },
          config.JWT_SECRET,
          { expiresIn: 3600 }
        ),
        refreshToken: jwt.sign({ sub: dbUser.id }, config.JWT_SECRET, {
          expiresIn: '30d',
        }),
        idToken: jwt.sign({ sub: dbUser.id, email: dbUser.email }, config.JWT_SECRET, {
          expiresIn: 3600,
        }),
        expiresIn: 3600,
      };
    }

    const user = mockUsers.get(email.toLowerCase());
    if (!user || user.password !== password) {
      throw new Error(
        'The username or password you entered is incorrect. Please check your details and try again.'
      );
    }
    return generateMockTokens(user.email, user.userId);
  }

  const secretHash = computeSecretHash(email);
  const params: InitiateAuthCommandInput = {
    AuthFlow: 'USER_PASSWORD_AUTH',
    ClientId: config.COGNITO_CLIENT_ID,
    AuthParameters: {
      USERNAME: email,
      PASSWORD: password,
      ...(secretHash ? { SECRET_HASH: secretHash } : {}),
    },
  };

  const command = new InitiateAuthCommand(params);
  const result = await cognitoClient.send(command);

  return {
    accessToken: result.AuthenticationResult?.AccessToken ?? '',
    refreshToken: result.AuthenticationResult?.RefreshToken ?? '',
    idToken: result.AuthenticationResult?.IdToken ?? '',
    expiresIn: result.AuthenticationResult?.ExpiresIn ?? 3600,
  };
};

// ── Register ─────────────────────────────────────────────────

// export const cognitoRegister = async (
//   email: string,
//   password: string,
//   attributes: Record<string, string> = {}
// ): Promise<{ userSub: string }> => {
//   if (config.MOCK_COGNITO) {
//     const { v4: uuidv4 } = await import('uuid');
//     const mockId = uuidv4();
//     mockUsers.set(email.toLowerCase(), {
//       userId: mockId,
//       email,
//       password,
//       roles: ['candidate'],
//     });
//     return { userSub: mockId };
//   }

//   const params: SignUpCommandInput = {
//     ClientId: config.COGNITO_CLIENT_ID,
//     Username: email,
//     Password: password,
//     SecretHash: computeSecretHash(email),
//     UserAttributes: Object.entries(attributes).map(([Name, Value]) => ({
//       Name,
//       Value,
//     })),
//   };

//   const result = await cognitoClient.send(new SignUpCommand(params));
//   return { userSub: result.UserSub ?? '' };
// };
export const cognitoRegister = async (
  email: string,
  password: string,
  attributes: Record<string, string> = {}
): Promise<{ userSub: string }> => {
  if (config.MOCK_COGNITO) {
    const { v4: uuidv4 } = await import('uuid');
    const mockId = uuidv4();
    mockUsers.set(email.toLowerCase(), {
      userId: mockId,
      email,
      password,
      roles: ['candidate'],
    });
    return { userSub: mockId };
  }

  const secretHash = computeSecretHash(email);
  const attrsToSend = {
    email: email.toLowerCase().trim(),
    ...attributes,
  };
  const userAttributesList = Object.entries(attrsToSend).map(([Name, Value]) => ({
    Name,
    Value,
  }));

  const command = new SignUpCommand({
    ClientId: config.COGNITO_CLIENT_ID,
    Username: email.toLowerCase().trim(),
    Password: password,
    ...(secretHash ? { SecretHash: secretHash } : {}),
    UserAttributes: userAttributesList,
  });

  const result = await cognitoClient.send(command);
  return { userSub: result.UserSub ?? '' };
};


// update using cognito sub id update password and mobile number
export const cognitoUpdateUserAttributes = async (
  cognitoSubId: string,
  attributes: Record<string, string>
): Promise<void> => {
  // MOCK MODE
  if (config.MOCK_COGNITO) {
    for (const user of mockUsers.values()) {
      if (user.userId === cognitoSubId) {
        Object.assign(user, attributes);
      }
    }
    return;
  }

  // 1. Find Cognito Username using sub
  const listRes = await cognitoClient.send(
    new ListUsersCommand({
      UserPoolId: config.COGNITO_USER_POOL_ID,
      Filter: `sub = "${cognitoSubId}"`,
      Limit: 1,
    })
  );
  console.log('step 1: ListUsers result:', listRes);
  const user = listRes.Users?.[0];

  if (!user?.Username) {
    throw new Error(
      'We could not verify your account details. Please try logging in again or contact support.'
    );
  }

  const username = user.Username;

  // 2. Update attributes
  await cognitoClient.send(
    new AdminUpdateUserAttributesCommand({
      UserPoolId: config.COGNITO_USER_POOL_ID,
      Username: username,
      UserAttributes: Object.entries(attributes).map(([Name, Value]) => ({
        Name,
        Value,
      })),
    })
  );
};
console.log('step 2: AdminUpdateUserAttributes result:');

// ── Refresh Token ────────────────────────────────────────────

export const cognitoRefreshToken = async (
  email: string,
  refreshToken: string
): Promise<CognitoTokens> => {
  if (config.MOCK_COGNITO) {
    const user = mockUsers.get(email.toLowerCase());
    if (!user)
      throw new Error(
        'We could not find an account with these details. Please register a new account or check your information.'
      );
    return generateMockTokens(user.email, user.userId);
  }

  const secretHash = computeSecretHash(email);
  const params: InitiateAuthCommandInput = {
    AuthFlow: 'REFRESH_TOKEN_AUTH',
    ClientId: config.COGNITO_CLIENT_ID,
    AuthParameters: {
      REFRESH_TOKEN: refreshToken,
      ...(secretHash ? { SECRET_HASH: secretHash } : {}),
    },
  };

  const result = await cognitoClient.send(new InitiateAuthCommand(params));

  return {
    accessToken: result.AuthenticationResult?.AccessToken ?? '',
    refreshToken: result.AuthenticationResult?.RefreshToken ?? refreshToken,
    idToken: result.AuthenticationResult?.IdToken ?? '',
    expiresIn: result.AuthenticationResult?.ExpiresIn ?? 3600,
  };
};

// ── Forgot Password ──────────────────────────────────────────

export const cognitoForgotPassword = async (email: string): Promise<void> => {
  if (config.MOCK_COGNITO) return;

  const secretHash = computeSecretHash(email);
  await cognitoClient.send(
    new ForgotPasswordCommand({
      ClientId: config.COGNITO_CLIENT_ID,
      Username: email,
      ...(secretHash ? { SecretHash: secretHash } : {}),
    })
  );
};

export const cognitoConfirmForgotPassword = async (
  email: string,
  confirmationCode: string,
  newPassword: string
): Promise<void> => {
  if (config.MOCK_COGNITO) {
    const user = mockUsers.get(email.toLowerCase());
    if (user) user.password = newPassword;
    return;
  }

  const secretHash = computeSecretHash(email);
  await cognitoClient.send(
    new ConfirmForgotPasswordCommand({
      ClientId: config.COGNITO_CLIENT_ID,
      Username: email,
      ConfirmationCode: confirmationCode,
      Password: newPassword,
      ...(secretHash ? { SecretHash: secretHash } : {}),
    })
  );
};

// ── Sign Out ─────────────────────────────────────────────────

export const cognitoSignOut = async (accessToken: string): Promise<void> => {
  if (config.MOCK_COGNITO) return;

  await cognitoClient.send(new GlobalSignOutCommand({ AccessToken: accessToken }));
};

// ── Confirm Sign Up ──────────────────────────────────────────

export const cognitoConfirmSignUp = async (
  email: string,
  confirmationCode: string
): Promise<void> => {
  if (config.MOCK_COGNITO) return;

  const secretHash = computeSecretHash(email);
  await cognitoClient.send(
    new ConfirmSignUpCommand({
      ClientId: config.COGNITO_CLIENT_ID,
      Username: email,
      ConfirmationCode: confirmationCode,
      ...(secretHash ? { SecretHash: secretHash } : {}),
    })
  );
};

// ── Resend Confirmation Code ─────────────────────────────────

export const cognitoResendConfirmationCode = async (email: string): Promise<void> => {
  if (config.MOCK_COGNITO) return;

  const secretHash = computeSecretHash(email);
  await cognitoClient.send(
    new ResendConfirmationCodeCommand({
      ClientId: config.COGNITO_CLIENT_ID,
      Username: email,
      ...(secretHash ? { SecretHash: secretHash } : {}),
    })
  );
};

// ── Admin Operations ─────────────────────────────────────────

export const cognitoAdminGetUser = async (
  email: string
): Promise<Record<string, unknown> | null> => {
  if (config.MOCK_COGNITO) {
    const user = mockUsers.get(email.toLowerCase());
    return user ? (user as unknown as Record<string, unknown>) : null;
  }

  const result = await cognitoClient.send(
    new AdminGetUserCommand({
      UserPoolId: config.COGNITO_USER_POOL_ID,
      Username: email,
    })
  );
  return result as unknown as Record<string, unknown>;
};

export const cognitoAdminDeleteUser = async (email: string): Promise<void> => {
  if (config.MOCK_COGNITO) {
    mockUsers.delete(email.toLowerCase());
    return;
  }

  await cognitoClient.send(
    new AdminDeleteUserCommand({
      UserPoolId: config.COGNITO_USER_POOL_ID,
      Username: email,
    })
  );
};

export const cognitoAdminUpdateUserAttributes = async (
  email: string,
  attributes: Record<string, string>
): Promise<void> => {
  if (config.MOCK_COGNITO) return;

  await cognitoClient.send(
    new AdminUpdateUserAttributesCommand({
      UserPoolId: config.COGNITO_USER_POOL_ID,
      Username: email,
      UserAttributes: Object.entries(attributes).map(([Name, Value]) => ({
        Name,
        Value,
      })),
    })
  );
};

// ── JWT Verification ─────────────────────────────────────────

export interface JwtPayload {
  sub: string;
  email: string;
  username?: string;
  'cognito:groups'?: string[];
  iat?: number;
  exp?: number;
}

// Cache JWKS clients per issuer
const jwksClients = new Map<string, jwksRsa.JwksClient>();

const getJwksClient = (issuer: string) => {
  let client = jwksClients.get(issuer);
  if (!client) {
    client = jwksRsa({
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 10,
      jwksUri: `${issuer}/.well-known/jwks.json`,
    });
    jwksClients.set(issuer, client);
  }
  return client;
};

const getSigningKey = (client: jwksRsa.JwksClient, kid: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    client.getSigningKey(kid, (err, key) => {
      if (err) {
        reject(err);
      } else {
        const signingKey = key?.getPublicKey() || '';
        resolve(signingKey);
      }
    });
  });
};

export const verifyJwt = async (token: string): Promise<JwtPayload> => {
  try {
    if (config.MOCK_COGNITO) {
      return jwt.verify(token, config.JWT_SECRET) as JwtPayload;
    }
    const decoded = jwt.decode(token, { complete: true }) as any;
    if (!decoded || !decoded.header?.kid || !decoded.payload?.iss) {
      throw new Error('Your session is invalid or has expired. Please log in again to continue.');
    }
    const issuer = decoded.payload.iss;
    const expectedIssuer = `https://cognito-idp.${config.AWS_REGION}.amazonaws.com/${config.COGNITO_USER_POOL_ID}`;
    if (issuer !== expectedIssuer) {
      throw new Error(
        'We encountered an issue verifying your secure session. Please log in again.'
      );
    }

    const clientId = decoded.payload.client_id || decoded.payload.aud;
    if (clientId !== config.COGNITO_CLIENT_ID) {
       throw new Error('Invalid token audience.');
    }
    const client = getJwksClient(issuer);
    const signingKey = await getSigningKey(client, decoded.header.kid);
    return jwt.verify(token, signingKey, {
      algorithms: ['RS256'],
      issuer,
    }) as JwtPayload;
  } catch (err) {
    console.error('Actual verifyJwt error:', err);
    throw new Error(
      'For your security, your session has timed out. Please log in again to continue.'
    );
  }
};
export const getUserBySub = async (subId: string): Promise<Record<string, any> | null> => {
  console.log(subId, 'awanish');
  if (config.MOCK_COGNITO) {
    console.log('############################');
    for (const user of mockUsers.values()) {
      if (user.userId === subId) {
        return user as unknown as Record<string, any>;
      }
    }
    // Fallback mock user for testing / dynamic linking
    const mockUser = {
      Username: subId,
      UserStatus: 'CONFIRMED',
      Enabled: true,
      UserCreateDate: new Date(),
      UserLastModifiedDate: new Date(),
      Attributes: [
        { Name: 'sub', Value: subId },
        { Name: 'email', Value: 'mock-candidate@example.com' },
      ],
    };
    console.log('=================================');
    console.log('✅ USER FOUND (MOCK)');
    console.log('=================================');
    console.log('Username:', mockUser.Username);
    console.log('Attributes:');
    mockUser.Attributes.forEach((attr) => {
      console.log(`${attr.Name}: ${attr.Value}`);
    });
    return mockUser;
  }

  try {
    const response = await cognitoClient.send(
      new ListUsersCommand({
        UserPoolId: config.COGNITO_USER_POOL_ID,
        Filter: `sub = "${subId}"`,
        Limit: 1,
      })
    );
    console.log(subId, 'awanish');

    if (!response.Users || response.Users.length === 0) {
      console.log('❌ User Not Found');
      return null;
    }

    const user = response.Users[0];

    console.log('=================================');
    console.log('✅ USER FOUND');
    console.log('=================================');
    console.log('Username:', user.Username);
    console.log('Status:', user.UserStatus);
    console.log('Enabled:', user.Enabled);
    console.log('Created:', user.UserCreateDate);
    console.log('Updated:', user.UserLastModifiedDate);

    console.log('\nAttributes:');
    if (user.Attributes) {
      user.Attributes.forEach((attr) => {
        console.log(`${attr.Name}: ${attr.Value}`);
      });
    }

    return user as unknown as Record<string, any>;
  } catch (error) {
    console.error('[Cognito] Error during operation');
    throw error;
  }
};

export const getUserByCognitoSubId = async (
  cognitoSub: string
): Promise<Record<string, unknown> | null> => {
  return getUserBySub(cognitoSub);
};

export const cognitoAdminSetUserPassword = async (
  cognitoSubId: string,
  passwordStr: string
): Promise<void> => {
  if (config.MOCK_COGNITO) {
    console.log(`[Mock Cognito] Setting password for sub ID: ${cognitoSubId}`);
    return;
  }

  try {
    const listUsersResponse = await cognitoClient.send(
      new ListUsersCommand({
        UserPoolId: config.COGNITO_USER_POOL_ID,
        Filter: `sub = "${cognitoSubId}"`,
        Limit: 1,
      })
    );

    const user = listUsersResponse.Users?.[0];
    if (!user || !user.Username) {
      throw new Error(
        'We could not verify your account details. Please try logging in again or contact support.'
      );
    }

    await cognitoClient.send(
      new AdminSetUserPasswordCommand({
        UserPoolId: config.COGNITO_USER_POOL_ID,
        Username: user.Username,
        Password: passwordStr,
        Permanent: true,
      })
    );
    console.log(`Successfully set password for Cognito user ${user.Username}`);
  } catch (error) {
    console.error('[Cognito] Failed to set user password');
    throw error;
  }
};

export const getCognitoSubByEmail = async (email: string): Promise<string | null> => {

  console.log(email, 'awanishss');

  try {
    const result = await cognitoClient.send(
      new AdminGetUserCommand({
        UserPoolId: config.COGNITO_USER_POOL_ID,
        Username: email,
      })
    );
    console.log(result, '------------------------------');

    if (result.UserAttributes) {
      const subAttr = result.UserAttributes.find((attr) => attr.Name === 'sub');
      if (subAttr?.Value) {
        return subAttr.Value;
      }
    }
  } catch (error: any) {
    if (error.name === 'UserNotFoundException') {
      try {
        const listRes = await cognitoClient.send(
          new ListUsersCommand({
            UserPoolId: config.COGNITO_USER_POOL_ID,
            Filter: `email = "${email}"`,
            Limit: 1,
          })
        );
        const user = listRes.Users?.[0];
        if (user?.Attributes) {
          const subAttr = user.Attributes.find((attr) => attr.Name === 'sub');
          if (subAttr?.Value) {
            return subAttr.Value;
          }
        }
      } catch (listError) {
        console.error('Error listing users by email:', listError);
      }
    } else {
      console.error('Error getting user by username:', error);
    }
  }
  return null;
};

export const getCognitoUserByEmail = async (email: string): Promise<Record<string, any> | null> => {


  try {
    let username: string | undefined;
    let attributes: any[] | undefined;

    try {
      const result = await cognitoClient.send(
        new AdminGetUserCommand({
          UserPoolId: config.COGNITO_USER_POOL_ID,
          Username: email,
        })
      );
      username = result.Username;
      attributes = result.UserAttributes;
    } catch (error: any) {
      if (error.name === 'UserNotFoundException') {
        const listRes = await cognitoClient.send(
          new ListUsersCommand({
            UserPoolId: config.COGNITO_USER_POOL_ID,
            Filter: `email = "${email}"`,
            Limit: 1,
          })
        );
        const user = listRes.Users?.[0];
        if (user) {
          username = user.Username;
          attributes = user.Attributes;
        }
      } else {
        throw error;
      }
    }

    if (!attributes) {
      return null;
    }

    const userData: Record<string, any> = {
      username: username || '',
    };

    for (const attr of attributes) {
      if (attr.Name && attr.Value !== undefined) {
        let val: any = attr.Value;
        if (val === 'true') val = true;
        else if (val === 'false') val = false;
        userData[attr.Name] = val;
      }
    }

    return userData;
  } catch (error) {
    console.error('Error in getCognitoUserByEmail:', error);
    return null;
  }
};

export const getUserByAccessToken = async (
  accessToken: string
): Promise<Record<string, any> | null> => {
  if (config.MOCK_COGNITO) {
    return {
      username: 'mock-user',
      Attributes: [
        { Name: 'sub', Value: 'mock-sub' },
        { Name: 'email', Value: 'mock-candidate@example.com' },
      ],
    };
  }

  try {
    const response = await cognitoClient.send(
      new GetUserCommand({
        AccessToken: accessToken,
      })
    );

    const attributes = response.UserAttributes;
    if (!attributes) {
      return null;
    }

    const userData: Record<string, any> = {
      username: response.Username || '',
      Attributes: attributes,
    };

    for (const attr of attributes) {
      if (attr.Name && attr.Value !== undefined) {
        let val: any = attr.Value;
        if (val === 'true') val = true;
        else if (val === 'false') val = false;
        userData[attr.Name] = val;
      }
    }

    return userData;
  } catch (error) {
    console.error('Error in getUserByAccessToken:', error);
    return null;
  }
};


