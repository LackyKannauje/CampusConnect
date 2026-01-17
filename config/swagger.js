const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Campus Connect API',
      version: '1.0.0',
      description: 'API documentation for Campus Connect backend',
    },
    components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          }
        }
      }
,      
    servers: [
      {
        url: 'http://localhost:5000/api/v1',
        description: 'Local server',
      },
    ],
  },
  apis: ['./routes/**/*.js'], // where your route comments live
};

const specs = swaggerJSDoc(options);

module.exports = specs;
