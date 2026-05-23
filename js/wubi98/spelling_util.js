// Wubi98 spelling utility functions
// Shared between wubi98_spelling.js and tests

/**
 * Convert wb_spelling.dict.yaml content to Trie-readable text format
 * @param {string} yamlContent - The YAML content to convert
 * @returns {string} Trie-compatible text format
 */
export function convertSpellingYaml(yamlContent) {
    if (!yamlContent) {
        return ''
    }

    const lines = yamlContent.split('\n')
    const entries = []

    for (const line of lines) {
        // Skip comments, empty lines, and YAML headers
        if (!line || line.startsWith('#') || line.startsWith('---') || line.startsWith('...')) {
            continue
        }

        // Parse: character\t[※radical※,※code※,※pinyin※,※charset※]
        const tabIndex = line.indexOf('\t')
        if (tabIndex > 0) {
            const char = line.substring(0, tabIndex).trim()
            const value = line.substring(tabIndex + 1).trim()

            if (char && value) {
                entries.push(`${char}\t${value}`)
            }
        }
    }

    return entries.join('\n')
}

// Parse spelling string like "[※󰃹※󰃹※󰃊※󰄅※,※qqjs※,※huà_huǒ※,※GBK※]"
export function parseSpelling(str) {
    if (!str || str === '') {
        return null
    }

    // Remove outer brackets
    let s = str.replace(/^\[|\]$/g, '')

    // Split by comma
    const parts = s.split(',')

    if (parts.length >= 1) {
        // First part is the radical breakdown (contains ※)
        const radical = parts[0].replace(/※/g, '').trim()
        const code = parts.length > 1 ? parts[1].replace(/※/g, '').trim() : ''
        const pinyin = parts.length > 2 ? parts[2].replace(/※/g, '').trim() : ''
        const charset = parts.length > 3 ? parts[3].replace(/※/g, '').trim() : ''

        return { radical, code, pinyin, charset }
    }

    return null
}

// Transform formatting characters
export function xform(input) {
    if (!input || input === '') {
        return ''
    }
    return input
        .replace(/\[/g, '〔')
        .replace(/\]/g, '〕')
        .replace(/\*/g, ' ')
        .replace(/_/g, ' ')
        .replace(/,/g, '·')
}

// Get character count (QuickJS: string.length already returns character count)
export function getCharCount(str) {
    return str.length
}

// Get individual characters as array (like Lua utf8chars)
// In QuickJS, str[i] returns the character at position i
export function utf8Chars(str) {
    const chars = []
    for (let i = 0; i < str.length; i++) {
        chars.push(str[i])
    }
    return chars
}

// Extract radical from position (1-based, like Lua subspelling)
// Handles {...} format and UTF-8 characters like Lua
export function subspelling(radical, first, last) {
    if (!radical) {
        return ''
    }
    // Return empty if first > last (invalid range)
    if (first > last) {
        return ''
    }

    // Process like Lua: add space around { and }
    let s = radical.replace(/{/g, ' { ').replace(/}/g, ' } ')

    // Split by whitespace to get segments
    const segments = s.split(/\s+/).filter(s => s.length > 0)

    const radicals = []
    for (const seg of segments) {
        if (seg.startsWith('{') && seg.endsWith('}')) {
            // {...} format - treat as one unit
            radicals.push(seg)
        } else {
            // Regular UTF-8 characters
            for (const char of seg) {
                radicals.push(char)
            }
        }
    }

    const start = Math.max(0, first - 1)
    const end = Math.min(radicals.length, last)
    if (start >= end) {
        return ''
    }
    return radicals.slice(start, end).join('')
}

// Parse spelling to get just the first part (radical breakdown)
export function parseSpell(str) {
    if (!str) return ''
    // Remove everything after first comma
    let s = str.replace(/,.*$/, '')
    // Remove leading [
    return s.replace(/^\[/, '')
}

// Check if character is GB2312 (like Lua isgb2312)
export function isGB2312(text, spellingMap) {
    const charCount = getCharCount(text)

    if (charCount === 1) {
        const raw = spellingMap.find(text)
        if (raw) {
            const parsed = parseSpelling(raw)
            if (parsed && parsed.charset === 'GB2312') {
                return true
            }
            if (parsed && parsed.charset === 'GBK') {
                return false
            }
        }
        return true // Not found, assume ok
    } else {
        // Multi-char: check each
        const chars = utf8Chars(text)
        for (let i = 0; i < chars.length; i++) {
            const raw = spellingMap.find(chars[i])
            if (raw) {
                const parsed = parseSpelling(raw)
                if (parsed && parsed.charset === 'GBK') {
                    return false
                }
            }
        }
        return true
    }
}

// Get phrase comment (like Lua spell_phrase)
export function getPhraseComment(text, spellingMap) {
    const chars = utf8Chars(text)
    const charCount = chars.length

    if (charCount === 0) {
        return ''
    }

    // Get spelling for each character
    const spellings = []
    for (let i = 0; i < charCount; i++) {
        const raw = spellingMap.find(chars[i])
        if (raw) {
            const parsed = parseSpell(raw)
            if (parsed) {
                spellings.push(parsed)
            }
        }
    }

    if (spellings.length === 0) {
        return ''
    }

    // Build compound spelling based on character count (like Lua spell_phrase)
    let spelling = ''
    const sup = '◇'

    if (charCount === 2) {
        // Two chars: each spelling concatenated with sup first
        // 2nd radical of char1 + 4th radical of char1 + 2nd radical of char2 + 4th radical of char2
        spelling = subspelling(spellings[0] + sup, 2, 2) +
                   subspelling(spellings[0] + sup, 4, 4) +
                   subspelling(spellings[1] + sup, 2, 2) +
                   subspelling(spellings[1] + sup, 4, 4)
    } else if (charCount === 3) {
        // Three chars: only 3rd spelling concatenated with sup
        spelling = subspelling(spellings[0], 2, 2) +
                   subspelling(spellings[1], 2, 2) +
                   subspelling(spellings[2] + sup, 2, 2) +
                   subspelling(spellings[2] + sup, 4, 4)
    } else {
        // Four or more chars: first radical of each
        for (let i = 0; i < Math.min(4, spellings.length); i++) {
            spelling += subspelling(spellings[i], 2, 2)
        }
    }

    if (spelling === '') {
        return ''
    }

    // Replace {} with <> (like Lua)
    spelling = spelling.replace(/{(.*?)}/g, '<$1>')

    return '〔 ' + spelling + ' 〕'
}

// Get single character comment (like Lua get_tricomment for single char)
export function getSingleCharComment(text, spellingMap, hidePinyin) {
    const raw = spellingMap.find(text)
    if (!raw) {
        return ''
    }

    const parsed = parseSpelling(raw)
    if (!parsed) {
        return ''
    }

    if (hidePinyin) {
        // Only show radical and code
        return xform('〔' + parsed.radical + ' · ' + parsed.code + '〕')
    } else {
        // Show all: radical · code · pinyin
        return xform('〔' + parsed.radical + ' · ' + parsed.code + ' · ' + parsed.pinyin + '〕')
    }
}
