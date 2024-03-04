import React, { useMemo, useReducer, useRef } from 'react'
import { memo, useCallback, useEffect, useState } from 'react'
import { IMangaEntry, BasicManga } from '../store/manga/basic-manga'
import _ from 'lodash'
import './manga-view.less'
import { EACH_MANGA_PAGE_HEIGHT, MAX_MANGA_PAGE_WIDTH } from '../common/constant'

function easing(x: number) {
    return Math.sin((x * Math.PI) / 2) // easeOutSine
}

interface IProps {
    manga: BasicManga
}

export const MangaViewer = memo((props: IProps) => {
    const scrollerRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const timersRef = useRef<NodeJS.Immediate[]>([])
    const scrollTimerRef = useRef(-1)
    const { manga } = props

    const totalHeight = useMemo(() => EACH_MANGA_PAGE_HEIGHT * manga.entries.length, [manga.entries.length])

    const canvasStyle = useMemo(() => ({
        width: MAX_MANGA_PAGE_WIDTH + 'px',
        height: totalHeight + 'px',
    }), [totalHeight])

    useEffect(() => {
        scrollerRef.current?.scrollTo(0, EACH_MANGA_PAGE_HEIGHT * manga.readedIndex + 30)
    }, [manga]) 

    const scroll = useCallback((el: HTMLElement, distance: number, duration: number) => {
        const startY = el.scrollTop
        let startTime = 0
        let delta = 0
        const walk = (timestamp: number) => {
            if (startTime === 0) {
                startTime = timestamp
            }
            delta = timestamp - startTime
            if (delta < duration) {
                el.scrollTop = startY + distance * easing(delta / duration)
                requestAnimationFrame(walk)
            }
        }
        cancelAnimationFrame(scrollTimerRef.current)
        scrollTimerRef.current = requestAnimationFrame(walk)
    }, [])

    useEffect(() => {
        const scrollerEl = scrollerRef.current
        const handleSpaceClick = (e: KeyboardEvent) => {
            if (e.code === 'Space' && scrollerEl) {
                scroll(scrollerEl, scrollerEl.offsetHeight * 0.8, 150)
            }
        }
        document.addEventListener('keydown', handleSpaceClick, false)
        return () => {
            cancelAnimationFrame(scrollTimerRef.current)
            document.removeEventListener('keydown', handleSpaceClick, false)
            timersRef.current.forEach(timer => {
                clearImmediate(timer)
            })
        }
    }, [])

    const handleScroll = useCallback(_.debounce(async (e: React.UIEvent) => {
        const canvas = canvasRef.current
        const ctx = canvas?.getContext('2d')
        if (!ctx) {
            return
        }
        const { scrollTop, offsetHeight } = (e.currentTarget || e.target) as HTMLElement
        const offset = scrollTop - 30 // padding-top
        // 预加载，前1页，只要在屏幕中显示了一部分都需要加载，故取floor
        const startIdx = Math.floor(offset / EACH_MANGA_PAGE_HEIGHT) - 1
        // 预加载，后1页
        const endIdx = Math.ceil((scrollTop + offsetHeight) / EACH_MANGA_PAGE_HEIGHT) + 1  // 画面之外再加载5个
        // 屏幕中占比更大的部分作为已读的章数，故取round
        manga.read(Math.round(offset / EACH_MANGA_PAGE_HEIGHT))

        for (let i = startIdx; i < endIdx; i++) {
            manga.loadEntry(i).then((imgData) => {
                if (imgData) {
                    // 避免putImageData阻塞渲染
                    const timer = setImmediate(() => {
                        timersRef.current = timersRef.current.filter(v => v !== timer)
                        ctx.putImageData(imgData, (MAX_MANGA_PAGE_WIDTH - imgData.width) / 2, imgData.height * i)
                    })
                    timersRef.current.push(timer)
                }
            })
        }
    }, 50), [])

    return (
        <div ref={scrollerRef} className="manga-viewer scrollbar" onScroll={handleScroll}>
            <canvas ref={canvasRef} width={MAX_MANGA_PAGE_WIDTH} height={totalHeight} style={canvasStyle} />
        </div>
    )
})