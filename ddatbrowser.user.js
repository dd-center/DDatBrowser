// ==UserScript==
// @name         DD@Browser
// @namespace    https://vtbs.moe/
// @version      0.7
// @description  Browser plugin of DD@Home project, by vtbs.moe. 安装后浏览bilibili遇到问题请关闭并报告（抱歉啦）
// @license   MIT
// @supportURL https://github.com/dd-center/DDatBrowser/issues
// @author       simon3000
// @include      *://www.bilibili.com*
// @include      *://live.bilibili.com*
// @grant GM_setValue
// @grant GM_getValue
// ==/UserScript==

const VERSION = 0.7

const INTERVAL = 5000
const pullInterval = 1280

const log = (...message) => console.log('DD@Browser:', ...message)
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
const set = (key, value) => GM_setValue(key, value)
const get = (key, d) => GM_getValue(key, d)

const id = Date.now()

let on = false

const runtime = () => {
  const uas = navigator.userAgent.split(' ')
  const ua = uas.filter(a => a.includes('/')).map(a => a.split('/')).reduce((o, [k, v]) => {
    o[k] = v
    return o
  }, {})
  if (ua.Chromium) {
    return `Chromium/${ua.Chromium}`
  }
  if (ua.Chrome) {
    return `Chrome/${ua.Chrome}`
  }
  if (ua.Safari) {
    return `Safari/${ua.Version}`
  }
  return uas[uas.length - 1]
}

const makeURL = () => {
  const url = new URL('wss://cluster.vtbs.moe')
  url.searchParams.set('runtime', runtime())
  url.searchParams.set('version', VERSION)
  url.searchParams.set('platform', navigator.platform)

  const uuid = get('uuid', String(Math.random()))
  set('uuid', uuid)

  log('uuid', uuid)

  url.searchParams.set('uuid', uuid)

  return url
}

const parse = string => {
  if (string === 'wait') {
    return { empty: true }
  }
  return JSON.parse(string)
}

const start = () => new Promise(resolve => {
  log('Start')
  const ws = new WebSocket(makeURL())

  ws.onclose = e => {
    log('Close', e.code)
    resolve()
  }

  ws.onmessage = async ({ data: message }) => {
    const { key, data } = parse(message)
    if (data) {
      const { type, url } = data
      if (type === 'http') {
        log('job received', url)
        const time = Date.now()
        const result = await fetch(url, { credentials: 'include' })
        const text = await result.text()
        ws.send(JSON.stringify({
          key,
          data: text
        }))
        log(`job complete ${((Date.now() - time) / 1000).toFixed(2)}s`)
      }
    }
  }

  ws.onopen = async () => {
    log('WebSocket Open')
    while (ws.readyState === 1) {
      ws.send('DDDhttp')
      await wait(pullInterval)
    }
  }
})

const open = async () => {
  log('open')
  while (true) {
    await start()
    await wait(1000)
  }
}

setInterval(() => {
  const currentClock = get('now', 0)
  const diff = Date.now() - currentClock
  if (diff > INTERVAL * 3) {
    set('me', id)
    if (!on) {
      open()
      on = true
    }
  }
  if (get('me', 0) === id) {
    set('now', Date.now())
  }
}, INTERVAL)

log('hi')
