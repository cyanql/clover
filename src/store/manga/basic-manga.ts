import { NativeImage } from 'electron'
import _ from 'lodash'

const IS_IMAGE_REGEX = /(jpg|jpeg|png|apng|gif|webp|avif|tif|bmp|tga)/

export enum EMangaEntryStatus {
    UNLOAD = 0,
    LOADING = 1,
    LOADED = 2,
}

export interface IMangaEntry {
    status: EMangaEntryStatus
    name: string
}

export enum EMangaType {
    UNKNOWN = 'UNKNOWN',
    ZIP = 'ZIP',
    DIRECTORY = 'DIRECTORY',
}

export abstract class BasicManga {
    // 路径
    pathname = ''
    // 标签
    tags: string[] = []
    // 作者
    author = ''
    // 名称
    name = ''
    // 封面图
    cover: string = ''
    // 漫画内容类型
    type = EMangaType.UNKNOWN
    // 封面比例
    aspectRatio: number = 1
    // 当前章节索引，从0开始
    readedIndex: number = 0
    // 内容，即图片
    entries: IMangaEntry[] = []
    // 内容是否被打开，主要用于zip类型
    opened = false

    static isImage(pathname: string) {
        return IS_IMAGE_REGEX.test(pathname)
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

    abstract open(): Promise<void>
    abstract loadEntry(_idx: number): Promise<ImageData | void>
    abstract close(): void
    read(count: number) {
        this.readedIndex = count
    }
}