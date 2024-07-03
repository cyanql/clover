import { nativeImage } from 'electron'
import { BasicManga, EMangaEntryStatus, IMangaEntry } from './basic-manga'
import fs from 'node:fs/promises'
import { WriteStream } from 'node:fs'
import path from 'node:path'
import { removeDuplicateSubString } from '../../utils/_'
import { helper } from '../../common/helper'

const crawler = helper.requrie(helper.root('config/crawler.js'))

interface IRemoteMangaOptions {
    name: string
    pathname?: string
    tags?: string[]
    cover?: string
    author?: string
    readedIndex?: number
}

interface IRemoteMangaEntry extends IMangaEntry {
    url: string
}

interface ICrawlerResponseItem {
    name: string
    cover: string
    tags: string[]
    content: string[]
}

interface ICrawlerResult {
    list: ICrawlerResponseItem[]
    total: number
}

export class RemoteManga extends BasicManga {
    entries: IRemoteMangaEntry[] = []
    ws?: WriteStream
    constructor(opts: IRemoteMangaOptions) {
        super()
        this.name = opts.name
        this.pathname = opts.pathname || this.pathname
        this.author = opts.author || this.author
        this.cover = opts.cover || this.cover
        this.tags = opts.tags || this.tags
        this.readedIndex = opts.readedIndex || this.readedIndex
    }
    private static mapCrawlerResultToManga(ret: ICrawlerResult, opts: { dirname?: string }) {
        const mangas: RemoteManga[] = []
        ret.list.forEach(v => {
            const name = removeDuplicateSubString(v.name.replaceAll(/[\\/:*?"<>|]/g, ''))
            const manga =  new RemoteManga({
                name,
                pathname: opts.dirname ? path.resolve(opts.dirname, name) : '',
                cover: v.cover,
                tags: v.tags
            })
            v.content.forEach(v => {
                manga.addEntryUrl(v)
            })
            mangas.push(manga)
        })
        return {
            mangas,
            total: ret.total
        }
    }
    static async list(opts: { pageNum: number, dirname?: string }) {
        const ret: ICrawlerResult = await crawler.ranking(opts)
        return this.mapCrawlerResultToManga(ret, opts)
    }
    static async search(key: string, opts: { dirname?: string }) {
        const ret: ICrawlerResult = await crawler.search(key)
        return this.mapCrawlerResultToManga(ret, opts).mangas
    }
    addEntryUrl(url: string) {
        this.entries.push({
            status: EMangaEntryStatus.UNLOAD,
            name: path.basename(url),
            url,
        })
    }
    async open() {
        // nothing need to do
        if (this.pathname) {
            const accessable = await fs.access(this.pathname, fs.constants.W_OK).then(() => true).catch(() => false)
            if (!accessable) {
                await fs.mkdir(this.pathname)
            }
        }
    }
    async loadEntry(idx: number): Promise<void | ImageData> {
        const entry = this.entries[idx]
        if (entry && entry.status === EMangaEntryStatus.UNLOAD) {
            entry.status = EMangaEntryStatus.LOADING
            const buf = await fetch(entry.url).then(res => res.arrayBuffer()).then(buf => Buffer.from(buf))
            if (this.pathname) {
                fs.writeFile(path.resolve(this.pathname, entry.name), buf)
            }
            const img = nativeImage.createFromBuffer(buf).resize({
                width: 600,
                quality: 'good',
            })
            entry.status = EMangaEntryStatus.LOADED
            return BasicManga.toImageData(img, 600)
        }
    }
    close(): void {
        // nothing need to do
    }
}