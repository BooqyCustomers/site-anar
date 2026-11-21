import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { SiteProvider, configureSiteKit } from '@bookingsystemadvancedorg/site-kit'
import archivoUrl from './assets/fonts/archivo.woff2?url'
import martianUrl from './assets/fonts/martian-mono.woff2?url'
import App from './App'
import { Canonical } from './shared/Canonical'
import { installDefault2dView } from './anar/kitBridge/floorView'
import '@fontsource/outfit/300.css'
import '@fontsource/outfit/400.css'
import '@fontsource/outfit/500.css'
import '@fontsource/outfit/600.css'
import '@fontsource/cormorant-garamond/500.css'
import '@fontsource/cormorant-garamond/600.css'
import '@fontsource/cormorant-garamond/500-italic.css'
import '@bookingsystemadvancedorg/site-kit/styles.css'
import './anar/styles/index.css'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined

// Planritningen börjar i 2D, 3D är ett val (kitet startar i 3D, src/anar/kitBridge/README.md).
installDefault2dView()

configureSiteKit({
  apiBaseUrl,
  devTenantSlug: import.meta.env.VITE_DEV_TENANT_SLUG as string | undefined,
  menuImageBaseUrl: import.meta.env.VITE_MENU_IMAGE_BASE_URL as string | undefined,
  paymentFonts: { sans: archivoUrl, mono: martianUrl },
})

// Exempeldata medan restaurangen inte har lagt in sitt i Booqy: bara i
// dev-bygget (vite.config.ts). I prod är villkoret en konstant och modulen
// kommer inte med i bygget (src/devPlaceholders/bundle.test.ts).
const ready: Promise<unknown> =
  import.meta.env.VITE_BOOQY_PLACEHOLDERS === 'true'
    ? import('./devPlaceholders').then((m) => m.startPlaceholders(apiBaseUrl))
    : Promise.resolve()

void ready
  .catch(() => undefined)
  .then(() =>
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <BrowserRouter>
          <Canonical origin={import.meta.env.VITE_CANONICAL_ORIGIN as string | undefined} />
          <SiteProvider>
            <App />
          </SiteProvider>
        </BrowserRouter>
      </StrictMode>,
    ),
  )
