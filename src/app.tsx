import { Card, Modal, Tabs, Typography } from 'antd'
import { MouseEvent, memo, useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { LocalManga } from './store/manga/local-manga'
import { MangaThumbnail } from './components/manga-thumbnail'
import { MangaViewer } from './components/manga-viewer'
import { BasicManga } from './store/manga/basic-manga'
import { KeyboardEvent, app, dialog, ipcRenderer } from 'electron'
import { useMemoizedFn } from './utils/hooks'
import { IconSearch } from './components/icons/icon-search'
import { RemoteManga } from './store/manga/remote-manga'
import ReactPaginate from 'react-paginate'
import { IconLastUpdate } from './components/icons/icon-lastupdate'
import { IconClear } from './components/icons/icon-clear'
const DEFAULT_KEY = 'default'

const ROOT_DIR_KEY = 'root_path'

export const App = memo(() => {
    const [shouldHomeUpdate, forceUpdateHome] = useReducer((state) => state + 1, 0)
    const [remoteMangas, setRemoteMangas] = useState<BasicManga[]>([])
    const [localMangas, setLocalMangas] = useState<BasicManga[]>([])
    const [activeMangas, setActiveMangas] = useState<BasicManga[]>([])
    const [activeKey, setActiveKey] = useState<string>(DEFAULT_KEY)
    const [rootDir, setRootDir] = useState(localStorage.getItem(ROOT_DIR_KEY))
    const [pageTotal, setPageTotal] = useState(0)
    const searchInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        window.postMessage({ payload: 'removeLoading' }, '*')

        if (rootDir) {
            LocalManga.scan(rootDir, (manga) => {
    
            }).then((list) => {
                setLocalMangas(list)
            }).catch((err) => console.error(err))
        } else {
            setLocalMangas([])
        }
    }, [rootDir])

    const handleMangaClick = useMemoizedFn(async (manga: BasicManga, e: MouseEvent) => {
        manga.open().then(() => {
            setActiveMangas((state) => state.some(v => v.pathname === manga.pathname) ? state : state.concat(manga))
            if (!e.ctrlKey) {
                setActiveKey(manga.pathname)
            }
        })
    })

    const handleTagClick = useMemoizedFn((text: string) => {
        if (searchInputRef.current) {
            searchInputRef.current.value = text
        }
    })

    const mangas = remoteMangas.length ? remoteMangas : localMangas

    const home = useMemo(() => (
        <div className="manga-card-container scrollbar">
            {mangas.map(v => <MangaThumbnail key={v.pathname} manga={v} onClick={handleMangaClick} onTagClick={handleTagClick} renderKey={v.readedIndex} />)}
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
            defaultPath: rootDir,
            properties: ['openDirectory']
        }).then((value: Electron.OpenDialogReturnValue) => {
            const newPathname = value.filePaths[0]
            if (newPathname) {
                localStorage.setItem(ROOT_DIR_KEY, newPathname)
                setRootDir(newPathname)
            }
        })
    })

    const handleSearchClick = useMemoizedFn(async () => {
        const inputEl = searchInputRef.current
        if (inputEl && rootDir) {
            if (inputEl.value) {
                const mangas = await RemoteManga.search(inputEl.value, { dirname: rootDir })
                setRemoteMangas(mangas)
            } else {
                setRemoteMangas([])
            }
        }
    })

    const handleClearClick = useMemoizedFn(() => {
        const inputEl = searchInputRef.current
        if (inputEl) {
            inputEl.value = ''
            setRemoteMangas([])
        }
    })

    const handlePageClick = useMemoizedFn(async (item: { selected: number }) => {
        debugger
        if (rootDir) {
            const { total, mangas } = await RemoteManga.list({
                pageNum: item.selected + 1,
                dirname: rootDir,
            })
            setPageTotal(total)
            setRemoteMangas(mangas)
        }
    })

    const handleLastUpdateClick = useMemoizedFn(() => {
        handlePageClick({ selected: 1 })
    })

    return (
        <div className="page">
            <div className="page-header">Clover</div>
            <div className="page-toolbar">
                <span className="page-root-path-btn" onClick={handleRootPathClick}>{rootDir || 'Root'}</span>
                <span>
                    <input className="page-search-input" ref={searchInputRef} />
                    <IconClear className="page-toolbar-btn page-clear-btn" onClick={handleClearClick} />
                    <IconSearch className="page-toolbar-btn page-search-btn" onClick={handleSearchClick} />
                    <IconLastUpdate className="page-toolbar-btn page-lastupdate-btn" onClick={handleLastUpdateClick} />
                </span>
            </div>
            {!!pageTotal && (
                <ReactPaginate
                    className="page-paginate"
                    breakLabel="..."
                    nextLabel=">"
                    onPageChange={handlePageClick}
                    pageRangeDisplayed={5}
                    pageCount={pageTotal}
                    previousLabel="<"
                    renderOnZeroPageCount={null}
                />
            )}
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