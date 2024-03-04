export const noop = () => {/* empty */}

export const removeProtocal = (url: string) => url.replace(/(https?:)?\/\//, '')