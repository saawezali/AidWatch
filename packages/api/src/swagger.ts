import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AidWatch API',
      version: '1.0.0',
      description: 'AI-powered early warning system for humanitarian crises',
      contact: {
        name: 'AidWatch Team',
      },
      license: {
        name: 'MIT',
      },
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:3001',
        description: 'API Server',
      },
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'Admin API key for protected endpoints',
        },
      },
      schemas: {
        Crisis: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            description: { type: 'string', nullable: true },
            type: { 
              type: 'string',
              enum: ['CONFLICT', 'NATURAL_DISASTER', 'DISEASE_OUTBREAK', 'FAMINE', 'DISPLACEMENT', 'OTHER']
            },
            severity: { 
              type: 'string',
              enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
            },
            status: { 
              type: 'string',
              enum: ['EMERGING', 'ONGOING', 'ESCALATING', 'IMPROVING', 'RESOLVED']
            },
            location: { type: 'string', nullable: true },
            latitude: { type: 'number', nullable: true },
            longitude: { type: 'number', nullable: true },
            affectedCount: { type: 'integer', nullable: true },
            confidenceScore: { type: 'number', minimum: 0, maximum: 1 },
            detectedAt: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Event: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            description: { type: 'string', nullable: true },
            url: { type: 'string', nullable: true },
            publishedAt: { type: 'string', format: 'date-time' },
            crisisId: { type: 'string', format: 'uuid' },
            dataSourceId: { type: 'string', format: 'uuid' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Alert: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            type: { type: 'string', enum: ['EMAIL', 'WEBHOOK', 'SMS'] },
            status: { type: 'string', enum: ['PENDING', 'SENT', 'FAILED'] },
            createdAt: { type: 'string', format: 'date-time' },
            sentAt: { type: 'string', format: 'date-time', nullable: true },
          },
        },
        Subscription: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            minSeverity: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
            crisisTypes: { 
              type: 'array',
              items: { type: 'string' }
            },
            regions: { 
              type: 'array',
              items: { type: 'string' }
            },
            active: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        HealthStatus: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['ok', 'degraded', 'down'] },
            timestamp: { type: 'string', format: 'date-time' },
            services: {
              type: 'object',
              properties: {
                database: { type: 'string', enum: ['healthy', 'unhealthy'] },
                ai: { type: 'string', enum: ['healthy', 'unhealthy'] },
              },
            },
            stats: {
              type: 'object',
              properties: {
                totalCrises: { type: 'integer' },
                activeCrises: { type: 'integer' },
                totalEvents: { type: 'integer' },
                totalAlerts: { type: 'integer' },
              },
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
    tags: [
      { name: 'Health', description: 'Health check endpoints' },
      { name: 'Crises', description: 'Crisis management endpoints' },
      { name: 'Events', description: 'Event tracking endpoints' },
      { name: 'Alerts', description: 'Alert management endpoints' },
      { name: 'AI', description: 'AI analysis endpoints' },
      { name: 'Subscriptions', description: 'Email subscription endpoints' },
      { name: 'Feeds', description: 'RSS/Atom feed endpoints' },
      { name: 'Webhooks', description: 'Webhook integration endpoints' },
    ],
  },
  apis: [], // We define paths inline below
};

export const swaggerSpec = {
  ...swaggerJsdoc(options),
  paths: {
    '/api/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        description: 'Returns the health status of the API and dependent services',
        responses: {
          200: {
            description: 'Service is healthy',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthStatus' },
              },
            },
          },
        },
      },
    },
    '/api/health/detailed': {
      get: {
        tags: ['Health'],
        summary: 'Detailed health check',
        description: 'Returns detailed health information including database and AI service status',
        responses: {
          200: {
            description: 'Detailed health status',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthStatus' },
              },
            },
          },
        },
      },
    },
    '/api/crises': {
      get: {
        tags: ['Crises'],
        summary: 'List all crises',
        description: 'Returns a paginated list of crises with optional filtering',
        parameters: [
          { name: 'type', in: 'query', schema: { type: 'string' }, description: 'Filter by crisis type' },
          { name: 'severity', in: 'query', schema: { type: 'string' }, description: 'Filter by severity' },
          { name: 'status', in: 'query', schema: { type: 'string' }, description: 'Filter by status' },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 }, description: 'Max results' },
          { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 }, description: 'Pagination offset' },
        ],
        responses: {
          200: {
            description: 'List of crises',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Crisis' },
                },
              },
            },
          },
        },
      },
    },
    '/api/crises/{id}': {
      get: {
        tags: ['Crises'],
        summary: 'Get crisis by ID',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: {
            description: 'Crisis details with events',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Crisis' },
              },
            },
          },
          404: {
            description: 'Crisis not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/api/crises/stats': {
      get: {
        tags: ['Crises'],
        summary: 'Get crisis statistics',
        description: 'Returns aggregated statistics about crises',
        responses: {
          200: {
            description: 'Crisis statistics',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    total: { type: 'integer' },
                    byType: { type: 'object' },
                    bySeverity: { type: 'object' },
                    byStatus: { type: 'object' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/crises/trends': {
      get: {
        tags: ['Crises'],
        summary: 'Get historical trends',
        description: 'Returns crisis counts grouped by time period',
        parameters: [
          { name: 'days', in: 'query', schema: { type: 'integer', default: 30 }, description: 'Number of days to analyze' },
        ],
        responses: {
          200: {
            description: 'Trend data',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      date: { type: 'string', format: 'date' },
                      count: { type: 'integer' },
                      bySeverity: { type: 'object' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/events': {
      get: {
        tags: ['Events'],
        summary: 'List events',
        parameters: [
          { name: 'crisisId', in: 'query', schema: { type: 'string' }, description: 'Filter by crisis ID' },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
        ],
        responses: {
          200: {
            description: 'List of events',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Event' },
                },
              },
            },
          },
        },
      },
    },
    '/api/alerts': {
      get: {
        tags: ['Alerts'],
        summary: 'List alerts',
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
        ],
        responses: {
          200: {
            description: 'List of alerts',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Alert' },
                },
              },
            },
          },
        },
      },
    },
    '/api/subscriptions': {
      post: {
        tags: ['Subscriptions'],
        summary: 'Create subscription',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  minSeverity: { type: 'string', default: 'HIGH' },
                  crisisTypes: { type: 'array', items: { type: 'string' } },
                  regions: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Subscription created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Subscription' },
              },
            },
          },
        },
      },
    },
    '/api/subscriptions/{id}/unsubscribe': {
      post: {
        tags: ['Subscriptions'],
        summary: 'Unsubscribe',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: { description: 'Successfully unsubscribed' },
        },
      },
    },
    '/api/ai/analyze': {
      post: {
        tags: ['AI'],
        summary: 'Analyze crisis with AI',
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['crisisId'],
                properties: {
                  crisisId: { type: 'string', format: 'uuid' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'AI analysis result',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    summary: { type: 'string' },
                    recommendations: { type: 'array', items: { type: 'string' } },
                    riskAssessment: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/ai/jobs/trigger': {
      post: {
        tags: ['AI'],
        summary: 'Trigger data fetch job',
        security: [{ ApiKeyAuth: [] }],
        responses: {
          200: { description: 'Job triggered successfully' },
          403: { description: 'Admin authentication required' },
        },
      },
    },
    '/api/feeds/rss': {
      get: {
        tags: ['Feeds'],
        summary: 'RSS feed',
        description: 'Get RSS feed of active crises',
        responses: {
          200: {
            description: 'RSS feed',
            content: {
              'application/rss+xml': {
                schema: { type: 'string' },
              },
            },
          },
        },
      },
    },
    '/api/feeds/atom': {
      get: {
        tags: ['Feeds'],
        summary: 'Atom feed',
        description: 'Get Atom feed of active crises',
        responses: {
          200: {
            description: 'Atom feed',
            content: {
              'application/atom+xml': {
                schema: { type: 'string' },
              },
            },
          },
        },
      },
    },
    '/api/feeds/rss/{severity}': {
      get: {
        tags: ['Feeds'],
        summary: 'RSS feed by severity',
        parameters: [
          { name: 'severity', in: 'path', required: true, schema: { type: 'string', enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] } },
        ],
        responses: {
          200: {
            description: 'Filtered RSS feed',
            content: {
              'application/rss+xml': {
                schema: { type: 'string' },
              },
            },
          },
        },
      },
    },
    '/api/webhooks/reliefweb': {
      post: {
        tags: ['Webhooks'],
        summary: 'ReliefWeb webhook',
        security: [{ ApiKeyAuth: [] }],
        description: 'Receive data from ReliefWeb',
        responses: {
          200: { description: 'Webhook processed' },
        },
      },
    },
  },
};

export default swaggerSpec;
