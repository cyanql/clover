import { join, basename, extname } from 'node:path'
import { readdir, readFile } from 'node:fs/promises'
import StreamZip from 'node-stream-zip'
import { nativeImage } from 'electron'
import { storage } from '../storage'
import { Stats, statSync } from 'node:fs'
import _ from 'lodash'
import { BasicManga, EMangaEntryStatus, EMangaType } from './basic-manga'

const IS_IMAGE_REGEX = /(jpg|jpeg|png|apng|gif|webp|avif|tif|bmp|tga)/

const mangaPropMap: Record<string, Omit<IMangaOptions, 'pathname'>> = storage.get('mangaPropMap') || {}

interface IMangaOptions {
    pathname: string
    cover?: string
    readedIndex?: number
    aspectRatio?: number
}

// 文件解析正则，格式如：(tag)*[author]*name*(tag)|[tag]*
const FILENAME_REGEX = /^(?:\((.*?)\))?\s*(?:\[(.*?)\])?\s*(.*?)\s*(?:(?:\((.*?)\)|\[(.*?)\])?\s?)*?$/
export class LocalManga extends BasicManga {
    // 路径状态
    stats: Stats

    constructor(opts: IMangaOptions) {
        super()
        this.name = basename(opts.pathname).replace(extname(opts.pathname), '')
        this.pathname = opts.pathname
        this.stats = statSync(opts.pathname)
        this.cover = opts.cover || ''
        this.readedIndex = opts.readedIndex || 0
        this.aspectRatio = opts.aspectRatio || 1
        const [fullname, tag1, author, shortname, ...tags] = FILENAME_REGEX.exec(this.name) || []
        if (shortname) {
            this.name = shortname || fullname!
            this.author = author
            this.tags = [tag1].concat(tags).filter((v => !!v))
        }
    }

    static isImage(pathname: string) {
        return IS_IMAGE_REGEX.test(pathname)
    }

    static async scan(root: string, callback?: (m: LocalManga) => void): Promise<LocalManga[]> {
        const mangas: LocalManga[] = []
        const walk = async (folder: string): Promise<void> => {
            const filenames = (await readdir(folder))//.slice(0, 10)
            for (let pathname, i = 0; i < filenames.length; i++) {
                pathname = join(folder, filenames[i])
                const manga = new LocalManga({
                    pathname,
                    ...mangaPropMap[pathname]
                })
                if (await manga.setup()) {
                    mangas.push(manga)
                    callback?.(manga)
                } else if (manga.stats.isDirectory()) {
                    await walk(pathname)
                }
                if (manga.cover) {
                    mangaPropMap[manga.pathname] = {
                        cover: manga.cover,
                        readedIndex: manga.readedIndex,
                        aspectRatio: manga.aspectRatio,
                    }
                }
            }
        }
        await walk(root)
        storage.set('mangaPropMap', mangaPropMap)
        return mangas
    }

    // 读取封面图，顺便校验是否为合法数据
    async setup() {
        if (this.stats.isDirectory()) {
            return this.setupDirectory()
        } else if (this.stats.isFile() && extname(this.pathname) === '.zip') {
            return this.setupZip()
        } else {
            return false
        }
    }

    async setupZip() {
        const zip = new StreamZip.async({
            file: this.pathname
        })
        const entries = Object.values(await zip.entries())
        const imgEntries = entries.filter(v => LocalManga.isImage(v.name))

        this.entries = imgEntries.map(v => ({
            status: EMangaEntryStatus.UNLOAD,
            name: v.name,
        }))
        if (imgEntries.length) {
            if (!this.cover) {
                const buf = (await zip.entryData(imgEntries[0]))
                const img = nativeImage.createFromBuffer(buf)
                const jpg = LocalManga.toJPGBase64(img.resize({
                    height: 170,
                    quality: 'good',
                }))
                const size = img.getSize()
                this.aspectRatio = size.width / size.height
                this.cover = jpg
            }
            this.type = EMangaType.ZIP
            await zip.close()
            return true
        } else {
            await zip.close()
            return false
        }
    }

    async setupDirectory() {
        const filenames = await readdir(this.pathname)
        const imgNames = filenames.filter(v => LocalManga.isImage(v))
        this.entries = imgNames.map(v => ({
            status: EMangaEntryStatus.UNLOAD,
            name: v,
        }))
        if (imgNames.length) {
            if (!this.cover) {
                const coverPath = join(this.pathname, imgNames[0])
                const img = nativeImage.createFromPath(coverPath)
                const jpg = LocalManga.toJPGBase64(img.resize({
                    height: 170,
                    quality: 'good',
                }))
                const size = img.getSize()
                this.aspectRatio = size.width / size.height
                this.cover = jpg
            }
            this.type = EMangaType.DIRECTORY
            return true
        }
        return false
    }

    async open() {
        if (this.opened) {
            return
        } else {
            this.opened = true
            if (this.stats.isDirectory()) {
                return this.openDirectoryEntries()
            } else if (this.stats.isFile() && extname(this.pathname) === '.zip') {
                return this.openZipEntries()
            } else {
                this.opened = false
            }
        }
    }

    private async openZipEntries() {
        const zip = new StreamZip.async({
            file: this.pathname
        })
        this.loadEntry = async (idx: number) => {
            const entry = this.entries[idx]
            if (entry && entry.status === EMangaEntryStatus.UNLOAD) {
                entry.status = EMangaEntryStatus.LOADING
                const buf = await zip.entryData(entry.name)
                const img = nativeImage.createFromBuffer(buf).resize({
                    width: 600,
                    quality: 'good',
                })
                entry.status = EMangaEntryStatus.LOADED
                return LocalManga.toImageData(img, 600)
            }
        }
        const originalClose = this.close
        this.close = () => {
            zip.close()
            this.close = originalClose
            this.close()
        }
    }
    private async openDirectoryEntries() {
        this.loadEntry = async (idx: number) => {
            const entry = this.entries[idx]
            if (entry && entry.status === EMangaEntryStatus.UNLOAD) {
                entry.status = EMangaEntryStatus.LOADING
                const buf = await readFile(join(this.pathname, entry.name))
                const img = nativeImage.createFromBuffer(buf).resize({
                    width: 600,
                    quality: 'good',
                })
                entry.status = EMangaEntryStatus.LOADED
                return LocalManga.toImageData(img, 600)
            }
        }
    }
    async loadEntry(_idx: number): Promise<ImageData | void> {}
    close = () => {
        if (mangaPropMap[this.pathname]) {
            Object.assign(mangaPropMap[this.pathname], {
                readedIndex: this.readedIndex,
            })
            storage.set('mangaPropMap', mangaPropMap)
        }
        this.entries.forEach(entry => {
            entry.status = EMangaEntryStatus.UNLOAD
        })
        this.opened = false
    }
}