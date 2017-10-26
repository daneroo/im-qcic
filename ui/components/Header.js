import Link from 'next/link'
import Head from 'next/head'

const menuItems = [
  { path: '/', name: 'Home' },
  { path: '/about', name: 'About' },
  { path: '/dialog', name: 'Dialog' },
  { path: '/table', name: 'Table' },
  { path: '/error', name: 'Error (404)' },
]
function title(pathname) {
  for (let m of menuItems) {
    if (m.path === pathname) {
      return m.name
    }
  }
  return ''
}
export default ({ pathname }) => (
  <header>
    <Head>
      <title>{title(pathname)}</title>
    </Head>

    {menuItems.map(m => <Link key={m.path} prefetch href={m.path}>
      <a className={(pathname === m.path)?'is-active':''}>{m.name}</a>
    </Link>)}
    {/* Local styles for the Header component : moved to global in withRoot*/}
  </header>
)
