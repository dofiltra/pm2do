import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import pm2 from 'pm2'
import { sleep } from 'time-helpers'

type TAppSettings = {}

class App {
  static version = 1
  static env = process.env
  static rootPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

  constructor({}: TAppSettings) {
    dotenv.config({ path: path.join(App.rootPath, `.env`) })
  }

  async start() {
    console.log('start...')
    await sleep(30e3)

    pm2.connect(function (err) {
      if (err) {
        console.error(err)
        process.exit(2)
      }

      pm2.list((err, list) => {
        console.log(err, list)

        pm2.restart('pm2do', (err, proc) => {
          pm2.disconnect()
        })
      })
    })
  }
}

new App({}).start()
