// Prints the landing page's scroll height, used to align the scroll tiles in the film.
import { chromium } from 'playwright'
const b = await chromium.launch({ executablePath: process.env.CHROME })
const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage()
await p.goto('http://localhost:5199/')
await p.waitForTimeout(2500)
console.log(await p.evaluate(() => [document.documentElement.scrollHeight, window.innerHeight]))
await b.close()
