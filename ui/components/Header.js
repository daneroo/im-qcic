import Link from 'next/link'
import Head from 'next/head'

const menuItems = [
  { path: '/', name: 'Home' },
  { path: '/about', name: 'About' },
  { path: '/aboutM', name: 'About (M)' },
  { path: '/dialog', name: 'Dialog' },
  { path: '/table', name: 'Table' },
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
      <a className={pathname === m.path && 'is-active'}>{m.name}</a>
    </Link>)}

    <style jsx>{`
      header {
        margin-bottom: 25px;
      }
      a {
        color: #999999
        font-size: 14px;
        margin-right: 15px;
        text-decoration: none;
      }
      a:hover {
        color: #000000
      }
      .is-active {
        color: #000000
        // text-decoration: underline;
      }
    `}</style>
  </header>
)
