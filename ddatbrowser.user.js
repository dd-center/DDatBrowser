// ==UserScript==
// @name         DD@Browser
// @namespace    https://vtbs.moe/
// @version      1.0
// @updateURL https://greasyfork.org/scripts/403819-dd-browser/code/DD@Browser.user.js
// @description  Browser plugin of DD@Home project, by vtbs.moe. 安装后浏览bilibili遇到问题请关闭并报告（抱歉啦）
// @license   MIT
// @supportURL https://github.com/dd-center/DDatBrowser/issues
// @author       simon3000
// @include      *://www.bilibili.com*
// @include      *://live.bilibili.com*
// @grant GM.setValue
// @grant GM.getValue
// ==/UserScript==

const VERSION = '1.0'

const pullInterval = 460

const log = (...message) => console.log('DD@Browser:', ...message)
const info = (...message) => console.info('DD@Browser:', ...message)
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
const set = (key, value) => GM.setValue(key, value)
const get = (key, d) => GM.getValue(key, d)

const channel = new BroadcastChannel('DDSync')

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

const makeURL = async () => {
  const url = new URL('wss://cluster.vtbs.moe')
  url.searchParams.set('runtime', runtime())
  url.searchParams.set('version', VERSION)
  url.searchParams.set('platform', navigator.platform)

  const uuid = localStorage.DDUUID || await get('uuid', String(Math.random()))
  await set('uuid', uuid)

  log('uuid', uuid)

  url.searchParams.set('uuid', uuid)

  const name = localStorage.DDName
  if (name) {
    url.searchParams.set('name', name)
  }

  return url
}

const parse = string => {
  if (string === 'wait') {
    return { empty: true }
  }
  return JSON.parse(string)
}

const start = () => new Promise(async resolve => {
  log('Start')
  const ws = new WebSocket(await makeURL())

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
        const options = {}
        if (url.includes('bilibili.com')) { // PeroPero no credentials
          options.credentials = 'include'
        }
        const result = await fetch(url, options)
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

let timeout

channel.onmessage = async ({ data }) => {
  if (data === 'wait') {
    log('wait')
    clearTimeout(timeout)
  }
  if (data === 'start' && on) {
    channel.postMessage('wait')
  }
}

const hi = async () => {
  log('hi')
  await wait(1000 * Math.random())
  while (!on) {
    timeout = setTimeout(() => {
      on = true
      channel.postMessage('wait')
      open()
    }, 1000 * 3)
    channel.postMessage('start')
    await wait(1000 * 10)
  }
}

hi()
info(`你可以通过 localStorage.DDUUID = 'uuid' 来设置 UUID, 以便记录你的数据`)
info(`你可以通过 localStorage.DDName = '你的名字' 来设置展示的名字`)

