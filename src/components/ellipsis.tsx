import { memo, useCallback } from 'react'
import classnames from 'classnames'
import './ellipsis.less'
import { clipboard } from 'electron'
import { message } from 'antd'

interface IProps {
    className: string
    children: string
    copy?: boolean
}

export const Ellipsis = memo((props: IProps) => {
    const { className, children,copy } = props

    const handleClick = useCallback(() => {
        if (copy) {
            clipboard.writeText(children)
            message.success('Copy Success!', 1)
        }
    }, [copy, children])
    
    return <div className={classnames('ellipsis', className)} onClick={handleClick}>{children}</div>
})