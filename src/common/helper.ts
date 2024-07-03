import path from 'path'

export const helper = {
    root(...args: string[]) {
        return path.resolve(process.env.APP_PATH || '', ...args)
    },
    requrie(pathname: string) {
        try {
            return require(pathname)
        } catch(err) {
            console.info('require failed', err)
        }
    }
}