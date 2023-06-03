import Store from 'electron-store'

interface IStorage {
    coverMap?: Record<string, any>
}

export const storage = new Store<IStorage>()
