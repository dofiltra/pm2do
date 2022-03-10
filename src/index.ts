import dotenv from 'dotenv'
import path from 'path'
import pm2 from 'pm2'
import fs from 'fs'
import fetch from 'node-fetch'
import { fileURLToPath } from 'url'
import { sleep } from 'time-helpers'
import { DateTime } from 'luxon'

type TAppSettings = {}
type TPm2App = {
  appName: string
  url?: string
  file?: {
    path: string
    maxIdleSeconds?: number
  }
}

class App {
  static version = 5
  static env = process.env
  static rootPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

  constructor({}: TAppSettings) {
    dotenv.config({ path: path.join(App.rootPath, `.env`) })
  }

  async start(): Promise<void> {
    const canLog = new Date().getMinutes() % 10 === 0
    canLog && console.log(`Start 'pm2do' v${App.version} | ${new Date().toJSON()}`)

    await sleep(30e3)

    pm2.connect((err) => {
      if (err) {
        console.error(err)
        return
      }

      pm2.list(async (err, list) => {
        if (err) {
          return console.log(err)
        }

        const apps: TPm2App[] = [
          {
            appName: 'xfwd',
            url: 'https://api.dofiltra.com',
          },
          {
            appName: 'aiback',
            file: {
              path: '/root/.pm2/logs/aiback-out.log',
              maxIdleSeconds: 5 * 60,
            },
          },
        ].filter((app) => list.some((l) => l.name === app.appName))

        canLog &&
          console.log(
            'Check apps: ',
            apps.map((x) => x.appName)
          )

        await Promise.all(
          apps.map(async (app) => {
            if (!(await this.isLiveApp(app))) {
              await this.restartApp(app.appName)
            }
          })
        )
      })
    })

    return this.start()
  }

  private async restartApp(appName: string) {
    console.log(`Restarting app '${appName}'...`)

    await new Promise((resolve) => {
      pm2.connect(async (err) => {
        if (err) {
          // process.exit(2)
          return resolve(console.error(err))
        }

        pm2.flush(appName, (e) => e && console.log(e))
        await sleep(5e3)

        pm2.list(async (err, list) => {
          err && console.log(err)

          pm2.restart(appName, (err, proc) => {
            resolve(pm2.disconnect())
          })
        })
      })
    })

    await sleep(60e3)
  }

  private async isLiveApp(app: TPm2App) {
    try {
      const { url, file } = app

      if (url) {
        const resp = await fetch(url)
        return resp.ok && resp.status === 200
      }

      if (file?.path) {
        const stat = fs.statSync(file.path)

        if (stat?.mtime && file?.maxIdleSeconds) {
          const { seconds: idleSeconds } = DateTime.fromJSDate(new Date()).diff(
            DateTime.fromJSDate(stat.mtime),
            'seconds'
          )

          // console.log(stat.mtime, idleSeconds, idleSeconds > file.maxIdleSeconds)

          if (idleSeconds > file.maxIdleSeconds) {
            return false
          }
        }
      }
    } catch (e: any) {
      console.log(e)
      return false
    }

    return true
  }
}

new App({}).start()
