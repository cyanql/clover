import { join, basename, extname } from 'node:path'
import { readdir, readFile } from 'node:fs/promises'
import { promisify } from 'node:util'
import StreamZip from 'node-stream-zip'
import { NativeImage, nativeImage } from 'electron'
import { storage } from './storage'
import { Stats, statSync } from 'node:fs'
import _ from 'lodash'

const IS_IMAGE_REGEX = /(jpg|jpeg|png|apng|gif|webp|avif|tif|bmp|tga)/

const mangaPropMap: Record<string, Omit<IMangaOptions, 'pathname'>> = storage.get('mangaPropMap') || {}

export enum EMangaEntryStatus {
    UNLOAD = 0,
    LOADING = 1,
    LOADED = 2,
}

export interface IMangaEntry {
    status: EMangaEntryStatus
    name: string
}

interface IMangaOptions {
    pathname: string
    cover?: string
    readedIndex?: number
    aspectRatio?: number
}

export enum EMangaType {
    UNKNOWN = 'UNKNOWN',
    ZIP = 'ZIP',
    DIRECTORY = 'DIRECTORY',
}

// 文件解析正则，格式如：(tag)*[author]*name*(tag)|[tag]*
const FILENAME_REGEX = /^(?:\((.*?)\))?\s*(?:\[(.*?)\])?\s*(.*?)\s*(?:(?:\((.*?)\)|\[(.*?)\])?\s?)*?$/
export class Manga {
    // 路径
    pathname = ''
    // 标签
    tags: string[] = []
    // 作者
    author = ''
    // 名称
    name = ''
    // 路径状态
    stats: Stats
    // 封面图
    cover: string
    // 漫画内容类型
    type = EMangaType.UNKNOWN
    // 封面比例
    aspectRatio: number
    // 当前章节索引，从0开始
    readedIndex: number
    // 内容，即图片
    entries: IMangaEntry[] = []
    // 内容是否被打开，主要用于zip类型
    opened = false

    constructor(opts: IMangaOptions) {
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

    static async scan(root: string, callback?: (m: Manga) => void): Promise<Manga[]> {
        const mangas: Manga[] = []
        const walk = async (folder: string): Promise<void> => {
            const filenames = (await readdir(folder))//.slice(0, 10)
            for (let pathname, i = 0; i < filenames.length; i++) {
                pathname = join(folder, filenames[i])
                const manga = new Manga({
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

    static toJPGBase64(image: NativeImage) {
        return 'data:image/jpg;base64,' + image.toJPEG(100).toString('base64')
    }

    static toJPGURL(image: NativeImage) {
        return URL.createObjectURL(new Blob([image.toJPEG(100)]))
    }

    static toImageData(image: NativeImage, width: number) {
        return new ImageData(new Uint8ClampedArray(image.toBitmap().buffer), width)
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
        const imgEntries = entries.filter(v => Manga.isImage(v.name))

        this.entries = imgEntries.map(v => ({
            status: EMangaEntryStatus.UNLOAD,
            name: v.name,
        }))
        if (imgEntries.length) {
            if (!this.cover) {
                const buf = (await zip.entryData(imgEntries[0]))
                const img = nativeImage.createFromBuffer(buf)
                const jpg = Manga.toJPGBase64(img.resize({
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
        const imgNames = filenames.filter(v => Manga.isImage(v))
        this.entries = imgNames.map(v => ({
            status: EMangaEntryStatus.UNLOAD,
            name: v,
        }))
        if (imgNames.length) {
            if (!this.cover) {
                const coverPath = join(this.pathname, imgNames[0])
                const img = nativeImage.createFromPath(coverPath)
                const jpg = Manga.toJPGBase64(img.resize({
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
                return Manga.toImageData(img, 600)
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
                return Manga.toImageData(img, 600)
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
    read(count: number) {
        this.readedIndex = count
    }
}
