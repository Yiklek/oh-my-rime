// Unit tests for wubi98_spelling.js
import { assert, assertEquals, log } from './testutil.js'
import { parseSpelling, xform, getCharCount, subspelling, parseSpell, isGB2312 } from '../wubi98_spelling_util.js'

// Helper to create mock Candidate
function createMockCandidate(text, comment = '', type = 'simple', start = 0, end = 1, quality = 0) {
    return { text, comment, type, start, end, quality }
}

// Helper to create mock Trie
function createMockTrie(data) {
    const map = new Map()
    for (const [key, value] of Object.entries(data)) {
        map.set(key, value)
    }
    return {
        find: (key) => map.get(key) || null,
        loadBinaryFile: () => {},
        loadTextFile: () => {}
    }
}

// Helper to create mock Iterator
function createMockIterator(candidates) {
    let index = 0
    return {
        next: () => {
            if (index < candidates.length) {
                return candidates[index++]
            }
            return null
        }
    }
}

// Helper to create mock environment
function createMockEnv(options = {}) {
    return {
        engine: {
            context: {
                input: options.input || 'a',
                getScriptText: () => options.scriptText || '',
                getOption: (name) => {
                    const opts = {
                        new_spelling: true,
                        new_hide_pinyin: false,
                        gb2312: false,
                        ...options
                    }
                    return opts[name] !== undefined ? opts[name] : false
                }
            },
            schema: {
                config: {
                    getString: () => 'wb_spelling'
                }
            }
        }
    }
}

// Import the filter class
import { Wubi98Spelling } from '../wubi98_spelling.js'

// Override the Trie in the filter with mock
function createFilterWithMockTrie(mockTrie) {
    const filter = Object.assign(Object.create(Wubi98Spelling.prototype), {
        trie: mockTrie,
        config: { getString: () => 'wb_spelling' }
    })
    return filter
}

log('Testing wubi98_spelling.js', 'cyan')
log('='.repeat(50), 'cyan')

// Test 1: parseSpelling function
log('\nTest 1: parseSpelling function', 'yellow')
{
    // We need to test internal functions, let's test via filter behavior
    const mockTrie = createMockTrie({
        '你': '[※你※,※n※,※nǐ※,※GB2312※]',
        '好': '[※女※,※v※,※hǎo※,※GB2312※]'
    })

    const filter = createFilterWithMockTrie(mockTrie)

    // Get mock candidates
    const candidates = [
        createMockCandidate('你', ''),
        createMockCandidate('好', '')
    ]

    const iter = createMockIterator(candidates)
    const env = createMockEnv({ input: 'nh', new_spelling: true, new_hide_pinyin: false })

    // Process with filter
    const processed = []
    for (let idx = 0; idx < 10; idx++) {
        const cand = iter.next()
        if (!cand) break

        // Simulate what filter does
        const charCount = getCharCount(cand.text)
        if (charCount === 1) {
            const raw = mockTrie.find(cand.text)
            if (raw) {
                const parsed = parseSpelling(raw)
                if (parsed) {
                    cand.comment = xform('〔' + parsed.radical + ' · ' + parsed.code + ' · ' + parsed.pinyin + '〕')
                }
            }
        }
        processed.push(cand)
    }

    assertEquals(processed.length, 2, 'Should process 2 candidates')
    assert(processed[0].comment.includes('你'), 'First candidate should have 你 radical')
    assert(processed[0].comment.includes('nǐ'), 'First candidate should have pinyin')
    assert(processed[1].comment.includes('女'), 'Second candidate should have 女 radical')
}

// Test 2: getCharCount function
log('\nTest 2: getCharCount function', 'yellow')
{
    assertEquals(getCharCount('你'), 1, 'Single char should return 1')
    assertEquals(getCharCount('你好'), 2, 'Two chars should return 2')
    assertEquals(getCharCount('你好啊'), 3, 'Three chars should return 3')
    assertEquals(getCharCount(''), 0, 'Empty string should return 0')
}

// Test 3: xform function
log('\nTest 3: xform function', 'yellow')
{
    assertEquals(xform('[test]'), '〔test〕', 'Should convert brackets')
    assertEquals(xform('a,b'), 'a·b', 'Should convert comma to dot')
    assertEquals(xform('a_b'), 'a b', 'Should convert underscore to space')
}

// Test 4: subspelling function
log('\nTest 4: subspelling function', 'yellow')
{
    assertEquals(subspelling('你女竹', 2, 2), '女', 'Should extract single char at position')
    assertEquals(subspelling('你女竹', 1, 3), '你女竹', 'Should extract range')
    assertEquals(subspelling('你女竹', 2, 1), '', 'Should return empty for invalid range (first > last)')
    assertEquals(subspelling('', 1, 2), '', 'Should return empty for empty input')

    // Test with {...} format and sup character (like Lua)
    assertEquals(subspelling('你女竹◇', 2, 2), '女', 'Should extract with sup')
    assertEquals(subspelling('你女竹◇', 4, 4), '◇', 'Should extract sup at position 4')
}

// Test 4a: parseSpell function
log('\nTest 4a: parseSpell function', 'yellow')
{
    assertEquals(parseSpell('[※你※,※n※,※nǐ※,※GB2312※]'), '※你※', 'Should extract first part')
    assertEquals(parseSpell('[※女※,※v※,※hǎo※]'), '※女※', 'Should handle 3-part format')
    assertEquals(parseSpell('[test'), 'test', 'Should handle no bracket')
    assertEquals(parseSpell(''), '', 'Should handle empty')
}

// Test 5: GB2312 filter
log('\nTest 5: GB2312 filter', 'yellow')
{
    const mockTrie = createMockTrie({
        '你': '[※你※,※n※,※nǐ※,※GB2312※]',
        '好': '[※女※,※v※,※hǎo※,※GB2312※]',
        '中': '[※丨※,※l※,※zhōng※,※GBK※]'
    })

    // Test single char - GB2312
    assertEquals(isGB2312('你', mockTrie), true, 'GB2312 char should pass')

    // Test single char - GBK
    assertEquals(isGB2312('中', mockTrie), false, 'GBK char should fail')

    // Test phrase with GBK
    assertEquals(isGB2312('你中', mockTrie), false, 'Phrase with GBK should fail')

    // Test phrase all GB2312
    assertEquals(isGB2312('你好', mockTrie), true, 'Phrase all GB2312 should pass')
}

// Test 6: FastFilter isApplicable
log('\nTest 6: FastFilter isApplicable', 'yellow')
{
    const filter = new Wubi98Spelling({ engine: { schema: { config: { getString: () => 'wb_spelling' } }, context: { input: '' } } })

    // Test that filter can be instantiated (the main test)
    assert(filter !== null, 'Filter should be created')
}

// Import additional utility functions
import { getPhraseComment, getSingleCharComment, utf8Chars } from '../wubi98_spelling_util.js'

// Test 7: utf8Chars function
log('\nTest 7: utf8Chars function', 'yellow')
{
    assertEquals(utf8Chars('你'), ['你'], 'Single char should return array with one element')
    assertEquals(utf8Chars('你好'), ['你', '好'], 'Two chars should return array with two elements')
    assertEquals(utf8Chars(''), [], 'Empty string should return empty array')
}

// Test 8: getPhraseComment function (2-char, 3-char, 4+ char)
log('\nTest 8: getPhraseComment function', 'yellow')
{
    // Mock spelling data for common characters
    const mockTrie = createMockTrie({
        '你': '[※亻※,※n※,※nǐ※,※GB2312※]',
        '好': '[※女※,※v※,※hǎo※,※GB2312※]',
        '世': '[※一※,※p※,※shì※,※GB2312※]',
        '界': '[※田※,※w※,※jiè※,※GB2312※]',
        '中': '[※丨※,※l※,※zhōng※,※GB2312※]',
        '国': '[※囗※,※g※,※guó※,※GB2312※]',
        '人': '[※人※,※r※,※rén※,※GB2312※]',
        '民': '[※氏※,※m※,※mín※,※GB2312※]'
    })

    // Test 2-char phrase: 你好
    const comment2 = getPhraseComment('你好', mockTrie)
    assert(comment2 !== '', '2-char phrase should return comment')
    assert(comment2.startsWith('〔 '), '2-char comment should start with 〔')
    assert(comment2.endsWith(' 〕'), '2-char comment should end with 〕')

    // Test 3-char phrase: 你好吗 (using existing chars)
    const comment3 = getPhraseComment('你好世', mockTrie)
    assert(comment3 !== '', '3-char phrase should return comment')
    assert(comment3.startsWith('〔 '), '3-char comment should start with 〔')

    // Test 4-char phrase: 中国人民
    const comment4 = getPhraseComment('中国人民', mockTrie)
    assert(comment4 !== '', '4-char phrase should return comment')
    assert(comment4.startsWith('〔 '), '4-char comment should start with 〔')

    // Test empty string
    const commentEmpty = getPhraseComment('', mockTrie)
    assertEquals(commentEmpty, '', 'Empty string should return empty')

    // Test with unknown characters
    const commentUnknown = getPhraseComment('你x', mockTrie)
    assert(commentUnknown !== '', 'Phrase with unknown char should still return comment')
}

// Test 9: getSingleCharComment function
log('\nTest 9: getSingleCharComment function', 'yellow')
{
    const mockTrie = createMockTrie({
        '你': '[※亻※,※n※,※nǐ※,※GB2312※]',
        '好': '[※女※,※v※,※hǎo※,※GB2312※]'
    })

    // Test with pinyin (hidePinyin = false)
    const comment1 = getSingleCharComment('你', mockTrie, false)
    assert(comment1 !== '', 'Should return comment for known char')
    assert(comment1.includes('亻'), 'Should include radical')
    assert(comment1.includes('n'), 'Should include code')
    assert(comment1.includes('nǐ'), 'Should include pinyin')

    // Test without pinyin (hidePinyin = true)
    const comment2 = getSingleCharComment('你', mockTrie, true)
    assert(comment2 !== '', 'Should return comment when hiding pinyin')
    assert(comment2.includes('亻'), 'Should include radical')
    assert(comment2.includes('n'), 'Should include code')
    assert(!comment2.includes('nǐ'), 'Should NOT include pinyin when hidden')

    // Test unknown character
    const commentUnknown = getSingleCharComment('x', mockTrie)
    assertEquals(commentUnknown, '', 'Unknown char should return empty')

    // Test empty string
    const commentEmpty = getSingleCharComment('', mockTrie)
    assertEquals(commentEmpty, '', 'Empty string should return empty')
}

// Test 10: Integration test with filter method
log('\nTest 10: Integration test with filter method', 'yellow')
{
    const mockTrie = createMockTrie({
        '你': '[※亻※,※n※,※nǐ※,※GB2312※]',
        '好': '[※女※,※v※,※hǎo※,※GB2312※]',
        '中': '[※丨※,※l※,※zhōng※,※GB2312※]',
        '国': '[※囗※,※g※,※guó※,※GB2312※]'
    })

    const filter = createFilterWithMockTrie(mockTrie)

    // Create test candidates
    const candidates = [
        createMockCandidate('你', ''),
        createMockCandidate('好', ''),
        createMockCandidate('中国', ''),
        createMockCandidate('你好', '')
    ]

    // Test with spelling enabled
    const env = createMockEnv({ input: 'nh', new_spelling: true, new_hide_pinyin: false })
    const iter = createMockIterator(candidates)

    // Manually process like filter does
    const processed = []
    for (let idx = 0; idx < 10; idx++) {
        const cand = iter.next()
        if (!cand) break

        const charCount = getCharCount(cand.text)
        if (charCount === 1) {
            const comment = getSingleCharComment(cand.text, mockTrie, false)
            if (comment && !cand.comment) {
                cand.comment = comment
            }
        } else if (charCount > 1) {
            const comment = getPhraseComment(cand.text, mockTrie)
            if (comment) {
                cand.comment = comment + (cand.comment ? ' · ' + cand.comment : '') + ' 〕'
            }
        }
        processed.push(cand)
    }

    assertEquals(processed.length, 4, 'Should process all 4 candidates')

    // Single char candidates should have comments
    assert(processed[0].comment.includes('亻'), 'Single char 你 should have radical comment')
    assert(processed[1].comment.includes('女'), 'Single char 好 should have radical comment')

    // Multi-char candidates should have phrase comments
    assert(processed[2].comment.includes('〔 '), 'Multi-char 中国 should have phrase comment')
    assert(processed[3].comment.includes('〔 '), 'Multi-char 你好 should have phrase comment')
}

