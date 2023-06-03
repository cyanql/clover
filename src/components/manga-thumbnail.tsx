import React, { memo, useCallback } from 'react'
import { Card, Tag, Typography } from 'antd'
import { Manga } from '../store/manga'
import './manga-thumbnail.less'
import { Ellipsis } from './ellipsis'

const style: React.CSSProperties = { padding: '6px', display: 'flex', flexDirection: 'column' }

const ellipsis = { rows: 3, suffix: '' }

interface IProps {
    renderKey?: any
    manga: Manga
    onClick: (manga: Manga) => void
}

export const MangaThumbnail = memo((props: IProps) => {
    const { manga, onClick } = props
    const handleClick = useCallback(() => {
        onClick?.(manga)
    }, [onClick, manga])
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
            <div className="manga-card-tags">{manga.tags.map((v, i) => <Tag key={i} color="orange">{v}</Tag>)}</div>
        </Card>
    )
})