import {html} from 'htm/react/index.mjs'
import {render} from 'react-dom'
import App from './app.js'

render(html`<${App} />`, document.querySelector('#app-container'))
