export const noop = () => {/* empty */}

export const removeProtocal = (url: string) => url.replace(/(https?:)?\/\//, '')

export const removeDuplicateSubString = (str: string) => {
    const substrs = Array.from(new Set(str.split(/\s+/)))
    const strs: string[] = []
    for (let i = 0, len = substrs.length, str: string; i < len; i++) {
        str = substrs[i]
        for (let j = 0; j < len; j++) {
            if (i !== j) {
                str = str.replaceAll(substrs[j], '')
            }
        }
        strs.push(str)
    }
    return strs.join(' ')
}
