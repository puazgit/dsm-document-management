const fs = require('fs')
const path = require('path')

// Read seed file
const seedPath = path.join(__dirname, 'seed.ts')
let seedContent = fs.readFileSync(seedPath, 'utf8')

// Remove permissions objects using regex
// Match permissions: { ... } blocks with nested braces
seedContent = seedContent.replace(/,\s*permissions:\s*{[^{}]*{[^{}]*}[^{}]*{[^{}]*}[^{}]*{[^{}]*}[^{}]*}/g, '')

// Clean up any remaining permissions references
seedContent = seedContent.replace(/,\s*permissions:\s*{[^}]*}/g, '')
seedContent = seedContent.replace(/permissions:\s*{[^}]*},?\s*/g, '')

// Write cleaned content back
fs.writeFileSync(seedPath, seedContent)

console.log('✅ Cleaned permissions from seed.ts')