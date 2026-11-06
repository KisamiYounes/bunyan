import { NextResponse, type NextRequest } from 'next/server'
import { defaultLocale, isLocale, type Locale } from '@/i18n/config'
import { SESSION_COOKIE } from '@/shared/constants'
import { verifySessionToken } from '@/modules/identity/session-token'

const PROTECTED_PREFIXES = ['/dashboard', '/settings', '/admin']
const AUTH_PATHS = ['/login', '/register']

function detectLocale(request: NextRequest): Locale {
  const cookie = request.cookies.get('bunyan_locale')?.value
  if (cookie && isLocale(cookie)) return cookie

  const header = request.headers.get('accept-language') ?? ''
  for (const part of header.split(',')) {
    const tag = part.split(';')[0]?.trim().toLowerCase()
    if (tag && isLocale(tag)) return tag
    if (tag?.startsWith('ar')) return 'ar'
    if (tag?.startsWith('fr')) return 'fr'
    if (tag?.startsWith('en')) return 'en'
  }
  return defaultLocale
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname, search } = request.nextUrl
  const segments = pathname.split('/')
  const maybeLocale = segments[1]

  if (!maybeLocale || !isLocale(maybeLocale)) {
    const locale = detectLocale(request)
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}${pathname === '/' ? '' : pathname}`
    return NextResponse.redirect(url)
  }

  const locale = maybeLocale
  const rest = `/${segments.slice(2).join('/')}`.replace(/\/+$/, '') || '/'
  const token = request.cookies.get(SESSION_COOKIE)?.value
  const claims = await verifySessionToken(token)

  const requiresAuth = PROTECTED_PREFIXES.some(
    (prefix) => rest === prefix || rest.startsWith(`${prefix}/`),
  )

  if (requiresAuth && !claims) {
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}/login`
    url.search = ''
    url.searchParams.set('next', `${pathname}${search}`)
    return NextResponse.redirect(url)
  }

  if ((rest === '/admin' || rest.startsWith('/admin/')) && claims?.role !== 'admin') {
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}/dashboard`
    url.search = ''
    return NextResponse.redirect(url)
  }

  if (claims && AUTH_PATHS.includes(rest)) {
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}/dashboard`
    url.search = ''
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
