// Wubi98 spelling filter - shows character breakdown/component info in candidate comments
// Uses FastFilter pattern with iter.next() for high performance

import { getCharCount, isGB2312, getPhraseComment, getSingleCharComment, convertSpellingYaml } from './wubi98_spelling_util.js'

/**
 * Wubi98Spelling Filter - FastFilter implementation
 * Shows character breakdown/component info in candidate comments
 * @implements {FastFilter}
 */
export class Wubi98Spelling {
    /**
     * Initialize the filter
     * @param {Environment} env - The Rime environment
     */
    constructor(env) {
        console.log('[wubi98_spelling] init')

        this.trie = null
        this.config = env.engine.schema.config

        // Paths
        let userDataDir = (env.userDataDir || '').replace(/\\/g, '/')
        const rimeBuildDir = userDataDir + '/build'
        const binaryPath = rimeBuildDir + '/wb_spelling.trie.bin'
        const yamlPath = userDataDir + '/wb_spelling.dict.yaml'

        // Try load binary first
        if (this.#loadBinary(binaryPath)) {
            return
        }

        // Convert from YAML
        this.#convertFromYaml(env, yamlPath, rimeBuildDir, binaryPath)

        if (!this.trie) {
            console.log('[wubi98_spelling] Warning: Could not load spelling dictionary')
        }
    }

    #loadBinary(binaryPath) {
        try {
            this.trie = new Trie()
            this.trie.loadBinaryFile(binaryPath)
            console.log('[wubi98_spelling] Loaded binary trie')
            return true
        } catch {
            console.log('[wubi98_spelling] Binary not found')
            return false
        }
    }

    #convertFromYaml(env, yamlPath, rimeBuildDir, binaryPath) {
        let yamlContent
        try {
            yamlContent = env.loadFile(yamlPath)
        } catch (e) {
            console.log('[wubi98_spelling] Load YAML failed: ' + e.message)
            return
        }

        if (!yamlContent) {
            return
        }

        const converted = convertSpellingYaml(yamlContent)
        if (!converted) {
            console.log('[wubi98_spelling] YAML conversion failed')
            return
        }

        // Create directory, save temp text and build binary
        const textPath = rimeBuildDir + '/wb_spelling.txt'
        try {
            env.createDir(rimeBuildDir, true)
            env.saveFile(textPath, converted)
            console.log('[wubi98_spelling] Saved converted text')

            this.trie = new Trie()
            this.trie.loadTextFile(textPath, 30000)
            console.log('[wubi98_spelling] Building binary trie')

            this.trie.saveToBinaryFile(binaryPath)
            console.log('[wubi98_spelling] Saved binary trie')

            env.removeFile(textPath)
        } catch (e) {
            console.log('[wubi98_spelling] Build failed: ' + e)
        }
    }

    /**
     * Clean up the filter
     */
    finalizer() {
        console.log('[wubi98_spelling] finit')
    }

    /**
     * Check if the filter is applicable
     * @param {Environment} env - The Rime environment
     * @returns {boolean} True if applicable
     */
    isApplicable(env) {
        // Only run when there's input (check for non-empty string)
        const input = env.engine.context.input
        return input && input.length > 0
    }

    // Helper to check if input has content
    #hasInput(input) {
        return input && typeof input === 'string' && input.length > 0
    }

    /**
     * Filter candidates using FastFilter pattern (generator)
     * @param {CandidateIterator} iter - The iterator of candidates
     * @param {Environment} env - The Rime environment
     * @returns {Generator<Candidate, CandidateIterator | void>}
     */
    *filter(iter, env) {
        // Get context and config
        const context = env.engine.context
        const config = env.engine.schema.config
        const input = context.input

        // If no input, just yield all candidates as-is
        if (!input || input.length === 0) {
            yield* iter
            return iter
        }

        if (!this.trie) {
            yield* iter
            return iter
        }

        // Get runtime options from context (supports toggle via keyboard shortcuts)
        const spellingEnabled = context.getOption('new_spelling')
        const hidePinyin = context.getOption('new_hide_pinyin')
        const gb2312Enabled = context.getOption('gb2312')

        // Check if in reverse lookup mode (starts with z or ~)
        const isReverseLookup = input.startsWith('z') || input.startsWith('~')

        // Process candidates with limit
        const processed = []
        const maxCount = 200

        for (let idx = 0; idx < maxCount; idx++) {
            const cand = iter.next()
            if (!cand) {
                break
            }

            // Handle GB2312 filter - skip non-GB2312 candidates
            if (gb2312Enabled) {
                if (!isGB2312(cand.text, this.trie)) {
                    // Skip this candidate (don't add to processed)
                    continue
                }
            }

            // Only add spelling comment when spelling is enabled and not in reverse lookup
            if (spellingEnabled && !isReverseLookup) {
                const charCount = getCharCount(cand.text)

                if (charCount === 1) {
                    // Single character: add radical/code/pinyin comment
                    const comment = getSingleCharComment(cand.text, this.trie, hidePinyin)
                    if (comment && !cand.comment) {
                        cand.comment = comment
                    }
                } else if (charCount > 1) {
                    // Multiple characters: add compound spelling comment
                    const comment = getPhraseComment(cand.text, this.trie)
                    if (comment) {
                        cand.comment = comment + (cand.comment ? ' · ' + cand.comment : '') + ' 〕'
                    }
                }
            }

            processed.push(cand)
        }

        // Yield all processed candidates
        yield* processed
        return iter
    }
}
