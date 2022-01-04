import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import pm2 from 'pm2'

type TAppSettings = {}

class App {
  static version = 1
  static env = process.env
  static rootPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

  constructor({}: TAppSettings) {
    dotenv.config({ path: path.join(App.rootPath, `.env`) })
  }

  async start() {
    pm2.connect(function (err) {
      if (err) {
        console.error(err)
        process.exit(2)
      }

      pm2.list((err, list) => {
        console.log(err, list)

        pm2.restart('pm2do', (err, proc) => {
          // Disconnects from PM2
          pm2.disconnect()
        })
      })
    })
  }
}

new App({}).start()
