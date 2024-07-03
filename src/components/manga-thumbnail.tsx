import React, { MouseEvent, memo } from 'react'
import { Card, Tag } from 'antd'
import './manga-thumbnail.less'
import { Ellipsis } from './ellipsis'
import { BasicManga } from '../store/manga/basic-manga'
import { useMemoizedFn } from '../utils/hooks'

const style: React.CSSProperties = { padding: '6px', display: 'flex', flexDirection: 'column' }

const ellipsis = { rows: 3, suffix: '' }

interface IProps {
    renderKey?: any
    manga: BasicManga
    onClick: (manga: BasicManga, e: MouseEvent) => void
    onTagClick?: (text: string) => void
}

export const MangaThumbnail = memo((props: IProps) => {
    const { manga, onClick, onTagClick } = props
    const handleClick = useMemoizedFn((e: MouseEvent) => {
        onClick?.(manga, e)
    })

    return (
        <Card
            className="manga-card"
            size="small"
            bodyStyle={style}
            hoverable
            cover={(
                <div className="manga-card-top" onClick={handleClick}>
                    <img className="manga-card-cover" src={manga.cover} />
                    <div className="manga-card-type">{manga.type}</div>
                    <div className="manga-card-progress">{manga.readedIndex + 1}/{manga.entries.length}P</div>
                </div>
            )}
            >
            <Ellipsis className="manga-card-title" copy>{manga.name}</Ellipsis>
            <Ellipsis className="manga-card-author" copy>{manga.author}</Ellipsis>
            <div className="manga-card-tags">{manga.tags.map((v, i) => <Tag key={i} color="orange" onClick={() => onTagClick?.(v)}>{v}</Tag>)}</div>
        </Card>
    )
})