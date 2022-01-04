import dotenv from 'dotenv'
import path from 'path'
import pm2 from 'pm2'
import fetch from 'node-fetch'
import { fileURLToPath } from 'url'
import { sleep } from 'time-helpers'

type TAppSettings = {}
type TPm2App = { appName: string; url: string }

class App {
  static version = 1
  static env = process.env
  static rootPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

  constructor({}: TAppSettings) {
    dotenv.config({ path: path.join(App.rootPath, `.env`) })
  }

  async start(): Promise<void> {
    console.log(`Start 'pm2do' v${App.version} | ${new Date().toJSON()}`)
    const apps: TPm2App[] = [
      { appName: 'xfwd', url: 'https://api.dofiltra.com' },
      // { appName: 'xfwd', url: 'https://api.dofiltra.com' },
    ]

    await Promise.all(
      apps.map(async (app) => {
        if (!(await this.isLiveApp(app))) {
          this.restartApp(app.appName)
        }
      })
    )
    await sleep(10e3)

    return this.start()
  }

  private async restartApp(appName: string) {
    pm2.connect(function (err) {
      if (err) {
        console.error(err)
        // process.exit(2)
        return
      }

      pm2.list(async (err, list) => {
        err && console.log(err)

        pm2.restart(appName, (err, proc) => {
          pm2.disconnect()
        })
      })
    })
  }

  private async isLiveApp(app: TPm2App) {
    try {
      const resp = await fetch(app.url)
      return resp.ok && resp.status === 200
    } catch (e: any) {
      console.log(e)
      return false
    }
  }
}

new App({}).start()
