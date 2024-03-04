import { Card, Modal, Tabs, Typography } from 'antd'
import { memo, useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import { LocalManga } from './store/manga/local-manga'
import { MangaThumbnail } from './components/manga-thumbnail'
import { MangaViewer } from './components/manga-viewer'
import { BasicManga } from './store/manga/basic-manga'
import nodeurl from 'node:url'
import { app, dialog, ipcRenderer } from 'electron'
import { useMemoizedFn } from './utils/hooks'

const DEFAULT_KEY = 'default'

const ROOT_PATH_KEY = 'root_path'

export const App = memo(() => {
    const [shouldHomeUpdate, forceUpdateHome] = useReducer((state) => state + 1, 0)
    const [mangas, setMangas] = useState<BasicManga[]>([])
    const [activeMangas, setActiveMangas] = useState<BasicManga[]>([])
    const [activeKey, setActiveKey] = useState<string>(DEFAULT_KEY)
    const [pathname, setPathname] = useState(localStorage.getItem(ROOT_PATH_KEY))

    useEffect(() => {
        window.postMessage({ payload: 'removeLoading' }, '*')

        if (pathname) {
            LocalManga.scan(pathname, (manga) => {
    
            }).then((list) => {
                setMangas(list)
            }).catch((err) => console.error(err))
        } else {
        }
    }, [pathname])

    const handleMangaClick = useMemoizedFn(async (manga: BasicManga) => {
        manga.open().then(() => {
            setActiveMangas((state) => state.some(v => v.pathname === manga.pathname) ? state : state.concat(manga))
            setActiveKey(manga.pathname)
        })
    })

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

    const onTabChange = useMemoizedFn((key: string) => {
        setActiveKey(key)
    })

    const onEditClick = useMemoizedFn((key: any, action: string) => {
        if (action === 'remove') {
            setActiveMangas((state) => {
                state.find(v => v.pathname === key && v.close())
                return state.filter(v => v.pathname !== key)
            })
            setActiveKey(DEFAULT_KEY)
            forceUpdateHome()
        }
    })

    const handleRootPathClick = useMemoizedFn(() => {
        ipcRenderer.invoke('showOpenDialog', {
            title: 'Choose root path',
            defaultPath: pathname,
            properties: ['openDirectory']
        }).then((value: Electron.OpenDialogReturnValue) => {
            const newPathname = value.filePaths[0]
            if (newPathname) {
                localStorage.setItem(ROOT_PATH_KEY, newPathname)
                setPathname(newPathname)
            }
        })
    })

    return (
        <div className="page">
            <div className="page-header">Clover</div>
            <div className="page-root-path-btn" onClick={handleRootPathClick}>{pathname || 'Root'}</div>
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