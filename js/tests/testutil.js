export let totalTests = 0
export let passedTests = 0

export function assert(condition, message) {
  totalTests++
  if (condition) {
    passedTests++
    log('✓ ' + message, 'green')
  } else {
    log('✗ ' + message, 'red')
    log('  Expected true, but got false', 'red')
    throw new Error('Assertion failed: ' + message)
  }
}

export function assertEquals(actual, expected, message) {
  totalTests++
  const actualStr = JSON.stringify(actual)
  const expectedStr = JSON.stringify(expected)
  if (actualStr === expectedStr) {
    passedTests++
    log('✓ ' + message, 'green')
  } else {
    log('✗ ' + message, 'red')
    log('  Expected: ' + expectedStr, 'cyan')
    log('  Actual:   ' + actualStr, 'magenta')
    throw new Error(`Assertion failed: ${message}\n  Expected: ${expectedStr}\n  Actual:   ${actualStr}`)
  }
}

export function log(message, color) {
  const colorCode = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    gray: '\x1b[90m',
    black: '\x1b[30m',
    brightRed: '\x1b[91m',
    brightGreen: '\x1b[92m',
    brightYellow: '\x1b[93m',
    brightBlue: '\x1b[94m',
    brightMagenta: '\x1b[95m',
    brightCyan: '\x1b[96m',
    brightWhite: '\x1b[97m',
  }
  // add background colors if needed
  const textColor = colorCode[color]
  if (textColor) {
    console.log(`${textColor}${message}${colorCode.reset}`)
  } else {
    console.log(message)
  }
}
