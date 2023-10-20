import fs from 'fs'
import yaml from 'js-yaml'
import { routeGroups } from '~~/routes'

const rootPath = process.cwd()
const apiInfo = {
  title: `${process.env.APP_PUBLIC_SITE_NAME} API`,
  version: '1.0.0',
}

const paths = {}

const successResponseSchema = {
  type: 'object',
  properties: {
    status: { type: 'string' },
    data: {
      type: 'object',
      properties: {
        result: { type: 'object' },
        message: { type: 'string' },
      },
    },
  },
}

const failResponseSchema = {
  type: 'object',
  properties: {
    status: { type: 'string' },
    error: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
  },
}

routeGroups.forEach((group) => {
  if (group.basePath.startsWith('/api/admin')) {
    return
  }

  if (group.basePath.startsWith('/api/exchange/settings')) {
    return
  }

  group.routes.forEach((route) => {
    if (route.permission) {
      return
    }
    const fullPath = `${group.basePath}${route.path}`
    if (!paths[fullPath]) {
      paths[fullPath] = {}
    }

    const httpMethod = route.method === 'del' ? 'delete' : route.method

    paths[fullPath][httpMethod] = {
      summary: route.controller,
      parameters: route.params
        ? route.params.map((param) => ({
            name: param,
            in: 'path',
            required: true,
            schema: { type: 'string' }, // Specify the content type
          }))
        : [],
      requestBody: route.body
        ? {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: Object.fromEntries(
                    route.body.map((key) => [key, { type: 'string' }]),
                  ),
                },
              },
            },
          }
        : undefined,
      responses: {
        '200': {
          description: 'Success',
          content: { 'application/json': { schema: successResponseSchema } },
        },
        '400': {
          description: 'Bad Request',
          content: { 'application/json': { schema: failResponseSchema } },
        },
        '401': {
          description: 'Unauthorized',
          content: { 'application/json': { schema: failResponseSchema } },
        },
        '404': {
          description: 'Not Found',
          content: { 'application/json': { schema: failResponseSchema } },
        },
        '500': {
          description: 'Internal Server Error',
          content: { 'application/json': { schema: failResponseSchema } },
        },
      },
    }
  })
})

const swaggerObject = {
  openapi: '3.0.0',
  info: apiInfo,
  paths,
}

const swaggerYaml = yaml.dump(swaggerObject)

fs.writeFileSync(`${rootPath}/api.yaml`, swaggerYaml)

console.log('Swagger YAML file has been generated.')
