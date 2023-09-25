import { VERSION } from './version.js'

import DDAtHome from 'ddatnodejs'

const INTERVAL = 630
const wsLimit = 0

let logLimit = 1024

const info = (...message) => console.info('DD@Browser:', ...message)
const log = (...message) => {
  if (logLimit <= 0) {
    return
  }
  console.log('DD@Browser:', ...message)
  logLimit--
  if (logLimit === 0) {
    info('log 太多, 不再显示')
  }
}
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
const set = (key, value) => GM.setValue(key, value)
const get = (key, d) => GM.getValue(key, d)

const channel = new BroadcastChannel('DDSync')

const f = url => {
  const options = {}
  if (url.includes('bilibili.com')) { // PeroPero no credentials
    options.credentials = 'include'
  }
  return fetch(url, options)
}

const getMID = async () => {
  const { data: { isLogin, mid } } = await f('https://api.bilibili.com/x/web-interface/nav').then(r => r.json())
  if (isLogin) {
    return mid
  }
  return 0
}

let on = false
const midP = getMID()

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

const getBUVID = () => {
  const buvid3 = document.cookie.split('; ').find(c => c.startsWith('buvid3='))
  if (buvid3) {
    return buvid3.split('=')[1]
  }
}

const open = async () => {
  log('open')
  const home = new DDAtHome(await makeURL(), { INTERVAL, wsLimit, WebSocket, customFetch: f, getBUVID, uid: await midP, liveInterval: INTERVAL * 2 })
  home.on('log', log)
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

