// src/config/swagger.ts

import { Express } from 'express';
import swaggerUi from 'swagger-ui-express';

const spec = {
  openapi: '3.0.0',
  info: {
    title: 'Demo Credit — Wallet Service API',
    version: '1.0.0',
    description: `
## Quick Start

Follow these steps to exercise the full API from this page:

1. **Register** — Use \`POST /api/v1/users\` to create an account. Copy the \`token\` from the response.

2. **Authorise** — Click the **Authorize** button (top right), paste the token, click Authorize.

3. **Get your profile** — Use \`GET /api/v1/users/me\` to confirm your identity.

4. **Get your wallet** — Use \`GET /api/v1/wallets/me\` to see your starting balance (0.00).

5. **Fund your wallet** — Use \`POST /api/v1/wallets/fund\` with an amount.

6. **Withdraw** — Use \`POST /api/v1/wallets/withdraw\` with an amount less than your balance.

7. **Transfer** — Register a second user, copy their \`id\`, then use \`POST /api/v1/wallets/transfer\`.

> All wallet endpoints require the Bearer token from step 2.
    `.trim(),
  },
  servers: [
    {
      url: 'https://demo-credit-nm84.onrender.com',
      description: 'Production (Render + Aiven MySQL)',
    },
    {
      url: 'http://localhost:3000',
      description: 'Local development',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Paste the token returned from POST /api/v1/users',
      },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            example: '59a5d16c-311e-4497-a180-d0d0995ebb07',
          },
          first_name: { type: 'string', example: 'Ayomide' },
          last_name: { type: 'string', example: 'Kayode' },
          email: {
            type: 'string',
            format: 'email',
            example: 'ayomide@example.com',
          },
          phone_number: { type: 'string', example: '08012345678' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
      Wallet: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            example: '3b4d5d5b-fb99-4e27-a40a-46cf3e9ca97e',
          },
          user_id: {
            type: 'string',
            format: 'uuid',
            example: '59a5d16c-311e-4497-a180-d0d0995ebb07',
          },
          balance: { type: 'number', example: 4500.0 },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'error' },
          message: { type: 'string', example: 'Insufficient balance' },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        summary: 'Health check',
        description:
          'Confirms the server is running and the database connection is active.',
        tags: ['Health'],
        responses: {
          200: {
            description: 'Server and database are healthy',
            content: {
              'application/json': {
                example: { status: 'ok', database: 'connected' },
              },
            },
          },
          503: {
            description: 'Database unreachable',
            content: {
              'application/json': {
                example: { status: 'error', database: 'unreachable' },
              },
            },
          },
        },
      },
    },
    '/api/v1/users': {
      post: {
        summary: 'Register a new user',
        description: `Creates a user account and a linked wallet in a single atomic transaction.
The email is checked against the Lendsqr Adjutor Karma blacklist before registration proceeds.
Returns a JWT — copy this token and use the **Authorize** button to access protected endpoints.`,
        tags: ['Users'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['first_name', 'last_name', 'email', 'phone_number'],
                properties: {
                  first_name: { type: 'string', example: 'Ayomide' },
                  last_name: { type: 'string', example: 'Kayode' },
                  email: {
                    type: 'string',
                    format: 'email',
                    example: 'ayomide@example.com',
                  },
                  phone_number: { type: 'string', example: '08012345678' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'User registered successfully',
            content: {
              'application/json': {
                example: {
                  status: 'success',
                  message: 'Account created successfully',
                  data: {
                    user: {
                      id: '59a5d16c-311e-4497-a180-d0d0995ebb07',
                      first_name: 'Ayomide',
                      last_name: 'Kayode',
                      email: 'ayomide@example.com',
                      phone_number: '08012345678',
                      created_at: '2026-05-09T11:40:17.938Z',
                      updated_at: '2026-05-09T11:40:17.938Z',
                    },
                    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                  },
                },
              },
            },
          },
          400: {
            description: 'Invalid request body',
            content: {
              'application/json': {
                example: { status: 'error', message: 'Invalid email address' },
              },
            },
          },
          403: {
            description:
              'Email found in Karma blacklist — user cannot be onboarded',
            content: {
              'application/json': {
                example: {
                  status: 'error',
                  message: 'User is not eligible for onboarding',
                },
              },
            },
          },
          409: {
            description: 'Email or phone number already registered',
            content: {
              'application/json': {
                example: {
                  status: 'error',
                  message: 'A user with this email already exists',
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/users/me': {
      get: {
        summary: 'Get own profile',
        description:
          "Returns the authenticated user's profile. Resolves the user from the JWT — no ID needed.",
        tags: ['Users'],
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'User retrieved successfully',
            content: {
              'application/json': {
                example: {
                  status: 'success',
                  message: 'User retrieved successfully',
                  data: {
                    id: '59a5d16c-311e-4497-a180-d0d0995ebb07',
                    first_name: 'Ayomide',
                    last_name: 'Kayode',
                    email: 'ayomide@example.com',
                    phone_number: '08012345678',
                    created_at: '2026-05-09T11:40:18.000Z',
                    updated_at: '2026-05-09T11:40:18.000Z',
                  },
                },
              },
            },
          },
          401: {
            description: 'Missing or invalid token',
            content: {
              'application/json': {
                example: {
                  status: 'error',
                  message: 'Missing or invalid authorization header',
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/users/{id}': {
      get: {
        summary: 'Get user by ID',
        description: `Returns a user profile by ID. The authenticated user can only fetch their own profile — attempting to fetch another user's profile returns 403.
Useful for verifying ownership rules and for looking up receiver IDs before a transfer.`,
        tags: ['Users'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description:
              "UUID of the user to retrieve — must match the authenticated user's ID",
            schema: {
              type: 'string',
              format: 'uuid',
              example: '59a5d16c-311e-4497-a180-d0d0995ebb07',
            },
          },
        ],
        responses: {
          200: {
            description: 'User retrieved successfully',
            content: {
              'application/json': {
                example: {
                  status: 'success',
                  message: 'User retrieved successfully',
                  data: {
                    id: '59a5d16c-311e-4497-a180-d0d0995ebb07',
                    first_name: 'Ayomide',
                    last_name: 'Kayode',
                    email: 'ayomide@example.com',
                    phone_number: '08012345678',
                    created_at: '2026-05-09T11:40:18.000Z',
                    updated_at: '2026-05-09T11:40:18.000Z',
                  },
                },
              },
            },
          },
          401: {
            description: 'Missing or invalid token',
            content: {
              'application/json': {
                example: {
                  status: 'error',
                  message: 'Missing or invalid authorization header',
                },
              },
            },
          },
          403: {
            description:
              'Access denied — token does not match the requested user ID',
            content: {
              'application/json': {
                example: { status: 'error', message: 'Access denied' },
              },
            },
          },
          404: {
            description: 'User not found',
            content: {
              'application/json': {
                example: { status: 'error', message: 'User not found' },
              },
            },
          },
        },
      },
    },
    '/api/v1/wallets/me': {
      get: {
        summary: 'Get own wallet',
        description:
          "Returns the authenticated user's wallet including current balance.",
        tags: ['Wallets'],
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Wallet retrieved successfully',
            content: {
              'application/json': {
                example: {
                  status: 'success',
                  message: 'Wallet retrieved successfully',
                  data: {
                    id: '3b4d5d5b-fb99-4e27-a40a-46cf3e9ca97e',
                    user_id: '59a5d16c-311e-4497-a180-d0d0995ebb07',
                    balance: 4500.0,
                    created_at: '2026-05-09T11:40:18.000Z',
                    updated_at: '2026-05-09T18:02:21.000Z',
                  },
                },
              },
            },
          },
          401: {
            description: 'Missing or invalid token',
            content: {
              'application/json': {
                example: {
                  status: 'error',
                  message: 'Missing or invalid authorization header',
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/wallets/fund': {
      post: {
        summary: 'Fund wallet',
        description: `Credits the authenticated user's wallet by the specified amount.
Amount must be positive and have at most 2 decimal places.
The operation runs inside a database transaction — balance update and transaction record are atomic.`,
        tags: ['Wallets'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['amount'],
                properties: {
                  amount: { type: 'number', example: 5000 },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Wallet funded successfully',
            content: {
              'application/json': {
                example: {
                  status: 'success',
                  message: 'Wallet funded successfully',
                  data: {
                    id: '3b4d5d5b-fb99-4e27-a40a-46cf3e9ca97e',
                    user_id: '59a5d16c-311e-4497-a180-d0d0995ebb07',
                    balance: 5000.0,
                    created_at: '2026-05-09T11:40:18.000Z',
                    updated_at: '2026-05-09T19:02:21.000Z',
                  },
                },
              },
            },
          },
          400: {
            description: 'Invalid amount',
            content: {
              'application/json': {
                example: {
                  status: 'error',
                  message:
                    'Amount must be a positive number with at most 2 decimal places',
                },
              },
            },
          },
          401: {
            description: 'Missing or invalid token',
            content: {
              'application/json': {
                example: {
                  status: 'error',
                  message: 'Missing or invalid authorization header',
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/wallets/transfer': {
      post: {
        summary: 'Transfer funds',
        description: `Transfers funds from the authenticated user's wallet to another user's wallet.
Both wallets are locked in ascending ID order before any balance mutation — prevents deadlocks on concurrent opposing transfers.
Sender and receiver balances update atomically in a single transaction.
To test: register a second user, copy their \`id\` from the registration response, use it as \`receiver_id\`.`,
        tags: ['Wallets'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['receiver_id', 'amount'],
                properties: {
                  receiver_id: {
                    type: 'string',
                    format: 'uuid',
                    description:
                      'ID of the user to receive funds — must be a different user',
                    example: 'b64e3d89-383a-43eb-a402-c089e1cb5568',
                  },
                  amount: { type: 'number', example: 1500 },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description:
              "Transfer successful — returns sender's updated wallet",
            content: {
              'application/json': {
                example: {
                  status: 'success',
                  message: 'Transfer successful',
                  data: {
                    id: '3b4d5d5b-fb99-4e27-a40a-46cf3e9ca97e',
                    user_id: '59a5d16c-311e-4497-a180-d0d0995ebb07',
                    balance: 3500.0,
                    created_at: '2026-05-09T11:40:18.000Z',
                    updated_at: '2026-05-09T19:46:01.000Z',
                  },
                },
              },
            },
          },
          400: {
            description:
              'Invalid amount, self-transfer, or insufficient balance',
            content: {
              'application/json': {
                examples: {
                  insufficient: {
                    summary: 'Insufficient balance',
                    value: { status: 'error', message: 'Insufficient balance' },
                  },
                  self_transfer: {
                    summary: 'Self-transfer attempt',
                    value: {
                      status: 'error',
                      message: 'Cannot transfer funds to yourself',
                    },
                  },
                },
              },
            },
          },
          401: {
            description: 'Missing or invalid token',
            content: {
              'application/json': {
                example: {
                  status: 'error',
                  message: 'Missing or invalid authorization header',
                },
              },
            },
          },
          404: {
            description: 'Receiver not found',
            content: {
              'application/json': {
                example: { status: 'error', message: 'Receiver not found' },
              },
            },
          },
        },
      },
    },
    '/api/v1/wallets/withdraw': {
      post: {
        summary: 'Withdraw funds',
        description: `Debits the authenticated user's wallet by the specified amount.
Balance must be sufficient — partial withdrawals are not supported.
Amount must be positive and have at most 2 decimal places.`,
        tags: ['Wallets'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['amount'],
                properties: {
                  amount: { type: 'number', example: 1000 },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Withdrawal successful',
            content: {
              'application/json': {
                example: {
                  status: 'success',
                  message: 'Withdrawal successful',
                  data: {
                    id: '3b4d5d5b-fb99-4e27-a40a-46cf3e9ca97e',
                    user_id: '59a5d16c-311e-4497-a180-d0d0995ebb07',
                    balance: 4000.0,
                    created_at: '2026-05-09T11:40:18.000Z',
                    updated_at: '2026-05-09T19:02:46.000Z',
                  },
                },
              },
            },
          },
          400: {
            description: 'Invalid amount or insufficient balance',
            content: {
              'application/json': {
                examples: {
                  insufficient: {
                    summary: 'Insufficient balance',
                    value: { status: 'error', message: 'Insufficient balance' },
                  },
                  invalid_amount: {
                    summary: 'Invalid amount',
                    value: {
                      status: 'error',
                      message:
                        'Amount must be a positive number with at most 2 decimal places',
                    },
                  },
                },
              },
            },
          },
          401: {
            description: 'Missing or invalid token',
            content: {
              'application/json': {
                example: {
                  status: 'error',
                  message: 'Missing or invalid authorization header',
                },
              },
            },
          },
        },
      },
    },
  },
};

export const setupSwagger = (app: Express): void => {
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(spec, {
      customSiteTitle: 'Demo Credit API Docs - Ayomide Kayode',
      swaggerOptions: {
        persistAuthorization: true,
      },
    }),
  );
};
