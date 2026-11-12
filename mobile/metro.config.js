// The app shares its scoring logic with the website: files under ../src/lib and ../src/data listed in
// src/lib/shared.ts. Metro only reads files inside the folders it watches, so the web source folder is added here.
const { getDefaultConfig } = require('expo/metro-config')
const path = require('node:path')

const config = getDefaultConfig(__dirname)
config.watchFolders = [path.resolve(__dirname, '..', 'src')]
module.exports = config
