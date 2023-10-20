import * as path from 'path'
import * as tsconfigPaths from 'tsconfig-paths'
import * as uWS from 'uWebSockets.js'
import { initializeCrons } from './cron'
import { setupExchangeWebsocket } from './exchange'
import { createLogger } from './logger'
import { routeGroups } from './routes'
import { setupApiDocsRoutes } from './tools/apiDocsSetup'
import { setupChat } from './tools/chat'
import { setupHtmlRoutes } from './tools/htmlSetup'
import { setCORSHeaders, setupRouteHandler } from './utils'
import ExchangeManager from './utils/exchange'

const baseUrl = `${process.cwd()}${
  process.env.NODE_ENV === 'production' ? '/dist' : '/server'
}`
const cleanup = tsconfigPaths.register({
  baseUrl,
  paths: {
    '~~/*': ['./*'],
  },
})

const fs = require('fs')
const logger = createLogger('uWS-Server')
const exchangeLogger = createLogger('Exchange')
const fileExtension = process.env.NODE_ENV === 'production' ? '.js' : '.ts'

// import './tools/apiDocsGenerate'
// import './tools/permissionsGenerate'

const app = uWS.App()

const isValidMethod = (method: string) => typeof app[method] === 'function'

const routeHandlerCache = new Map<string, any>()

const setupIndividualRoute = (
  basePath: string,
  route: any,
  controllers: any,
) => {
  if (isValidMethod(route.method)) {
    const fullPath = `${basePath}${route.path}`
    app[route.method](fullPath, setupRouteHandler(route, controllers))
  } else {
    logger.error(`Invalid method ${route.method} for route ${route.path}`)
  }
}
const getAddonFolders = () => {
  const addonPath = `${baseUrl}/extensions`
  if (!fs.existsSync(addonPath)) {
    logger.warn(`Addon path ${addonPath} does not exist.`)
    return []
  }
  return fs
    .readdirSync(addonPath, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name)
}

const setupRouteGroup = async (group: any) => {
  const { basePath, routes, controllerPath } = group

  let controllers: any

  // Determine file extension based on NODE_ENV
  const fullControllerPath = `${controllerPath}${fileExtension}`

  // Attempt to import controllers
  try {
    const mod = await import(fullControllerPath)
    controllers = mod.controllers

    // Cache the controllers
    routeHandlerCache.set(fullControllerPath, controllers)
  } catch (error) {
    logger.error(
      `Failed to import controllers from ${fullControllerPath}: ${error}`,
    )
    return
  }

  // Check if controllers are found for all routes
  const notFoundControllers = routes.filter(
    (route) => !controllers.hasOwnProperty(route.controller),
  )

  if (notFoundControllers.length > 0) {
    logger.error(
      `Controllers not found for the following routes under basePath ${basePath}:`,
    )
    notFoundControllers.forEach((route) => {
      logger.error(
        `Method: ${route.method}, Path: ${route.path}, Controller: ${route.controller}`,
      )
    })
    return
  }

  // Setup individual routes
  routes.forEach((route) => setupIndividualRoute(basePath, route, controllers))
}

const setupRoutes = async () => {
  await Promise.all(routeGroups.map(setupRouteGroup))

  // Get all addon folders
  const addonFolders = getAddonFolders()

  for (const folder of addonFolders) {
    const addonRoutePath = `${baseUrl}/extensions/${folder}/routes${fileExtension}`

    try {
      const addonRouteGroups = (await import(addonRoutePath)).default
      await Promise.all(addonRouteGroups.map(setupRouteGroup))
    } catch (error) {
      logger.error(
        `Failed to import addon routes from ${addonRoutePath}: ${error}`,
      )
    }
  }
}

setupApiDocsRoutes(app)
setupHtmlRoutes(app)
const loadMarket = async () => {
  const exchange = await ExchangeManager.startExchange()
  try {
    await exchange.loadMarkets()
  } catch (error) {
    exchangeLogger.error(`Failed to load markets: ${error.message}`)
  }
}
loadMarket()

setupExchangeWebsocket(app)

const setupEcosystemWebsocketIfAvailable = async () => {
  const filePath = path.join(
    __dirname,
    'extensions',
    'ecosystem',
    'websocket',
    `index${fileExtension}`,
  ) // Adjust the path as needed

  if (fs.existsSync(filePath)) {
    try {
      // Using a variable to make TypeScript treat this as a dynamic import
      const moduleName = `./extensions/ecosystem/websocket${
        process.env.NODE_ENV === 'production' ? '/index.js' : ''
      }`
      const ecosystemModule = await import(moduleName)
      if (
        ecosystemModule &&
        typeof ecosystemModule.setupEcosystemWebsocket === 'function'
      ) {
        ecosystemModule.setupEcosystemWebsocket(app)
      }
    } catch (error) {
      console.log('Ecosystem websocket setup failed:', error)
    }
  } else {
    console.log('Ecosystem websocket module does not exist.')
  }
}

setupEcosystemWebsocketIfAvailable()
setupChat(app)

// Handle OPTIONS for all routes
app.options('/*', (res, req) => {
  res.cork(() => {
    setCORSHeaders(res)
    res.writeStatus('204 No Content')
    res.end()
  })
})

setupRoutes()
  .then(() => {
    app.listen(4000, (token) => {
      if (token) {
        logger.info('Server started on port 4000')
        initializeCrons()
      } else {
        logger.error('Failed to start server')
      }
    })
  })
  .catch((error) => {
    logger.error(`Failed to setup routes: ${error}`)
  })

process.on('SIGINT', () => {
  cleanup()
  process.exit()
})
