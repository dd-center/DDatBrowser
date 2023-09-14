import { build } from 'esbuild'
import { VERSION } from './version.js'

const js = `// ==UserScript==
// @name         DD@Browser
// @namespace    https://vtbs.moe/
// @version      ${VERSION}
// @updateURL https://greasyfork.org/scripts/403819-dd-browser/code/DD@Browser.user.js
// @description  Browser plugin of DD@Home project, by vtbs.moe. 安装后浏览bilibili遇到问题请关闭并报告（抱歉啦）
// @license   MIT
// @supportURL https://github.com/dd-center/DDatBrowser/issues
// @author       simon3000
// @include      *://www.bilibili.com*
// @include      *://live.bilibili.com*
// @include      *://t.bilibili.com*
// @grant GM.setValue
// @grant GM.getValue
// ==/UserScript==`

await build({
  entryPoints: ['index.js'],
  bundle: true,
  outfile: 'ddatbrowser.user.js',
  logLevel: 'info',
  format: 'esm',
  charset: 'utf8',
  banner: { js }
})
