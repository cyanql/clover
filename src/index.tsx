import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './app'
import { ConfigProvider, theme, Button, Card } from "antd";
import 'antd/dist/reset.css'
import './index.less'

const { darkAlgorithm } = theme

const root = document.getElementById('root')!

ReactDOM.createRoot(root).render(
    <ConfigProvider theme={{
        algorithm: darkAlgorithm
    }}>
        <App />
    </ConfigProvider>
)
