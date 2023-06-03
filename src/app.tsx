import { Card, Modal, Tabs, Typography } from 'antd'
import { memo, useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import { Manga } from './store/manga'
import { MangaThumbnail } from './components/manga-thumbnail'
import { MangaViewer } from './components/manga-viewer'

const DEFAULT_KEY = 'default'

const pathname = ''

export const App = memo(() => {
    const [shouldHomeUpdate, forceUpdateHome] = useReducer((state) => state + 1, 0)
    const [mangas, setMangas] = useState<Manga[]>([])
    const [activeMangas, setActiveMangas] = useState<Manga[]>([])
    const [activeKey, setActiveKey] = useState<string>(DEFAULT_KEY)
    useEffect(() => {
        window.postMessage({ payload: 'removeLoading' }, '*')

        if (pathname) {
            Manga.scan(pathname, (manga) => {
    
            }).then((list) => {
                setMangas(list)
            }).catch((err) => console.error(err))
        }
    }, [])

    const handleMangaClick = useCallback(async (manga: Manga) => {
        manga.open().then(() => {
            setActiveMangas((state) => state.some(v => v.pathname === manga.pathname) ? state : state.concat(manga))
            setActiveKey(manga.pathname)
        })
    }, [])

    const home = useMemo(() => (
        <div className="manga-card-container scrollbar">
            {mangas.map(v => <MangaThumbnail key={v.pathname} manga={v} onClick={handleMangaClick} renderKey={v.readedIndex} />)}
        </div>
    ), [mangas, shouldHomeUpdate])

    const items = useMemo(() => {
        return [{
            label: 'Home',
            children: home,
            key: DEFAULT_KEY,
            closable: false
        }].concat(activeMangas.map((v) => ({
            label: v.name.substring(0, 5) + '...',
            children: <MangaViewer manga={v} />,
            key: v.pathname,
            closable: true
        })))
    }, [home, activeMangas])

    const onTabChange = useCallback((key: string) => {
        setActiveKey(key)
    }, [])

    const onEditClick = useCallback((key: any, action: string) => {
        if (action === 'remove') {
            setActiveMangas((state) => {
                state.find(v => v.pathname === key && v.close())
                return state.filter(v => v.pathname !== key)
            })
            setActiveKey(DEFAULT_KEY)
            forceUpdateHome()
        }
    }, [])

    return (
        <div className="page">
            <div className="page-header">Clover</div>
            <Tabs
                className="page-tabs"
                activeKey={activeKey}
                onChange={onTabChange}
                type="editable-card"
                size="small"
                hideAdd
                items={items}
                onEdit={onEditClick}
            />
        </div>
    )
})