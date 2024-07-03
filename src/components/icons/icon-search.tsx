import { HTMLAttributes, memo, useCallback } from 'react'
import './index.less'

interface IProps extends HTMLAttributes<HTMLSpanElement> {
}

export const IconSearch = memo((props: IProps) => {
  return (
    <span {...props}>
      <svg
        className="icon"
        viewBox="0 0 1024 1024"
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
        p-id="4241"
      >
        <path
          d="M941.568 891.904l-156.672-156.672c58.88-70.144 94.72-160.768 94.72-259.072 0-222.72-181.248-403.456-403.456-403.456-222.72 0-403.456 181.248-403.456 403.456 0 222.72 181.248 403.456 403.456 403.456 98.816 0 188.928-35.84 259.072-94.72l156.672 156.672c6.656 6.656 15.872 10.24 25.088 10.24 9.216 0 17.92-3.584 25.088-10.24 13.312-13.824 13.312-36.352-0.512-49.664zM142.848 476.16c0-183.808 149.504-333.312 333.312-333.312s332.8 149.504 332.8 333.312c0 183.808-149.504 333.312-333.312 333.312s-332.8-150.016-332.8-333.312z"
          fill="#ffffff"
          p-id="4242"
        ></path>
      </svg>
    </span>
  )
})
